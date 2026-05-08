package com.epms.service.impl;

import com.epms.entity.FeedbackForm;
import com.epms.entity.FeedbackQuestion;
import com.epms.entity.FeedbackSection;
import com.epms.entity.enums.FeedbackFormStatus;
import com.epms.exception.BusinessValidationException;
import com.epms.exception.ResourceNotFoundException;
import com.epms.repository.FeedbackFormRepository;
import com.epms.repository.RatingScaleRepository;
import com.epms.service.FeedbackOperationalService;
import com.epms.service.FeedbackFormService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Slf4j
@Service
@RequiredArgsConstructor
public class FeedbackFormServiceImpl implements FeedbackFormService {

    private final RatingScaleRepository ratingScaleRepository;
    private final FeedbackFormRepository feedbackFormRepository;
    private final FeedbackOperationalService feedbackOperationalService;

    @Override
    @Transactional
    public FeedbackForm createForm(FeedbackForm form) {
        log.info("Creating new Feedback Form: {}", form.getFormName());
        validateForm(form);

        form.getSections().forEach(s -> {
            s.setForm(form);
            s.getQuestions().forEach(q -> q.setSection(s));
        });

        FeedbackForm savedForm = feedbackFormRepository.save(form);
        if (savedForm.getRootFormId() == null) {
            savedForm.setRootFormId(savedForm.getId());
            savedForm = feedbackFormRepository.save(savedForm);
        }
        feedbackOperationalService.audit(
                form.getCreatedByUserId(),
                FeedbackOperationalService.FORM_CREATED,
                FeedbackOperationalService.ENTITY_FORM,
                savedForm.getId(),
                null,
                "name=" + savedForm.getFormName() + ",version=" + savedForm.getVersionNumber(),
                "Feedback form created"
        );
        log.info("Successfully created Feedback Form with ID: {}", savedForm.getId());
        return savedForm;
    }

    @Override
    @Transactional
    public FeedbackForm updateFormStructure(Long formId, FeedbackForm updatedForm) {
        FeedbackForm existing = findFormWithSectionsAndQuestions(formId);
        if (existing.getStatus() != FeedbackFormStatus.DRAFT) {
            throw new BusinessValidationException("Only DRAFT forms can be edited.");
        }

        // Validate the incoming structure before mutating the managed entity.
        // This keeps the current draft untouched if the request is invalid.
        validateForm(updatedForm);

        existing.setFormName(updatedForm.getFormName());
        existing.setAnonymousAllowed(updatedForm.getAnonymousAllowed());

        // The table has a unique key on (form_id, order_no). When replacing the whole
        // section tree, Hibernate may try to INSERT new section rows before DELETEing
        // the orphaned rows, causing Duplicate entry '<formId>-<orderNo>'. Force the
        // orphan deletions to be flushed first, then insert the replacement structure.
        existing.getSections().clear();
        feedbackFormRepository.flush();

        updatedForm.getSections().forEach(section -> {
            section.setId(null);
            section.setForm(existing);
            section.getQuestions().forEach(question -> {
                question.setId(null);
                question.setSection(section);
            });
            existing.getSections().add(section);
        });
        FeedbackForm saved = feedbackFormRepository.save(existing);
        feedbackOperationalService.audit(
                updatedForm.getCreatedByUserId(),
                FeedbackOperationalService.FORM_UPDATED,
                FeedbackOperationalService.ENTITY_FORM,
                saved.getId(),
                null,
                "criteria updated",
                "Feedback criteria rows updated"
        );
        return saved;
    }

    @Override
    @Transactional
    public FeedbackForm createNewVersion(Long formId, FeedbackForm newForm) {
        FeedbackForm baseForm = findFormWithSectionsAndQuestions(formId);
        Long rootId = baseForm.getRootFormId() != null ? baseForm.getRootFormId() : baseForm.getId();
        int latestVersion = feedbackFormRepository.findTopByRootFormIdOrderByVersionNumberDesc(rootId)
                .map(FeedbackForm::getVersionNumber)
                .orElse(baseForm.getVersionNumber() != null ? baseForm.getVersionNumber() : 1);

        // Do not archive the currently active form when a draft version is created.
        // Historical submissions and active campaign setup must keep using the active version
        // until HR explicitly activates the new draft version.
        newForm.setRootFormId(rootId);
        newForm.setVersionNumber(latestVersion + 1);
        validateForm(newForm);
        newForm.getSections().forEach(s -> {
            s.setForm(newForm);
            s.getQuestions().forEach(q -> q.setSection(s));
        });
        FeedbackForm savedVersion = feedbackFormRepository.save(newForm);
        feedbackOperationalService.audit(
                newForm.getCreatedByUserId(),
                FeedbackOperationalService.FORM_UPDATED,
                FeedbackOperationalService.ENTITY_FORM,
                savedVersion.getId(),
                "baseFormId=" + baseForm.getId() + ",version=" + baseForm.getVersionNumber(),
                "newVersion=" + savedVersion.getVersionNumber(),
                "New feedback form version created"
        );
        return savedVersion;
    }

    @Override
    @Transactional(readOnly = true)
    public FeedbackForm getFormById(Long formId) {
        return findFormWithSectionsAndQuestions(formId);
    }

