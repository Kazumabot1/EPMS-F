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
                .filter(assignment -> assignment.getStatus() != AssignmentStatus.CANCELLED)
                .filter(assignment -> assignment.getFeedbackRequest().getCampaign().getStatus() != FeedbackCampaignStatus.CANCELLED)
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
                            .targetEmployeeId(targetEmployeeId)
                            .targetEmployeeName(targetNames.getOrDefault(targetEmployeeId, "Employee #" + targetEmployeeId))
                            .relationshipType(assignment.getRelationshipType().name())
                            .anonymous(Boolean.TRUE.equals(assignment.getIsAnonymous()))
                            .status(assignment.getStatus().name())
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

        FeedbackForm form = loadFormWithSectionsAndQuestions(
                assignment.getFeedbackRequest().getForm().getId()
        );
        FeedbackResponse response = feedbackResponseRepository.findByEvaluatorAssignmentId(assignmentId).orElse(null);
        Map<Long, FeedbackResponseItem> existingItems = response == null
                ? Map.of()
                : response.getItems().stream()
                  .collect(Collectors.toMap(item -> item.getQuestion().getId(), Function.identity()));

        Long targetEmployeeId = assignment.getFeedbackRequest().getTargetEmployeeId();
        return FeedbackAssignmentDetailResponse.builder()
                .assignmentId(assignment.getId())
                .campaignId(assignment.getFeedbackRequest().getCampaign().getId())
                .campaignName(assignment.getFeedbackRequest().getCampaign().getName())
                .targetEmployeeId(targetEmployeeId)
                .targetEmployeeName(loadEmployeeNames(List.of(targetEmployeeId))
                        .getOrDefault(targetEmployeeId, "Employee #" + targetEmployeeId))
                .relationshipType(assignment.getRelationshipType().name())
                .anonymous(Boolean.TRUE.equals(assignment.getIsAnonymous()))
                .status(assignment.getStatus().name())
                .dueAt(resolveEffectiveDeadline(assignment))
                .submittedAt(response != null ? response.getSubmittedAt() : null)
                .canSubmit(canSubmit(assignment, response))
                .comments(response != null ? response.getComments() : null)
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
