package com.epms.service.impl;

import com.epms.dto.FeedbackAssignmentDetailResponse;
import com.epms.dto.FeedbackAssignmentQuestionDetailResponse;
import com.epms.dto.FeedbackAssignmentSectionDetailResponse;
import com.epms.dto.FeedbackEvaluatorTaskResponse;
import com.epms.entity.Employee;
import com.epms.entity.FeedbackEvaluatorAssignment;
import com.epms.entity.FeedbackForm;
import com.epms.entity.FeedbackQuestion;
import com.epms.entity.FeedbackResponse;
import com.epms.entity.FeedbackResponseItem;
import com.epms.entity.FeedbackSection;
import com.epms.entity.User;
import com.epms.entity.enums.AssignmentStatus;
import com.epms.entity.enums.FeedbackCampaignStatus;
import com.epms.entity.enums.FeedbackRequestStatus;
import com.epms.exception.BusinessValidationException;
import com.epms.exception.ResourceNotFoundException;
import com.epms.exception.UnauthorizedActionException;
import com.epms.repository.EmployeeRepository;
import com.epms.repository.FeedbackEvaluatorAssignmentRepository;
import com.epms.repository.FeedbackFormRepository;
import com.epms.repository.FeedbackResponseRepository;
import com.epms.repository.UserRepository;
import com.epms.service.FeedbackEvaluatorTaskService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class FeedbackEvaluatorTaskServiceImpl implements FeedbackEvaluatorTaskService {

    private final FeedbackEvaluatorAssignmentRepository assignmentRepository;
    private final FeedbackFormRepository feedbackFormRepository;
    private final FeedbackResponseRepository feedbackResponseRepository;
    private final UserRepository userRepository;
    private final EmployeeRepository employeeRepository;

    @Override
    @Transactional(readOnly = true)
    public List<FeedbackEvaluatorTaskResponse> getMyTasks(Long userId) {
        Long evaluatorEmployeeId = resolveEmployeeIdForUser(userId);
        List<FeedbackEvaluatorAssignment> assignments = assignmentRepository.findByEvaluatorEmployeeId(evaluatorEmployeeId);
        Map<Long, String> targetNames = loadEmployeeNames(
                assignments.stream()
                        .map(assignment -> assignment.getFeedbackRequest().getTargetEmployeeId())
                        .distinct()
                        .toList()
        );

        return assignments.stream()
                .filter(this::isVisibleInEvaluatorWorkspace)
                .sorted(Comparator
                        .comparing(this::resolveEffectiveDeadline, Comparator.nullsLast(Comparator.naturalOrder()))
                        .thenComparing(FeedbackEvaluatorAssignment::getId))
                .map(assignment -> {
                    FeedbackResponse response = assignment.getResponse();
                    Long targetEmployeeId = assignment.getFeedbackRequest().getTargetEmployeeId();
                    return FeedbackEvaluatorTaskResponse.builder()
                            .assignmentId(assignment.getId())
                            .campaignId(assignment.getFeedbackRequest().getCampaign().getId())
                            .campaignName(assignment.getFeedbackRequest().getCampaign().getName())
                            .campaignStatus(assignment.getFeedbackRequest().getCampaign().getStatus().name())
                            .campaignStartAt(assignment.getFeedbackRequest().getCampaign().getStartAt())
                            .targetEmployeeId(targetEmployeeId)
                            .targetEmployeeName(targetNames.getOrDefault(targetEmployeeId, "Employee #" + targetEmployeeId))
                            .relationshipType(assignment.getRelationshipType().name())
                            .anonymous(Boolean.TRUE.equals(assignment.getIsAnonymous()))
                            .status(assignment.getStatus().name())
                            .canSubmit(canSubmit(assignment, response))
                            .lifecycleMessage(lifecycleMessage(assignment, response))
                            .dueAt(resolveEffectiveDeadline(assignment))
                            .submittedAt(response != null ? response.getSubmittedAt() : null)
                            .build();
                })
                .toList();
    }

    private FeedbackForm loadFormWithSectionsAndQuestions(Long formId) {
        FeedbackForm form = feedbackFormRepository.findByIdWithSections(formId)
                .orElseThrow(() -> new ResourceNotFoundException("Assigned feedback form not found."));

        List<FeedbackSection> sections =
                feedbackFormRepository.findSectionsWithQuestionsByFormId(formId);

        form.setSections(sections);

        return form;
    }

    @Override
    @Transactional(readOnly = true)
    public FeedbackAssignmentDetailResponse getAssignmentDetail(Long assignmentId, Long userId) {
        FeedbackEvaluatorAssignment assignment = assignmentRepository.findById(assignmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Feedback assignment not found."));

        Long evaluatorEmployeeId = resolveEmployeeIdForUser(userId);
        if (!Objects.equals(assignment.getEvaluatorEmployeeId(), evaluatorEmployeeId)) {
            throw new UnauthorizedActionException("You are not authorized to access this feedback assignment.");
        }

        FeedbackResponse response = feedbackResponseRepository.findByEvaluatorAssignmentId(assignmentId).orElse(null);
        ensureAssignmentVisibleToEvaluator(assignment, response);

        FeedbackForm form = loadFormWithSectionsAndQuestions(
                assignment.getFeedbackRequest().getForm().getId()
        );
        Map<Long, FeedbackResponseItem> existingItems = response == null
                ? Map.of()
                : response.getItems().stream()
                  .collect(Collectors.toMap(item -> item.getQuestion().getId(), Function.identity()));

        int totalQuestionCount = form.getSections().stream()
                .mapToInt(section -> section.getQuestions() == null ? 0 : section.getQuestions().size())
                .sum();
        int requiredQuestionCount = form.getSections().stream()
                .flatMap(section -> section.getQuestions() == null ? java.util.stream.Stream.<FeedbackQuestion>empty() : section.getQuestions().stream())
                .mapToInt(question -> Boolean.TRUE.equals(question.getIsRequired()) ? 1 : 0)
                .sum();
        int answeredQuestionCount = (int) existingItems.values().stream()
                .filter(item -> item.getRatingValue() != null)
                .count();
        int answeredRequiredQuestionCount = (int) form.getSections().stream()
                .flatMap(section -> section.getQuestions() == null ? java.util.stream.Stream.<FeedbackQuestion>empty() : section.getQuestions().stream())
                .filter(question -> Boolean.TRUE.equals(question.getIsRequired()))
                .filter(question -> {
                    FeedbackResponseItem item = existingItems.get(question.getId());
                    return item != null && item.getRatingValue() != null;
                })
                .count();
        int completionPercent = requiredQuestionCount == 0
                ? 100
                : Math.min(100, Math.round((answeredRequiredQuestionCount * 100.0f) / requiredQuestionCount));
        boolean submittedLocked = response != null && response.getSubmittedAt() != null;
        boolean finalSubmissionReady = !submittedLocked
                && canSubmit(assignment, response)
                && answeredRequiredQuestionCount >= requiredQuestionCount;

        Long targetEmployeeId = assignment.getFeedbackRequest().getTargetEmployeeId();
        return FeedbackAssignmentDetailResponse.builder()
                .assignmentId(assignment.getId())
                .campaignId(assignment.getFeedbackRequest().getCampaign().getId())
                .campaignName(assignment.getFeedbackRequest().getCampaign().getName())
                .campaignStatus(assignment.getFeedbackRequest().getCampaign().getStatus().name())
                .campaignStartAt(assignment.getFeedbackRequest().getCampaign().getStartAt())
                .targetEmployeeId(targetEmployeeId)
                .targetEmployeeName(loadEmployeeNames(List.of(targetEmployeeId))
                        .getOrDefault(targetEmployeeId, "Employee #" + targetEmployeeId))
                .relationshipType(assignment.getRelationshipType().name())
                .anonymous(Boolean.TRUE.equals(assignment.getIsAnonymous()))
                .status(assignment.getStatus().name())
                .dueAt(resolveEffectiveDeadline(assignment))
                .submittedAt(response != null ? response.getSubmittedAt() : null)
                .canSubmit(canSubmit(assignment, response))
                .lifecycleMessage(lifecycleMessage(assignment, response))
                .comments(response != null ? response.getComments() : null)
                .totalQuestionCount(totalQuestionCount)
                .requiredQuestionCount(requiredQuestionCount)
                .answeredQuestionCount(answeredQuestionCount)
                .answeredRequiredQuestionCount(answeredRequiredQuestionCount)
                .completionPercent(completionPercent)
                .finalSubmissionReady(finalSubmissionReady)
                .submittedLocked(submittedLocked)
                .sections(form.getSections().stream()
                        .sorted(Comparator.comparing(FeedbackSection::getOrderNo))
                        .map(section -> mapSection(section, existingItems))
                        .toList())
                .build();
    }

    private FeedbackAssignmentSectionDetailResponse mapSection(
            FeedbackSection section,
            Map<Long, FeedbackResponseItem> existingItems
    ) {
        return FeedbackAssignmentSectionDetailResponse.builder()
                .id(section.getId())
                .title(section.getTitle())
                .orderNo(section.getOrderNo())
                .questions(section.getQuestions().stream()
                        .sorted(Comparator.comparing(FeedbackQuestion::getQuestionOrder))
                        .map(question -> {
                            FeedbackResponseItem existingItem = existingItems.get(question.getId());
                            return FeedbackAssignmentQuestionDetailResponse.builder()
                                    .id(question.getId())
                                    .questionText(question.getQuestionText())
                                    .questionOrder(question.getQuestionOrder())
                                    .ratingScaleId(question.getRatingScaleId())
                                    .weight(question.getWeight())
                                    .required(Boolean.TRUE.equals(question.getIsRequired()))
                                    .existingRatingValue(existingItem != null ? existingItem.getRatingValue() : null)
                                    .existingComment(existingItem != null ? existingItem.getComment() : null)
                                    .build();
                        })
                        .toList())
                .build();
    }


    private boolean isVisibleInEvaluatorWorkspace(FeedbackEvaluatorAssignment assignment) {
        FeedbackCampaignStatus campaignStatus = assignment.getFeedbackRequest().getCampaign().getStatus();
        if (campaignStatus == FeedbackCampaignStatus.CANCELLED || campaignStatus == FeedbackCampaignStatus.DRAFT) {
            return false;
        }
        if (assignment.getStatus() == AssignmentStatus.CANCELLED) {
            return false;
        }
        if (campaignStatus == FeedbackCampaignStatus.ACTIVE) {
            return true;
        }
        return assignment.getStatus() == AssignmentStatus.SUBMITTED || assignment.getResponse() != null;
    }

    private void ensureAssignmentVisibleToEvaluator(FeedbackEvaluatorAssignment assignment, FeedbackResponse response) {
        FeedbackCampaignStatus campaignStatus = assignment.getFeedbackRequest().getCampaign().getStatus();
        if (campaignStatus == FeedbackCampaignStatus.DRAFT) {
            throw new BusinessValidationException("This feedback assignment is not available until HR activates the campaign.");
        }
        if (campaignStatus == FeedbackCampaignStatus.CANCELLED) {
            throw new BusinessValidationException("This feedback campaign was cancelled.");
        }
        if (assignment.getStatus() == AssignmentStatus.CANCELLED) {
            throw new BusinessValidationException("This evaluator assignment was cancelled.");
        }
        if (campaignStatus == FeedbackCampaignStatus.CLOSED
                && assignment.getStatus() != AssignmentStatus.SUBMITTED
                && response == null) {
            throw new BusinessValidationException("This campaign is closed and this assignment was not submitted before the deadline.");
        }
    }

    private boolean canSubmit(FeedbackEvaluatorAssignment assignment, FeedbackResponse response) {
        if (response != null && response.getSubmittedAt() != null) {
            return false;
        }
        if (assignment.getStatus() == AssignmentStatus.CANCELLED) {
            return false;
        }
        if (assignment.getFeedbackRequest().getStatus() == FeedbackRequestStatus.CANCELLED) {
            return false;
        }
        if (assignment.getFeedbackRequest().getCampaign().getStatus() != FeedbackCampaignStatus.ACTIVE) {
            return false;
        }
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime startAt = assignment.getFeedbackRequest().getCampaign().getStartAt();
        if (startAt != null && now.isBefore(startAt)) {
            return false;
        }
        LocalDateTime dueAt = resolveEffectiveDeadline(assignment);
        return dueAt == null || !now.isAfter(dueAt);
    }


    private String lifecycleMessage(FeedbackEvaluatorAssignment assignment, FeedbackResponse response) {
        if (response != null && response.getSubmittedAt() != null) {
            return "Submitted feedback is locked and can only be viewed.";
        }
        if (assignment.getStatus() == AssignmentStatus.CANCELLED) {
            return "This evaluator assignment was cancelled.";
        }
        if (assignment.getFeedbackRequest().getStatus() == FeedbackRequestStatus.CANCELLED) {
            return "This feedback request was cancelled.";
        }

        FeedbackCampaignStatus campaignStatus = assignment.getFeedbackRequest().getCampaign().getStatus();
        if (campaignStatus == FeedbackCampaignStatus.DRAFT) {
            return "This campaign is still in HR setup and is not open to evaluators yet.";
        }
        if (campaignStatus == FeedbackCampaignStatus.CLOSED) {
            return "This campaign is closed. Feedback can no longer be edited or submitted.";
        }
        if (campaignStatus == FeedbackCampaignStatus.CANCELLED) {
            return "This campaign was cancelled.";
        }

        LocalDateTime now = LocalDateTime.now();
        LocalDateTime startAt = assignment.getFeedbackRequest().getCampaign().getStartAt();
        if (startAt != null && now.isBefore(startAt)) {
            return "This campaign is active but the submission window has not started yet.";
        }
        LocalDateTime dueAt = resolveEffectiveDeadline(assignment);
        if (dueAt != null && now.isAfter(dueAt)) {
            return "The feedback submission deadline has passed.";
        }
        return "Open for draft saving and final submission.";
    }

    private Map<Long, String> loadEmployeeNames(List<Long> employeeIds) {
        if (employeeIds.isEmpty()) {
            return Map.of();
        }

        Map<Long, String> employeeNames = employeeRepository.findAllById(
                        employeeIds.stream().map(Long::intValue).toList())
                .stream()
                .collect(Collectors.toMap(
                        employee -> employee.getId().longValue(),
                        this::toEmployeeName
                ));

        if (employeeNames.size() == employeeIds.size()) {
            return employeeNames;
        }

        for (Long employeeId : employeeIds) {
            employeeNames.computeIfAbsent(employeeId, id -> userRepository.findByEmployeeId(id.intValue())
                    .map(User::getFullName)
                    .filter(name -> name != null && !name.isBlank())
                    .orElse("Employee #" + id));
        }

        return employeeNames;
    }

    private String toEmployeeName(Employee employee) {
        String fullName = ((employee.getFirstName() != null ? employee.getFirstName() : "") + " "
                + (employee.getLastName() != null ? employee.getLastName() : "")).trim();
        return fullName.isBlank() ? "Employee #" + employee.getId() : fullName;
    }

    private Long resolveEmployeeIdForUser(Long userId) {
        User user = userRepository.findById(userId.intValue())
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));
        if (user.getEmployeeId() == null) {
            throw new BusinessValidationException("This user is not linked to an employee record.");
        }
        return user.getEmployeeId().longValue();
    }

    private LocalDateTime resolveEffectiveDeadline(FeedbackEvaluatorAssignment assignment) {
        return assignment.getFeedbackRequest().getCampaign().getEndAt();
    }
}
