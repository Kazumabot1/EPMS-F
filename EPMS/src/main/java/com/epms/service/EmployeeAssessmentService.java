package com.epms.service;

import com.epms.dto.EmployeeAssessmentDtos.AssessmentItemRequest;
import com.epms.dto.EmployeeAssessmentDtos.AssessmentItemResponse;
import com.epms.dto.EmployeeAssessmentDtos.AssessmentRequest;
import com.epms.dto.EmployeeAssessmentDtos.AssessmentResponse;
import com.epms.dto.EmployeeAssessmentDtos.AssessmentScoreBandResponse;
import com.epms.dto.EmployeeAssessmentDtos.AssessmentSectionResponse;
import com.epms.dto.EmployeeAssessmentDtos.ScoreTableRowResponse;
import com.epms.entity.AssessmentFormDefinition;
import com.epms.entity.AssessmentFormQuestionDefinition;
import com.epms.entity.AssessmentFormScoreBandDefinition;
import com.epms.entity.AssessmentFormSectionDefinition;
import com.epms.entity.Department;
import com.epms.entity.Employee;
import com.epms.entity.EmployeeAssessment;
import com.epms.entity.EmployeeAssessmentAnswer;
import com.epms.entity.User;
import com.epms.entity.enums.AssessmentStatus;
import com.epms.exception.BadRequestException;
import com.epms.exception.ResourceNotFoundException;
import com.epms.exception.UnauthorizedActionException;
import com.epms.repository.AssessmentFormDefinitionRepository;
import com.epms.repository.DepartmentRepository;
import com.epms.repository.EmployeeAssessmentRepository;
import com.epms.repository.EmployeeRepository;
import com.epms.repository.UserRepository;
import com.epms.security.SecurityUtils;
import com.epms.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class EmployeeAssessmentService {

    private static final int MAX_RATING = 5;

    private static final String RESPONSE_TYPE_RATING = "RATING";
    private static final String RESPONSE_TYPE_TEXT = "TEXT";
    private static final String RESPONSE_TYPE_YES_NO = "YES_NO";
    private static final String RESPONSE_TYPE_YES_NO_RATING = "YES_NO_RATING";

    private final EmployeeAssessmentRepository assessmentRepository;
    private final AssessmentFormDefinitionRepository formRepository;
    private final UserRepository userRepository;
    private final EmployeeRepository employeeRepository;
    private final DepartmentRepository departmentRepository;

    @Transactional(readOnly = true)
    public AssessmentResponse getTemplateForCurrentUser() {
        User user = currentUserEntity();
        AssessmentFormDefinition form = findAssignedActiveFormForCurrentUser();
        EmployeeProfile profile = resolveProfile(user);

        return toTemplateResponse(user, profile, form);
    }

    @Transactional(readOnly = true)
    public AssessmentResponse getLatestDraftForCurrentUser() {
        User user = currentUserEntity();
        AssessmentFormDefinition form = findAssignedActiveFormForCurrentUser();

        return assessmentRepository
                .findFirstByUserIdAndAssessmentFormIdAndStatusOrderByUpdatedAtDesc(
                        user.getId(),
                        form.getId(),
                        AssessmentStatus.DRAFT
                )
                .map(this::toResponse)
                .orElseGet(() -> toTemplateResponse(user, resolveProfile(user), form));
    }

    @Transactional(readOnly = true)
    public AssessmentResponse getById(Long id) {
        EmployeeAssessment assessment = findAssessment(id);
        assertCanView(assessment);
        return toResponse(assessment);
    }

    @Transactional
    public AssessmentResponse saveDraft(AssessmentRequest request) {
        User user = currentUserEntity();
        AssessmentFormDefinition form = findAssignedActiveFormForCurrentUser();

        validateRequestFormMatchesAssignedForm(request, form);

        EmployeeAssessment assessment = assessmentRepository
                .findFirstByUserIdAndAssessmentFormIdAndStatusOrderByUpdatedAtDesc(
                        user.getId(),
                        form.getId(),
                        AssessmentStatus.DRAFT
                )
                .orElseGet(() -> createNewAssessment(user, form));

        applyRequest(assessment, request, AssessmentStatus.DRAFT, form);
        calculateScores(assessment, form);

        return toResponse(assessmentRepository.save(assessment));
    }

    @Transactional
    public AssessmentResponse updateDraft(Long id, AssessmentRequest request) {
        EmployeeAssessment assessment = findAssessment(id);
        assertOwner(assessment);
        ensureEditable(assessment);

        AssessmentFormDefinition form = findAssignedActiveFormForCurrentUser();

        validateAssessmentBelongsToAssignedForm(assessment, form);
        validateRequestFormMatchesAssignedForm(request, form);

        applyRequest(assessment, request, AssessmentStatus.DRAFT, form);
        calculateScores(assessment, form);

        return toResponse(assessmentRepository.save(assessment));
    }

    @Transactional
    public AssessmentResponse submit(Long id, AssessmentRequest request) {
        EmployeeAssessment assessment = findAssessment(id);
        assertOwner(assessment);
        ensureEditable(assessment);

        AssessmentFormDefinition form = findAssignedActiveFormForCurrentUser();

        validateAssessmentBelongsToAssignedForm(assessment, form);
        validateRequestFormMatchesAssignedForm(request, form);

        applyRequest(assessment, request, AssessmentStatus.SUBMITTED, form);
        validateComplete(assessment);
        calculateScores(assessment, form);

        assessment.setSubmittedAt(LocalDateTime.now());

        return toResponse(assessmentRepository.save(assessment));
    }

    @Transactional(readOnly = true)
    public List<ScoreTableRowResponse> getMyScores() {
        Integer userId = SecurityUtils.currentUserId();

        return assessmentRepository
                .findByUserIdAndStatusOrderBySubmittedAtDesc(userId, AssessmentStatus.SUBMITTED)
                .stream()
                .map(this::toScoreRow)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<ScoreTableRowResponse> getScoreTable() {
        UserPrincipal principal = SecurityUtils.currentUser();

        if (!canViewScoreTable(principal)) {
            throw new UnauthorizedActionException("Only HR, Admin, Managers, and Department Heads can view the employee score table.");
        }

        return assessmentRepository
                .findByStatusOrderBySubmittedAtDesc(AssessmentStatus.SUBMITTED)
                .stream()
                .map(this::toScoreRow)
                .toList();
    }

    private AssessmentResponse toTemplateResponse(User user, EmployeeProfile profile, AssessmentFormDefinition form) {
        return AssessmentResponse.builder()
                .id(null)
                .formId(form.getId())
                .assessmentFormId(form.getId())
                .formName(form.getFormName())
                .companyName(form.getCompanyName())
                .userId(user.getId())
                .employeeId(profile.employeeId())
                .employeeName(profile.employeeName())
                .employeeCode(profile.employeeCode())
                .currentPosition(profile.currentPosition())
                .departmentId(profile.departmentId())
                .departmentName(profile.departmentName())
                .assessmentDate(LocalDate.now())
                .managerName(profile.managerName())
                .period(String.valueOf(LocalDateTime.now().getYear()))
                .status(AssessmentStatus.DRAFT.name())
                .totalScore(0.0)
                .maxScore(0.0)
                .scorePercent(0.0)
                .performanceLabel("Not scored")
                .remarks("")
                .managerComment("")
                .sections(templateSectionsFromForm(form))
                .scoreBands(scoreBandsFromForm(form))
                .build();
    }

    private EmployeeAssessment createNewAssessment(User user, AssessmentFormDefinition form) {
        EmployeeProfile profile = resolveProfile(user);

        return EmployeeAssessment.builder()
                .userId(user.getId())
                .employeeId(profile.employeeId())
                .employeeName(profile.employeeName())
                .employeeCode(profile.employeeCode())
                .currentPosition(profile.currentPosition())
                .departmentId(profile.departmentId())
                .departmentName(profile.departmentName())
                .assessmentFormId(form.getId())
                .formName(form.getFormName())
                .companyName(form.getCompanyName())
                .managerName(profile.managerName())
                .assessmentDate(LocalDate.now())
                .status(AssessmentStatus.DRAFT)
                .period(String.valueOf(LocalDateTime.now().getYear()))
                .totalScore(0.0)
                .maxScore(0.0)
                .scorePercent(0.0)
                .performanceLabel("Not scored")
                .answers(new ArrayList<>())
                .build();
    }

    private void applyRequest(
            EmployeeAssessment assessment,
            AssessmentRequest request,
            AssessmentStatus status,
            AssessmentFormDefinition form
    ) {
        if (request == null) {
            throw new BadRequestException("Assessment request body is required.");
        }

        String period = normalizeOptional(request.getPeriod());

        assessment.setAssessmentFormId(form.getId());
        assessment.setFormName(form.getFormName());
        assessment.setCompanyName(form.getCompanyName());
        assessment.setPeriod(period == null ? String.valueOf(LocalDateTime.now().getYear()) : period);
        assessment.setRemarks(normalizeOptional(request.getRemarks()));
        assessment.setStatus(status);

        Map<Integer, AssessmentItemRequest> itemsByQuestionId = request.getItems() == null
                ? Map.of()
                : request.getItems()
                .stream()
                .filter(Objects::nonNull)
                .filter(item -> item.getQuestionId() != null)
                .collect(Collectors.toMap(
                        AssessmentItemRequest::getQuestionId,
                        Function.identity(),
                        (first, ignored) -> first
                ));

        Map<String, AssessmentItemRequest> itemsByStableKey = request.getItems() == null
                ? Map.of()
                : request.getItems()
                .stream()
                .filter(Objects::nonNull)
                .collect(Collectors.toMap(
                        item -> stableItemKey(item.getSectionTitle(), item.getQuestionText(), item.getItemOrder()),
                        Function.identity(),
                        (first, ignored) -> first
                ));

        assessment.getAnswers().clear();

        int order = 1;

        for (AssessmentFormSectionDefinition section : sortedSections(form)) {
            String sectionTitle = normalizeRequired(section.getTitle(), "Section title is required.");

            for (AssessmentFormQuestionDefinition question : safeQuestions(section)) {
                String questionText = normalizeRequired(question.getQuestionText(), "Question text is required.");
                String responseType = resolveResponseType(question.getResponseType());
                AssessmentItemRequest submittedItem = itemsByQuestionId.get(question.getId());

                if (submittedItem == null) {
                    submittedItem = itemsByStableKey.get(stableItemKey(sectionTitle, questionText, order));
                }

                EmployeeAssessmentAnswer answer = buildAnswer(
                        sectionTitle,
                        question,
                        questionText,
                        responseType,
                        submittedItem,
                        order
                );

                assessment.addAnswer(answer);
                order++;
            }
        }

        if (assessment.getAnswers().isEmpty()) {
            throw new BadRequestException("The selected HR assessment form has no assessment subjects.");
        }
    }

    private EmployeeAssessmentAnswer buildAnswer(
            String sectionTitle,
            AssessmentFormQuestionDefinition question,
            String questionText,
            String responseType,
            AssessmentItemRequest submittedItem,
            int order
    ) {
        Integer rating = null;
        Boolean yesNoAnswer = null;
        String comment = null;

        if (submittedItem != null) {
            comment = normalizeOptional(submittedItem.getComment());

            if (RESPONSE_TYPE_RATING.equals(responseType) || RESPONSE_TYPE_YES_NO_RATING.equals(responseType)) {
                rating = submittedItem.getRating();

                if (rating != null && (rating < 1 || rating > MAX_RATING)) {
                    throw new BadRequestException("Ratings must be between 1 and 5.");
                }
            }

            if (RESPONSE_TYPE_YES_NO.equals(responseType) || RESPONSE_TYPE_YES_NO_RATING.equals(responseType)) {
                yesNoAnswer = submittedItem.getYesNoAnswer();
            }
        }

        return EmployeeAssessmentAnswer.builder()
                .questionId(question.getId())
                .sectionTitle(sectionTitle)
                .questionText(questionText)
                .itemOrder(order)
                .responseType(responseType)
                .required(question.getRequired() == null || question.getRequired())
                .weight(normalizeWeight(question.getWeight()))
                .rating(rating)
                .maxRating(MAX_RATING)
                .comment(comment)
                .yesNoAnswer(yesNoAnswer)
                .build();
    }

    private void validateComplete(EmployeeAssessment assessment) {
        for (EmployeeAssessmentAnswer answer : assessment.getAnswers()) {
            if (!Boolean.TRUE.equals(answer.getRequired())) {
                continue;
            }

            String responseType = resolveResponseType(answer.getResponseType());

            if (RESPONSE_TYPE_TEXT.equals(responseType) && normalizeOptional(answer.getComment()) == null) {
                throw new BadRequestException("Please answer every required text question before submitting.");
            }

            if ((RESPONSE_TYPE_YES_NO.equals(responseType) || RESPONSE_TYPE_YES_NO_RATING.equals(responseType))
                    && answer.getYesNoAnswer() == null) {
                throw new BadRequestException("Please choose Yes or No for every required assessment subject.");
            }

            if ((RESPONSE_TYPE_RATING.equals(responseType) || RESPONSE_TYPE_YES_NO_RATING.equals(responseType))
                    && answer.getRating() == null) {
                throw new BadRequestException("Please rate every required assessment subject before submitting.");
            }
        }
    }

    private void calculateScores(EmployeeAssessment assessment, AssessmentFormDefinition form) {
        List<EmployeeAssessmentAnswer> scoredAnswers = assessment.getAnswers()
                .stream()
                .filter(answer -> {
                    String responseType = resolveResponseType(answer.getResponseType());
                    return RESPONSE_TYPE_RATING.equals(responseType) || RESPONSE_TYPE_YES_NO_RATING.equals(responseType);
                })
                .filter(answer -> answer.getRating() != null)
                .toList();

        double total = scoredAnswers.stream()
                .mapToDouble(answer -> answer.getRating() * normalizeWeight(answer.getWeight()))
                .sum();

        double max = scoredAnswers.stream()
                .mapToDouble(answer -> MAX_RATING * normalizeWeight(answer.getWeight()))
                .sum();

        double percent = max == 0 ? 0.0 : round2((total * 100.0) / max);

        assessment.setTotalScore(round2(total));
        assessment.setMaxScore(round2(max));
        assessment.setScorePercent(percent);
        assessment.setPerformanceLabel(resolvePerformanceLabel(percent, form));
    }

    private String resolvePerformanceLabel(double percent, AssessmentFormDefinition form) {
        List<AssessmentFormScoreBandDefinition> bands = form.getScoreBands();

        if (bands != null && !bands.isEmpty()) {
            return bands.stream()
                    .filter(band -> percent >= band.getMinScore() && percent <= band.getMaxScore())
                    .sorted(Comparator.comparing(
                            AssessmentFormScoreBandDefinition::getSortOrder,
                            Comparator.nullsLast(Integer::compareTo)
                    ))
                    .map(AssessmentFormScoreBandDefinition::getLabel)
                    .findFirst()
                    .orElse("Not scored");
        }

        if (percent >= 86) return "Outstanding";
        if (percent >= 71) return "Good";
        if (percent >= 60) return "Meet Requirement";
        if (percent >= 40) return "Need Improvement";
        return "Unsatisfactory";
    }

    private AssessmentResponse toResponse(EmployeeAssessment assessment) {
        AssessmentFormDefinition form = null;

        if (assessment.getAssessmentFormId() != null) {
            form = formRepository.findById(assessment.getAssessmentFormId()).orElse(null);
        }

        return AssessmentResponse.builder()
                .id(assessment.getId())
                .formId(assessment.getAssessmentFormId())
                .assessmentFormId(assessment.getAssessmentFormId())
                .formName(assessment.getFormName())
                .companyName(assessment.getCompanyName())
                .userId(assessment.getUserId())
                .employeeId(assessment.getEmployeeId())
                .employeeName(assessment.getEmployeeName())
                .employeeCode(assessment.getEmployeeCode())
                .currentPosition(assessment.getCurrentPosition())
                .departmentId(assessment.getDepartmentId())
                .departmentName(assessment.getDepartmentName())
                .assessmentDate(assessment.getAssessmentDate())
                .managerName(assessment.getManagerName())
                .period(assessment.getPeriod())
                .status(assessment.getStatus() == null ? null : assessment.getStatus().name())
                .totalScore(nullToZero(assessment.getTotalScore()))
                .maxScore(nullToZero(assessment.getMaxScore()))
                .scorePercent(nullToZero(assessment.getScorePercent()))
                .performanceLabel(assessment.getPerformanceLabel())
                .remarks(assessment.getRemarks())
                .managerComment(assessment.getManagerComment())
                .createdAt(assessment.getCreatedAt())
                .updatedAt(assessment.getUpdatedAt())
                .submittedAt(assessment.getSubmittedAt())
                .sections(groupSections(assessment.getAnswers()))
                .scoreBands(form == null ? defaultScoreBands() : scoreBandsFromForm(form))
                .build();
    }

    private ScoreTableRowResponse toScoreRow(EmployeeAssessment assessment) {
        return ScoreTableRowResponse.builder()
                .id(assessment.getId())
                .formId(assessment.getAssessmentFormId())
                .assessmentFormId(assessment.getAssessmentFormId())
                .formName(assessment.getFormName())
                .employeeId(assessment.getEmployeeId())
                .employeeName(assessment.getEmployeeName())
                .employeeCode(assessment.getEmployeeCode())
                .departmentName(assessment.getDepartmentName())
                .period(assessment.getPeriod())
                .status(assessment.getStatus() == null ? null : assessment.getStatus().name())
                .totalScore(nullToZero(assessment.getTotalScore()))
                .maxScore(nullToZero(assessment.getMaxScore()))
                .scorePercent(nullToZero(assessment.getScorePercent()))
                .performanceLabel(assessment.getPerformanceLabel())
                .submittedAt(assessment.getSubmittedAt())
                .build();
    }

    private List<AssessmentSectionResponse> templateSectionsFromForm(AssessmentFormDefinition form) {
        List<AssessmentSectionResponse> sections = new ArrayList<>();
        int itemOrder = 1;

        for (AssessmentFormSectionDefinition section : sortedSections(form)) {
            List<AssessmentItemResponse> items = new ArrayList<>();

            for (AssessmentFormQuestionDefinition question : safeQuestions(section)) {
                items.add(templateItem(section, question, itemOrder));
                itemOrder++;
            }

            sections.add(AssessmentSectionResponse.builder()
                    .id(section.getId())
                    .title(section.getTitle())
                    .orderNo(section.getOrderNo())
                    .items(items)
                    .build());
        }

        return sections;
    }

    private AssessmentItemResponse templateItem(
            AssessmentFormSectionDefinition section,
            AssessmentFormQuestionDefinition question,
            int itemOrder
    ) {
        return AssessmentItemResponse.builder()
                .id(null)
                .questionId(question.getId())
                .sectionTitle(section.getTitle())
                .questionText(question.getQuestionText())
                .itemOrder(itemOrder)
                .responseType(resolveResponseType(question.getResponseType()))
                .isRequired(question.getRequired() == null || question.getRequired())
                .weight(normalizeWeight(question.getWeight()))
                .rating(null)
                .maxRating(MAX_RATING)
                .comment("")
                .yesNoAnswer(null)
                .build();
    }

    private List<AssessmentSectionResponse> groupSections(List<EmployeeAssessmentAnswer> answers) {
        Map<String, List<AssessmentItemResponse>> grouped = new LinkedHashMap<>();

        answers.stream()
                .sorted(Comparator.comparing(
                        EmployeeAssessmentAnswer::getItemOrder,
                        Comparator.nullsLast(Integer::compareTo)
                ))
                .forEach(answer -> grouped.computeIfAbsent(answer.getSectionTitle(), ignored -> new ArrayList<>())
                        .add(AssessmentItemResponse.builder()
                                .id(answer.getId())
                                .questionId(answer.getQuestionId())
                                .sectionTitle(answer.getSectionTitle())
                                .questionText(answer.getQuestionText())
                                .itemOrder(answer.getItemOrder())
                                .responseType(resolveResponseType(answer.getResponseType()))
                                .isRequired(answer.getRequired() == null || answer.getRequired())
                                .weight(normalizeWeight(answer.getWeight()))
                                .rating(answer.getRating())
                                .maxRating(answer.getMaxRating() == null ? MAX_RATING : answer.getMaxRating())
                                .comment(answer.getComment())
                                .yesNoAnswer(answer.getYesNoAnswer())
                                .build()));

        int sectionOrder = 1;
        List<AssessmentSectionResponse> sections = new ArrayList<>();

        for (Map.Entry<String, List<AssessmentItemResponse>> entry : grouped.entrySet()) {
            sections.add(AssessmentSectionResponse.builder()
                    .id(null)
                    .title(entry.getKey())
                    .orderNo(sectionOrder++)
                    .items(entry.getValue())
                    .build());
        }

        return sections;
    }

    private AssessmentFormDefinition findAssignedActiveFormForCurrentUser() {
        UserPrincipal principal = SecurityUtils.currentUser();
        Set<String> currentRoles = currentUserTargetRoles(principal);
        LocalDate today = LocalDate.now();

        return formRepository
                .findByActiveTrueAndStartDateLessThanEqualAndEndDateGreaterThanEqualOrderByCreatedAtDesc(today, today)
                .stream()
                .filter(form -> formTargetsCurrentUser(form, currentRoles))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException(
                        "No active self-assessment form is available for your role. Please contact HR."
                ));
    }

    private boolean formTargetsCurrentUser(AssessmentFormDefinition form, Set<String> currentRoles) {
        if (form.getTargetRoles() == null || form.getTargetRoles().isEmpty()) {
            return false;
        }

        return form.getTargetRoles()
                .stream()
                .map(this::canonicalRole)
                .anyMatch(currentRoles::contains);
    }

    private Set<String> currentUserTargetRoles(UserPrincipal principal) {
        Set<String> roles = new LinkedHashSet<>();

        if (principal.getRoles() != null) {
            principal.getRoles()
                    .stream()
                    .map(this::canonicalRole)
                    .filter(role -> !role.isBlank())
                    .forEach(roles::add);
        }

        String dashboardRole = roleFromDashboard(principal.getDashboard());

        if (dashboardRole != null) {
            roles.add(dashboardRole);
        }

        return roles;
    }

    private String canonicalRole(String value) {
        if (value == null) {
            return "";
        }

        String normalized = value
                .replaceFirst("(?i)^ROLE_", "")
                .trim()
                .replaceAll("([a-z])([A-Z])", "$1_$2")
                .replaceAll("[^A-Za-z0-9]+", "_")
                .replaceAll("^_+|_+$", "")
                .toUpperCase(Locale.ROOT);

        if (normalized.equals("DEPARTMENTHEAD")) {
            return "DEPARTMENT_HEAD";
        }

        return normalized;
    }

    private String roleFromDashboard(String dashboard) {
        if (dashboard == null || dashboard.isBlank()) {
            return null;
        }

        return switch (dashboard) {
            case "ADMIN_DASHBOARD" -> "ADMIN";
            case "HR_DASHBOARD" -> "HR";
            case "MANAGER_DASHBOARD" -> "MANAGER";
            case "DEPARTMENT_HEAD_DASHBOARD" -> "DEPARTMENT_HEAD";
            case "EXECUTIVE_DASHBOARD" -> "EXECUTIVE";
            case "EMPLOYEE_DASHBOARD" -> "EMPLOYEE";
            default -> null;
        };
    }

    private void validateRequestFormMatchesAssignedForm(AssessmentRequest request, AssessmentFormDefinition form) {
        if (request == null) {
            throw new BadRequestException("Assessment request body is required.");
        }

        Integer requestFormId = request.getAssessmentFormId() != null
                ? request.getAssessmentFormId()
                : request.getFormId();

        if (requestFormId != null && !Objects.equals(requestFormId, form.getId())) {
            throw new BadRequestException("This self-assessment form is not assigned to your role.");
        }
    }

    private void validateAssessmentBelongsToAssignedForm(EmployeeAssessment assessment, AssessmentFormDefinition form) {
        if (assessment.getAssessmentFormId() == null) {
            throw new BadRequestException("This old draft was created before HR form targeting was enabled. Please create a new draft.");
        }

        if (!Objects.equals(assessment.getAssessmentFormId(), form.getId())) {
            throw new BadRequestException("This draft does not belong to the active HR self-assessment form assigned to your role.");
        }
    }

    private List<AssessmentFormSectionDefinition> sortedSections(AssessmentFormDefinition form) {
        if (form.getSections() == null) {
            return List.of();
        }

        return form.getSections()
                .stream()
                .sorted(Comparator.comparing(
                        AssessmentFormSectionDefinition::getOrderNo,
                        Comparator.nullsLast(Integer::compareTo)
                ))
                .toList();
    }

    private List<AssessmentFormQuestionDefinition> safeQuestions(AssessmentFormSectionDefinition section) {
        return section.getQuestions() == null ? List.of() : section.getQuestions();
    }

    private List<AssessmentScoreBandResponse> scoreBandsFromForm(AssessmentFormDefinition form) {
        if (form.getScoreBands() == null || form.getScoreBands().isEmpty()) {
            return defaultScoreBands();
        }

        return form.getScoreBands()
                .stream()
                .sorted(Comparator.comparing(
                        AssessmentFormScoreBandDefinition::getSortOrder,
                        Comparator.nullsLast(Integer::compareTo)
                ))
                .map(band -> AssessmentScoreBandResponse.builder()
                        .id(band.getId())
                        .minScore(band.getMinScore())
                        .maxScore(band.getMaxScore())
                        .label(band.getLabel())
                        .description(band.getDescription())
                        .sortOrder(band.getSortOrder())
                        .build())
                .toList();
    }

    private List<AssessmentScoreBandResponse> defaultScoreBands() {
        return List.of(
                AssessmentScoreBandResponse.builder()
                        .minScore(86)
                        .maxScore(100)
                        .label("Outstanding")
                        .description("Performance exceptional and far exceeds expectations. Consistently demonstrates excellent standards in all job requirements.")
                        .sortOrder(1)
                        .build(),
                AssessmentScoreBandResponse.builder()
                        .minScore(71)
                        .maxScore(85)
                        .label("Good")
                        .description("Performance is consistent. Clearly meets essential requirements of job.")
                        .sortOrder(2)
                        .build(),
                AssessmentScoreBandResponse.builder()
                        .minScore(60)
                        .maxScore(70)
                        .label("Meet Requirement")
                        .description("Performance is satisfactory. Meets requirements of the job.")
                        .sortOrder(3)
                        .build(),
                AssessmentScoreBandResponse.builder()
                        .minScore(40)
                        .maxScore(59)
                        .label("Need Improvement")
                        .description("Performance is inconsistent. Meets requirements of the job occasionally. Supervision and training is required for most problem areas.")
                        .sortOrder(4)
                        .build(),
                AssessmentScoreBandResponse.builder()
                        .minScore(0)
                        .maxScore(39)
                        .label("Unsatisfactory")
                        .description("Performance does not meet the minimum requirement of the job.")
                        .sortOrder(5)
                        .build()
        );
    }

    private EmployeeAssessment findAssessment(Long id) {
        return assessmentRepository
                .findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Assessment not found."));
    }

    private User currentUserEntity() {
        Integer userId = SecurityUtils.currentUserId();

        return userRepository
                .findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found."));
    }

    private EmployeeProfile resolveProfile(User user) {
        Optional<Employee> employee = user.getEmployeeId() == null
                ? Optional.empty()
                : employeeRepository.findById(user.getEmployeeId());

        String employeeName = normalizeOptional(user.getFullName());

        if (employeeName == null && employee.isPresent()) {
            String firstName = normalizeOptional(employee.get().getFirstName());
            String lastName = normalizeOptional(employee.get().getLastName());

            employeeName = String.join(
                    " ",
                    List.of(firstName == null ? "" : firstName, lastName == null ? "" : lastName)
            ).trim();
        }

        if (employeeName == null || employeeName.isBlank()) {
            employeeName = user.getEmail();
        }

        String currentPosition = user.getPosition() == null
                ? null
                : user.getPosition().getPositionTitle();

        if (currentPosition == null && employee.isPresent() && employee.get().getPosition() != null) {
            currentPosition = employee.get().getPosition().getPositionTitle();
        }

        Integer departmentId = user.getDepartmentId();
        String departmentName = null;

        if (departmentId != null) {
            departmentName = departmentRepository
                    .findById(departmentId)
                    .map(Department::getDepartmentName)
                    .orElse(null);
        }

        String managerName = null;

        if (user.getManagerId() != null) {
            managerName = userRepository
                    .findById(user.getManagerId())
                    .map(User::getFullName)
                    .orElse(null);
        }

        return new EmployeeProfile(
                user.getEmployeeId(),
                employeeName,
                normalizeOptional(user.getEmployeeCode()),
                normalizeOptional(currentPosition),
                departmentId,
                departmentName,
                normalizeOptional(managerName)
        );
    }

    private void assertCanView(EmployeeAssessment assessment) {
        UserPrincipal principal = SecurityUtils.currentUser();

        if (assessment.getUserId().equals(principal.getId()) || canViewScoreTable(principal)) {
            return;
        }

        throw new UnauthorizedActionException("You do not have permission to view this assessment.");
    }

    private void assertOwner(EmployeeAssessment assessment) {
        Integer userId = SecurityUtils.currentUserId();

        if (!assessment.getUserId().equals(userId)) {
            throw new UnauthorizedActionException("You can update only your own assessment.");
        }
    }

    private void ensureEditable(EmployeeAssessment assessment) {
        if (AssessmentStatus.SUBMITTED.equals(assessment.getStatus())) {
            throw new BadRequestException("Submitted assessments cannot be edited.");
        }
    }

    private boolean canViewScoreTable(UserPrincipal principal) {
        return currentUserTargetRoles(principal)
                .stream()
                .anyMatch(role -> role.equals("HR")
                        || role.equals("ADMIN")
                        || role.equals("MANAGER")
                        || role.equals("DEPARTMENT_HEAD"));
    }

    private String resolveResponseType(String responseType) {
        String normalized = responseType == null || responseType.isBlank()
                ? RESPONSE_TYPE_YES_NO_RATING
                : responseType.trim().toUpperCase(Locale.ROOT);

        if (!normalized.equals(RESPONSE_TYPE_RATING)
                && !normalized.equals(RESPONSE_TYPE_TEXT)
                && !normalized.equals(RESPONSE_TYPE_YES_NO)
                && !normalized.equals(RESPONSE_TYPE_YES_NO_RATING)) {
            return RESPONSE_TYPE_YES_NO_RATING;
        }

        return normalized;
    }

    private Double normalizeWeight(Double weight) {
        if (weight == null || weight < 1) {
            return 1.0;
        }

        return weight;
    }

    private String normalizeRequired(String value, String message) {
        String normalized = normalizeOptional(value);

        if (normalized == null) {
            throw new BadRequestException(message);
        }

        return normalized;
    }

    private String normalizeOptional(String value) {
        if (value == null) {
            return null;
        }

        String normalized = value.trim();

        return normalized.isEmpty() ? null : normalized;
    }

    private String stableItemKey(String sectionTitle, String questionText, Integer itemOrder) {
        return String.join("|",
                normalizeOptional(sectionTitle) == null ? "" : normalizeOptional(sectionTitle).toLowerCase(Locale.ROOT),
                normalizeOptional(questionText) == null ? "" : normalizeOptional(questionText).toLowerCase(Locale.ROOT),
                itemOrder == null ? "" : itemOrder.toString()
        );
    }

    private double round2(double value) {
        return Math.round(value * 100.0) / 100.0;
    }

    private double nullToZero(Double value) {
        return value == null ? 0.0 : value;
    }

    private record EmployeeProfile(
            Integer employeeId,
            String employeeName,
            String employeeCode,
            String currentPosition,
            Integer departmentId,
            String departmentName,
            String managerName
    ) {
    }
}