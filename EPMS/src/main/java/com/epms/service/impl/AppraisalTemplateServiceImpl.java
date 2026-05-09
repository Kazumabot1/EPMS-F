package com.epms.service.impl;

import com.epms.dto.appraisal.*;
import com.epms.entity.*;
import com.epms.entity.enums.AppraisalTemplateStatus;
import com.epms.exception.BadRequestException;
import com.epms.exception.ResourceNotFoundException;
import com.epms.repository.AppraisalFormTemplateRepository;
import com.epms.repository.AppraisalSectionRepository;
import com.epms.repository.DepartmentRepository;
import com.epms.repository.UserRepository;
import com.epms.service.AppraisalTemplateService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class AppraisalTemplateServiceImpl implements AppraisalTemplateService {
    private static final List<String> ALLOWED_SIGNATURE_DATE_FORMATS = List.of("DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD");

    private final AppraisalFormTemplateRepository templateRepository;
    private final AppraisalSectionRepository sectionRepository;
    private final DepartmentRepository departmentRepository;
    private final UserRepository userRepository;

    @Override
    public AppraisalTemplateResponse createTemplate(AppraisalTemplateRequest request, Integer createdByUserId) {
        validateTemplateRequest(request);
        ensureUniqueTemplateNameForCreate(request.getTemplateName());

        AppraisalFormTemplate template = new AppraisalFormTemplate();
        template.setTemplateName(request.getTemplateName().trim());
        template.setDescription(request.getDescription());
        template.setAppraiseeSignatureId(request.getAppraiseeSignatureId());
        template.setAppraiserSignatureId(request.getAppraiserSignatureId());
        template.setHrSignatureId(request.getHrSignatureId());
        template.setSignatureDateFormat(normalizeSignatureDateFormat(request.getSignatureDateFormat()));
        template.setFormType(request.getFormType() != null ? request.getFormType() : com.epms.entity.enums.AppraisalCycleType.ANNUAL);
        template.setTargetAllDepartments(request.getTargetAllDepartments() == null || Boolean.TRUE.equals(request.getTargetAllDepartments()));
        template.setStatus(AppraisalTemplateStatus.DRAFT);

        if (createdByUserId != null) {
            User createdBy = userRepository.findById(createdByUserId)
                    .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + createdByUserId));
            template.setCreatedByUser(createdBy);
        }

        applyDepartments(template, request);
        applySections(template, request.getSections());

        AppraisalFormTemplate saved = templateRepository.save(template);
        return mapTemplate(saved, true);
    }

    @Override
    public AppraisalTemplateResponse updateDraftTemplate(Integer templateId, AppraisalTemplateRequest request) {
        validateTemplateRequest(request);
        AppraisalFormTemplate template = getTemplateEntity(templateId);
        ensureTemplateEditable(template);
        ensureUniqueTemplateNameForUpdate(templateId, request.getTemplateName());

        template.setTemplateName(request.getTemplateName().trim());
        template.setDescription(request.getDescription());
        template.setAppraiseeSignatureId(request.getAppraiseeSignatureId());
        template.setAppraiserSignatureId(request.getAppraiserSignatureId());
        template.setHrSignatureId(request.getHrSignatureId());
        template.setSignatureDateFormat(normalizeSignatureDateFormat(request.getSignatureDateFormat()));
        template.setFormType(request.getFormType() != null ? request.getFormType() : template.getFormType());
        template.setTargetAllDepartments(request.getTargetAllDepartments() == null || Boolean.TRUE.equals(request.getTargetAllDepartments()));
        template.setVersionNo((template.getVersionNo() == null ? 1 : template.getVersionNo()) + 1);

        template.getTargetDepartments().clear();
        template.getSections().clear();
        applyDepartments(template, request);
        applySections(template, request.getSections());

        AppraisalFormTemplate saved = templateRepository.save(template);
        return mapTemplate(saved, true);
    }

    @Override
    @Transactional(readOnly = true)
    public AppraisalTemplateResponse getTemplate(Integer templateId) {
        AppraisalFormTemplate template = getTemplateEntity(templateId);
        return mapTemplate(template, true);
    }

    @Override
    @Transactional(readOnly = true)
    public List<AppraisalTemplateResponse> getTemplates(AppraisalTemplateStatus status) {
        List<AppraisalFormTemplate> templates = status == null
                ? templateRepository.findAll()
                : templateRepository.findByStatus(status);
        return templates.stream()
                .sorted(Comparator.comparing(AppraisalFormTemplate::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .map(template -> mapTemplate(template, true))
                .toList();
    }

    @Override
    public AppraisalTemplateResponse activateTemplate(Integer templateId) {
        AppraisalFormTemplate template = getTemplateEntity(templateId);
        if (template.getSections() == null || template.getSections().isEmpty()) {
            throw new BadRequestException("Template must have at least one section before activation.");
        }
        long criteriaCount = template.getSections().stream()
                .flatMap(section -> section.getCriteria().stream())
                .filter(criteria -> Boolean.TRUE.equals(criteria.getActive()))
                .count();
        if (criteriaCount == 0) {
            throw new BadRequestException("Template must have at least one active criteria before activation.");
        }
        template.setStatus(AppraisalTemplateStatus.ACTIVE);
        return mapTemplate(templateRepository.save(template), true);
    }

    @Override
    public AppraisalTemplateResponse archiveTemplate(Integer templateId) {
        AppraisalFormTemplate template = getTemplateEntity(templateId);
        template.setStatus(AppraisalTemplateStatus.ARCHIVED);
        return mapTemplate(templateRepository.save(template), true);
    }


    private void ensureUniqueTemplateNameForCreate(String templateName) {
        String normalizedName = templateName == null ? "" : templateName.trim();
        if (templateRepository.existsByTemplateNameIgnoreCase(normalizedName)) {
            throw new BadRequestException("Template name already exists. Please use a different template name.");
        }
    }

    private void ensureUniqueTemplateNameForUpdate(Integer templateId, String templateName) {
        String normalizedName = templateName == null ? "" : templateName.trim();
        if (templateRepository.existsByTemplateNameIgnoreCaseAndIdNot(normalizedName, templateId)) {
            throw new BadRequestException("Template name already exists. Please use a different template name.");
        }
    }

    private AppraisalFormTemplate getTemplateEntity(Integer templateId) {
        return templateRepository.findById(templateId)
                .orElseThrow(() -> new ResourceNotFoundException("Appraisal template not found with id: " + templateId));
    }

    private void ensureTemplateEditable(AppraisalFormTemplate template) {
        if (template.getStatus() == AppraisalTemplateStatus.ARCHIVED) {
            throw new BadRequestException("Archived appraisal templates cannot be edited.");
        }
    }

    private void validateTemplateRequest(AppraisalTemplateRequest request) {
        if (request == null) {
            throw new BadRequestException("Template request is required.");
        }
        if (request.getTemplateName() == null || request.getTemplateName().isBlank()) {
            throw new BadRequestException("Template name is required.");
        }
        // Template master is department/cycle-type independent. Cycle type and target departments
        // are selected when HR creates an Appraisal Cycle from a template.
        if (request.getSections() == null || request.getSections().isEmpty()) {
            throw new BadRequestException("At least one section is required.");
        }
        validateSignatureDateFormat(request.getSignatureDateFormat());
    }

    private void applyDepartments(AppraisalFormTemplate template, AppraisalTemplateRequest request) {
        if (Boolean.TRUE.equals(request.getTargetAllDepartments())) {
            return;
        }
        for (Integer departmentId : request.getDepartmentIds()) {
            Department department = departmentRepository.findById(departmentId)
                    .orElseThrow(() -> new ResourceNotFoundException("Department not found with id: " + departmentId));
            AppraisalTemplateDepartment target = new AppraisalTemplateDepartment();
            target.setTemplate(template);
            target.setDepartment(department);
            template.getTargetDepartments().add(target);
        }
    }

    private void applySections(AppraisalFormTemplate template, List<AppraisalSectionRequest> sectionRequests) {
        int sectionIndex = 0;
        for (AppraisalSectionRequest sectionRequest : sectionRequests) {
            if (sectionRequest.getSectionName() == null || sectionRequest.getSectionName().isBlank()) {
                throw new BadRequestException("Section name is required.");
            }
            AppraisalSection section = new AppraisalSection();
            section.setTemplate(template);
            section.setSectionName(sectionRequest.getSectionName().trim());
            section.setDescription(sectionRequest.getDescription());
            section.setSortOrder(sectionRequest.getSortOrder() != null ? sectionRequest.getSortOrder() : sectionIndex);
            section.setActive(sectionRequest.getActive() == null || sectionRequest.getActive());

            List<AppraisalCriterionRequest> criteriaRequests = sectionRequest.getCriteria() == null
                    ? new ArrayList<>()
                    : sectionRequest.getCriteria();
            int criteriaIndex = 0;
            for (AppraisalCriterionRequest criterionRequest : criteriaRequests) {
                if (criterionRequest.getCriteriaText() == null || criterionRequest.getCriteriaText().isBlank()) {
                    throw new BadRequestException("Criteria text is required.");
                }
                AppraisalFormCriteria criteria = new AppraisalFormCriteria();
                criteria.setSection(section);
                criteria.setCriteriaText(criterionRequest.getCriteriaText().trim());
                criteria.setDescription(criterionRequest.getDescription());
                criteria.setSortOrder(criterionRequest.getSortOrder() != null ? criterionRequest.getSortOrder() : criteriaIndex);
                criteria.setMaxRating(criterionRequest.getMaxRating() != null ? criterionRequest.getMaxRating() : 5);
                criteria.setRatingRequired(criterionRequest.getRatingRequired() == null || criterionRequest.getRatingRequired());
                criteria.setActive(criterionRequest.getActive() == null || criterionRequest.getActive());
                section.getCriteria().add(criteria);
                criteriaIndex++;
            }
            template.getSections().add(section);
            sectionIndex++;
        }
    }

    private AppraisalTemplateResponse mapTemplate(AppraisalFormTemplate template, boolean includeStructure) {
        AppraisalTemplateResponse response = new AppraisalTemplateResponse();
        response.setId(template.getId());
        response.setTemplateName(template.getTemplateName());
        response.setDescription(template.getDescription());
        response.setAppraiseeSignatureId(template.getAppraiseeSignatureId());
        response.setAppraiserSignatureId(template.getAppraiserSignatureId());
        response.setHrSignatureId(template.getHrSignatureId());
        response.setSignatureDateFormat(normalizeSignatureDateFormat(template.getSignatureDateFormat()));
        response.setFormType(template.getFormType());
        response.setTargetAllDepartments(template.getTargetAllDepartments());
        response.setStatus(template.getStatus());
        response.setVersionNo(template.getVersionNo());
        response.setCreatedAt(template.getCreatedAt());
        response.setUpdatedAt(template.getUpdatedAt());

        if (Boolean.FALSE.equals(template.getTargetAllDepartments())) {
            template.getTargetDepartments().forEach(target -> {
                if (target.getDepartment() != null) {
                    response.getDepartmentIds().add(target.getDepartment().getId());
                    response.getDepartmentNames().add(target.getDepartment().getDepartmentName());
                }
            });
        }

        if (includeStructure) {
            List<AppraisalSection> sections = template.getSections();
            if (sections == null || sections.isEmpty()) {
                sections = sectionRepository.findByTemplateIdWithCriteria(template.getId());
            }
            response.setSections(sections.stream()
                    .sorted(Comparator.comparing(AppraisalSection::getSortOrder, Comparator.nullsLast(Integer::compareTo)))
                    .map(this::mapSection)
                    .toList());
        }

        return response;
    }

    private void validateSignatureDateFormat(String signatureDateFormat) {
        String normalized = normalizeSignatureDateFormat(signatureDateFormat);
        if (!ALLOWED_SIGNATURE_DATE_FORMATS.contains(normalized)) {
            throw new BadRequestException("Signature date format is invalid. Allowed: DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD");
        }
    }

    private String normalizeSignatureDateFormat(String signatureDateFormat) {
        if (signatureDateFormat == null || signatureDateFormat.isBlank()) {
            return "DD/MM/YYYY";
        }
        return signatureDateFormat.trim().toUpperCase();
    }

    private AppraisalSectionResponse mapSection(AppraisalSection section) {
        AppraisalSectionResponse response = new AppraisalSectionResponse();
        response.setId(section.getId());
        response.setSectionName(section.getSectionName());
        response.setDescription(section.getDescription());
        response.setSortOrder(section.getSortOrder());
        response.setActive(section.getActive());
        response.setCriteria(section.getCriteria().stream()
                .sorted(Comparator.comparing(AppraisalFormCriteria::getSortOrder, Comparator.nullsLast(Integer::compareTo)))
                .map(criteria -> new AppraisalCriterionResponse(
                        criteria.getId(),
                        criteria.getCriteriaText(),
                        criteria.getDescription(),
                        criteria.getSortOrder(),
                        criteria.getMaxRating(),
                        criteria.getRatingRequired(),
                        criteria.getActive(),
                        null,
                        null
                ))
                .toList());
        return response;
    }
}
