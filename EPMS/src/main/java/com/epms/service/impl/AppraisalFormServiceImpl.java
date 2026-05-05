package com.epms.service.impl;

import com.epms.dto.AppraisalFormRequestDto;
import com.epms.dto.AppraisalFormResponseDto;
import com.epms.entity.AppraisalForm;
import com.epms.entity.AppraisalQuestion;
import com.epms.entity.AppraisalSection;
import com.epms.exception.BadRequestException;
import com.epms.exception.ResourceNotFoundException;
import com.epms.repository.AppraisalFormRepository;
import com.epms.security.SecurityUtils;
import com.epms.security.UserPrincipal;
import com.epms.service.AppraisalFormService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class AppraisalFormServiceImpl implements AppraisalFormService {

    private static final Set<String> ALLOWED_TARGET_ROLES = Set.of(
            "Employee",
            "Manager",
            "DepartmentHead",
            "ProjectManager"
    );

    private final AppraisalFormRepository appraisalFormRepository;

    @Override
    @Transactional
    public AppraisalFormResponseDto createAppraisalForm(AppraisalFormRequestDto requestDto) {
        AppraisalForm form = new AppraisalForm();
        form.setIsActive(true);

        applyRequest(form, requestDto);

        return mapToResponseDto(appraisalFormRepository.save(form));
    }

    @Override
    @Transactional(readOnly = true)
    public List<AppraisalFormResponseDto> getAllAppraisalForms() {
        return appraisalFormRepository.findAllByOrderByCreatedAtDesc()
                .stream()
                .map(this::mapToResponseDto)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public AppraisalFormResponseDto getAppraisalFormById(Long id) {
        return mapToResponseDto(getAppraisalFormEntityById(id));
    }

    @Override
    @Transactional
    public AppraisalFormResponseDto updateAppraisalForm(Long id, AppraisalFormRequestDto requestDto) {
        AppraisalForm existingForm = getAppraisalFormEntityById(id);

        applyRequest(existingForm, requestDto);

        return mapToResponseDto(appraisalFormRepository.save(existingForm));
    }

    @Override
    @Transactional
    public void deleteAppraisalForm(Long id) {
        AppraisalForm form = getAppraisalFormEntityById(id);
        form.setIsActive(false);
        appraisalFormRepository.save(form);
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<AppraisalFormResponseDto> getMyActiveForm() {
        UserPrincipal principal = SecurityUtils.currentUser();

        List<String> currentRoles = principal.getRoles()
                .stream()
                .map(this::canonicalRole)
                .filter(role -> !role.isBlank())
                .toList();

        if (currentRoles.stream().anyMatch(role -> role.equals("Admin") || role.equals("CEO") || role.equals("Executive"))) {
            return Optional.empty();
        }

        return appraisalFormRepository.findByIsActiveTrueOrderByCreatedAtDesc()
                .stream()
                .filter(form -> form.getTargetRoleList()
                        .stream()
                        .anyMatch(target -> currentRoles.contains(canonicalRole(target))))
                .findFirst()
                .map(this::mapToResponseDto);
    }

    private void applyRequest(AppraisalForm form, AppraisalFormRequestDto requestDto) {
        if (requestDto == null) {
            throw new BadRequestException("Appraisal form request body is required");
        }

        form.setFormName(requestDto.getFormName());
        form.setDescription(requestDto.getDescription());
        form.setTargetRoleList(validateTargetRoles(requestDto.getTargetRoles()));

        form.getSections().clear();

        if (requestDto.getSections() == null || requestDto.getSections().isEmpty()) {
            throw new BadRequestException("At least one section is required");
        }

        int sectionOrder = 1;

        for (AppraisalFormRequestDto.SectionRequest sectionRequest : requestDto.getSections()) {
            if (sectionRequest.getTitle() == null || sectionRequest.getTitle().isBlank()) {
                throw new BadRequestException("Section title is required");
            }

            AppraisalSection section = new AppraisalSection();
            section.setForm(form);
            section.setTitle(sectionRequest.getTitle().trim());
            section.setOrderNo(sectionRequest.getOrderNo() == null ? sectionOrder : sectionRequest.getOrderNo());

            if (sectionRequest.getQuestions() == null || sectionRequest.getQuestions().isEmpty()) {
                throw new BadRequestException("Every section must have at least one question");
            }

            for (AppraisalFormRequestDto.QuestionRequest questionRequest : sectionRequest.getQuestions()) {
                if (questionRequest.getQuestionText() == null || questionRequest.getQuestionText().isBlank()) {
                    throw new BadRequestException("Question text is required");
                }

                AppraisalQuestion question = new AppraisalQuestion();
                question.setSection(section);
                question.setQuestionText(questionRequest.getQuestionText().trim());
                question.setResponseType(normalizeResponseType(questionRequest.getResponseType()));
                question.setIsRequired(questionRequest.getIsRequired() == null || questionRequest.getIsRequired());
                question.setWeight(questionRequest.getWeight() == null ? 1.0 : questionRequest.getWeight());

                section.getQuestions().add(question);
            }

            form.getSections().add(section);
            sectionOrder++;
        }
    }

    private List<String> validateTargetRoles(List<String> roles) {
        if (roles == null || roles.isEmpty()) {
            throw new BadRequestException("At least one target role is required");
        }

        LinkedHashSet<String> sanitized = new LinkedHashSet<>();

        for (String role : roles) {
            String canonical = canonicalRole(role);

            if (canonical.equals("Admin") || canonical.equals("CEO") || canonical.equals("Executive")) {
                throw new BadRequestException("Admin and CEO roles cannot be targeted for self-assessment forms");
            }

            if (!ALLOWED_TARGET_ROLES.contains(canonical)) {
                throw new BadRequestException("Invalid target role: " + role);
            }

            sanitized.add(canonical);
        }

        return List.copyOf(sanitized);
    }

    private String normalizeResponseType(String value) {
        if (value == null || value.isBlank()) {
            return "RATING";
        }

        String normalized = value.trim().toUpperCase();

        return switch (normalized) {
            case "RATING", "TEXT", "YES_NO" -> normalized;
            default -> throw new BadRequestException("Invalid response type: " + value);
        };
    }

    private String canonicalRole(String value) {
        if (value == null) return "";

        String normalized = value
                .replaceFirst("(?i)^ROLE_", "")
                .trim()
                .replaceAll("[\\s-]+", "_")
                .toUpperCase();

        return switch (normalized) {
            case "EMPLOYEE", "STAFF" -> "Employee";
            case "MANAGER" -> "Manager";
            case "DEPARTMENT_HEAD", "DEPARTMENTHEAD" -> "DepartmentHead";
            case "PROJECT_MANAGER", "PROJECTMANAGER" -> "ProjectManager";
            case "ADMIN" -> "Admin";
            case "CEO" -> "CEO";
            case "EXECUTIVE" -> "Executive";
            default -> "";
        };
    }

    private AppraisalForm getAppraisalFormEntityById(Long id) {
        return appraisalFormRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Appraisal Form not found with id: " + id));
    }

    private AppraisalFormResponseDto mapToResponseDto(AppraisalForm form) {
        return AppraisalFormResponseDto.builder()
                .id(form.getId())
                .formName(form.getFormName())
                .description(form.getDescription())
                .isActive(form.getIsActive())
                .targetRoles(form.getTargetRoleList())
                .createdAt(form.getCreatedAt())
                .updatedAt(form.getUpdatedAt())
                .sections(form.getSections() == null
                        ? List.of()
                        : form.getSections()
                        .stream()
                        .sorted(Comparator.comparing(
                                AppraisalSection::getOrderNo,
                                Comparator.nullsLast(Integer::compareTo)
                        ))
                        .map(this::mapSection)
                        .toList())
                .build();
    }

    private AppraisalFormResponseDto.SectionResponse mapSection(AppraisalSection section) {
        return AppraisalFormResponseDto.SectionResponse.builder()
                .id(section.getId())
                .title(section.getTitle())
                .orderNo(section.getOrderNo())
                .questions(section.getQuestions() == null
                        ? List.of()
                        : section.getQuestions()
                        .stream()
                        .map(this::mapQuestion)
                        .toList())
                .build();
    }

    private AppraisalFormResponseDto.QuestionResponse mapQuestion(AppraisalQuestion question) {
        return AppraisalFormResponseDto.QuestionResponse.builder()
                .id(question.getId())
                .questionText(question.getQuestionText())
                .responseType(question.getResponseType())
                .isRequired(question.getIsRequired())
                .weight(question.getWeight())
                .build();
    }
}