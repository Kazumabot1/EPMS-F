package com.epms.service.impl;

import com.epms.dto.AssessmentFormDtos.AssessmentFormPayload;
import com.epms.dto.AssessmentFormDtos.AssessmentFormResponse;
import com.epms.dto.AssessmentFormDtos.AssessmentQuestionPayload;
import com.epms.dto.AssessmentFormDtos.AssessmentQuestionResponse;
import com.epms.dto.AssessmentFormDtos.AssessmentSectionPayload;
import com.epms.dto.AssessmentFormDtos.AssessmentSectionResponse;
import com.epms.entity.AssessmentFormDefinition;
import com.epms.entity.AssessmentFormQuestionDefinition;
import com.epms.entity.AssessmentFormSectionDefinition;
import com.epms.exception.BadRequestException;
import com.epms.exception.ResourceNotFoundException;
import com.epms.repository.AssessmentFormDefinitionRepository;
import com.epms.service.AssessmentFormDefinitionService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class AssessmentFormDefinitionServiceImpl implements AssessmentFormDefinitionService {

    private final AssessmentFormDefinitionRepository repository;

    @Override
    @Transactional(readOnly = true)
    public List<AssessmentFormResponse> getAll() {
        return repository.findAllByOrderByCreatedAtDesc()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public AssessmentFormResponse getById(Integer id) {
        return toResponse(getEntity(id));
    }

    @Override
    public AssessmentFormResponse create(AssessmentFormPayload payload) {
        validate(payload);

        String formName = payload.getFormName().trim();

        if (repository.existsByFormNameIgnoreCase(formName)) {
            throw new BadRequestException("Assessment form name already exists.");
        }

        AssessmentFormDefinition form = new AssessmentFormDefinition();
        applyPayload(form, payload);

        AssessmentFormDefinition saved = repository.save(form);

        return toResponse(saved);
    }

    @Override
    public AssessmentFormResponse update(Integer id, AssessmentFormPayload payload) {
        validate(payload);

        AssessmentFormDefinition form = getEntity(id);
        String formName = payload.getFormName().trim();

        if (repository.existsByFormNameIgnoreCaseAndIdNot(formName, id)) {
            throw new BadRequestException("Assessment form name already exists.");
        }

        if (form.getTargetRoles() == null) {
            form.setTargetRoles(new ArrayList<>());
        } else {
            form.getTargetRoles().clear();
        }

        if (form.getSections() == null) {
            form.setSections(new ArrayList<>());
        } else {
            form.getSections().clear();
        }

        applyPayload(form, payload);

        AssessmentFormDefinition saved = repository.save(form);

        return toResponse(saved);
    }

    @Override
    public void deactivate(Integer id) {
        AssessmentFormDefinition form = getEntity(id);
        form.setActive(false);
        repository.save(form);
    }

    private AssessmentFormDefinition getEntity(Integer id) {
        return repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Assessment form not found with id: " + id));
    }

    private void validate(AssessmentFormPayload payload) {
        if (payload == null) {
            throw new BadRequestException("Assessment form payload is required.");
        }

        if (payload.getFormName() == null || payload.getFormName().isBlank()) {
            throw new BadRequestException("Form name is required.");
        }

        if (payload.getTargetRoles() == null || payload.getTargetRoles().isEmpty()) {
            throw new BadRequestException("Select at least one target role.");
        }

        if (payload.getSections() == null || payload.getSections().isEmpty()) {
            throw new BadRequestException("Add at least one section.");
        }

        for (AssessmentSectionPayload section : payload.getSections()) {
            if (section == null) {
                throw new BadRequestException("Section payload is invalid.");
            }

            if (section.getTitle() == null || section.getTitle().isBlank()) {
                throw new BadRequestException("Every section needs a title.");
            }

            if (section.getQuestions() == null || section.getQuestions().isEmpty()) {
                throw new BadRequestException("Every section needs at least one question.");
            }

            for (AssessmentQuestionPayload question : section.getQuestions()) {
                if (question == null) {
                    throw new BadRequestException("Question payload is invalid.");
                }

                if (question.getQuestionText() == null || question.getQuestionText().isBlank()) {
                    throw new BadRequestException("Every question needs text.");
                }

                if (question.getWeight() != null && question.getWeight() < 0) {
                    throw new BadRequestException("Question weight cannot be negative.");
                }
            }
        }
    }

    private void applyPayload(AssessmentFormDefinition form, AssessmentFormPayload payload) {
        form.setFormName(payload.getFormName().trim());
        form.setDescription(clean(payload.getDescription()));
        form.setActive(true);

        if (form.getTargetRoles() == null) {
            form.setTargetRoles(new ArrayList<>());
        }

        form.getTargetRoles().addAll(
                payload.getTargetRoles()
                        .stream()
                        .filter(role -> role != null && !role.isBlank())
                        .map(String::trim)
                        .distinct()
                        .toList()
        );

        if (form.getSections() == null) {
            form.setSections(new ArrayList<>());
        }

        int sectionIndex = 1;

        for (AssessmentSectionPayload sectionPayload : payload.getSections()) {
            AssessmentFormSectionDefinition section = new AssessmentFormSectionDefinition();

            section.setForm(form);
            section.setTitle(sectionPayload.getTitle().trim());
            section.setOrderNo(sectionPayload.getOrderNo() != null ? sectionPayload.getOrderNo() : sectionIndex);

            if (section.getQuestions() == null) {
                section.setQuestions(new ArrayList<>());
            }

            for (AssessmentQuestionPayload questionPayload : sectionPayload.getQuestions()) {
                AssessmentFormQuestionDefinition question = new AssessmentFormQuestionDefinition();

                question.setSection(section);
                question.setQuestionText(questionPayload.getQuestionText().trim());
                question.setResponseType(resolveResponseType(questionPayload.getResponseType()));
                question.setRequired(questionPayload.getIsRequired() == null || questionPayload.getIsRequired());
                question.setWeight(questionPayload.getWeight() != null ? questionPayload.getWeight() : 1.0);

                section.getQuestions().add(question);
            }

            form.getSections().add(section);
            sectionIndex++;
        }
    }

    private String resolveResponseType(String responseType) {
        if (responseType == null || responseType.isBlank()) {
            return "RATING";
        }

        String normalized = responseType.trim().toUpperCase();

        if (!normalized.equals("RATING") && !normalized.equals("TEXT") && !normalized.equals("YES_NO")) {
            throw new BadRequestException("Invalid response type: " + responseType);
        }

        return normalized;
    }

    private AssessmentFormResponse toResponse(AssessmentFormDefinition form) {
        AssessmentFormResponse response = new AssessmentFormResponse();

        response.setId(form.getId());
        response.setFormName(form.getFormName());
        response.setDescription(form.getDescription());
        response.setIsActive(form.getActive());
        response.setTargetRoles(form.getTargetRoles() == null ? List.of() : form.getTargetRoles());
        response.setCreatedAt(form.getCreatedAt());
        response.setUpdatedAt(form.getUpdatedAt());

        response.setSections(
                form.getSections() == null
                        ? List.of()
                        : form.getSections()
                        .stream()
                        .sorted(Comparator.comparing(
                                AssessmentFormSectionDefinition::getOrderNo,
                                Comparator.nullsLast(Integer::compareTo)
                        ))
                        .map(this::toSectionResponse)
                        .toList()
        );

        return response;
    }

    private AssessmentSectionResponse toSectionResponse(AssessmentFormSectionDefinition section) {
        AssessmentSectionResponse response = new AssessmentSectionResponse();

        response.setId(section.getId());
        response.setTitle(section.getTitle());
        response.setOrderNo(section.getOrderNo());

        response.setQuestions(
                section.getQuestions() == null
                        ? List.of()
                        : section.getQuestions()
                        .stream()
                        .map(this::toQuestionResponse)
                        .toList()
        );

        return response;
    }

    private AssessmentQuestionResponse toQuestionResponse(AssessmentFormQuestionDefinition question) {
        AssessmentQuestionResponse response = new AssessmentQuestionResponse();

        response.setId(question.getId());
        response.setQuestionText(question.getQuestionText());
        response.setResponseType(question.getResponseType());
        response.setIsRequired(question.getRequired());
        response.setWeight(question.getWeight());

        return response;
    }

    private String clean(String value) {
        if (value == null || value.trim().isEmpty()) {
            return null;
        }

        return value.trim();
    }
}