    @Override
    @Transactional(readOnly = true)
    public List<FeedbackForm> getAllForms() {
        return feedbackFormRepository.findAll(
                org.springframework.data.domain.Sort.by(org.springframework.data.domain.Sort.Direction.DESC, "id")
        );
    }

    @Override
    @Transactional(readOnly = true)
    public List<FeedbackForm> getAllActiveForms() {
        return feedbackFormRepository.findByStatus(com.epms.entity.enums.FeedbackFormStatus.ACTIVE);
    }

    @Override
    @Transactional(readOnly = true)
    public List<FeedbackForm> getFormVersions(Long formId) {
        FeedbackForm form = feedbackFormRepository.findById(formId)
                .orElseThrow(() -> new ResourceNotFoundException("Feedback Form not found with ID: " + formId));
        Long rootId = form.getRootFormId() != null ? form.getRootFormId() : form.getId();
        List<FeedbackForm> versions = feedbackFormRepository.findByRootFormIdOrderByVersionNumberAsc(rootId);
        if (versions.isEmpty()) {
            return List.of(form);
        }
        return versions;
    }

    @Override
    @Transactional
    public FeedbackForm changeFormStatus(Long formId, FeedbackFormStatus newStatus) {
        FeedbackForm form = feedbackFormRepository.findById(formId)
                .orElseThrow(() -> new ResourceNotFoundException("Feedback Form not found with ID: " + formId));

        FeedbackFormStatus oldStatus = form.getStatus();

        if (oldStatus == newStatus) {
            return form;
        }

        // Manual status change allowed only: DRAFT -> ACTIVE
        if (!(oldStatus == FeedbackFormStatus.DRAFT && newStatus == FeedbackFormStatus.ACTIVE)) {
            throw new BusinessValidationException(
                    "Invalid form status change. Only DRAFT forms can be activated manually."
            );
        }

        if (newStatus == FeedbackFormStatus.ACTIVE) {
            Long rootId = form.getRootFormId() != null ? form.getRootFormId() : form.getId();
            feedbackFormRepository.findByRootFormIdOrderByVersionNumberAsc(rootId).stream()
                    .filter(version -> !version.getId().equals(form.getId()))
                    .filter(version -> version.getStatus() == FeedbackFormStatus.ACTIVE)
                    .forEach(activeVersion -> {
                        activeVersion.setStatus(FeedbackFormStatus.ARCHIVED);
                        feedbackFormRepository.save(activeVersion);
                    });
        }

        form.setStatus(newStatus);
        FeedbackForm saved = feedbackFormRepository.save(form);

        feedbackOperationalService.audit(
                form.getCreatedByUserId(),
                FeedbackOperationalService.FORM_UPDATED,
                FeedbackOperationalService.ENTITY_FORM,
                saved.getId(),
                "status=" + oldStatus.name(),
                "status=" + newStatus.name(),
                "Feedback form status changed from " + oldStatus.name() + " to " + newStatus.name()
        );

        return saved;
    }

    private void validateForm(FeedbackForm form) {

        if (form.getSections() == null || form.getSections().isEmpty()) {
            throw new BusinessValidationException("Form must contain at least one section.");
        }

        for (FeedbackSection section : form.getSections()) {
            if (section.getQuestions() == null || section.getQuestions().isEmpty()) {
                throw new BusinessValidationException("Section '" + section.getTitle() + "' must contain at least one question.");
            }

            Set<Integer> orderSet = new HashSet<>();
            for (FeedbackQuestion question : section.getQuestions()) {
                if (!orderSet.add(question.getQuestionOrder())) {
                    throw new BusinessValidationException("Duplicate question order " + question.getQuestionOrder() + " found in section '" + section.getTitle() + "'.");
                }
            }
        }

        Set<Integer> ratingScales = form.getSections().stream()
                .flatMap(section -> section.getQuestions().stream())
                .map(FeedbackQuestion::getRatingScaleId)
                .collect(java.util.stream.Collectors.toSet());

        if (ratingScales.contains(null)) {
            throw new BusinessValidationException("Every question must have a rating scale.");
        }

        if (ratingScales.size() > 1) {
            throw new BusinessValidationException("All questions in the same form must use one unified rating scale.");
        }

        Integer ratingScaleId = ratingScales.iterator().next();

        if (!ratingScaleRepository.existsById(ratingScaleId)) {
            throw new BusinessValidationException("Rating scale not found with ID: " + ratingScaleId);
        }
    }

    private FeedbackForm findFormWithSectionsAndQuestions(Long formId) {
        FeedbackForm form = feedbackFormRepository.findByIdWithSections(formId)
                .orElseThrow(() -> new ResourceNotFoundException("Feedback Form not found with ID: " + formId));

        // Do not replace form.sections here. The sections collection has orphanRemoval=true.
        // Replacing the managed collection inside a write transaction can cause Hibernate
        // to throw: "collection with cascade=all-delete-orphan was no longer referenced".
        // This query initializes Section -> Question collections in the current persistence context.
        feedbackFormRepository.findSectionsWithQuestionsByFormId(formId);

        return form;
    }
}
