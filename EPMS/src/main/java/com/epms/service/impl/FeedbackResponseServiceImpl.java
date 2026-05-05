package com.epms.service.impl;

import com.epms.dto.FeedbackReceivedItemResponse;
import com.epms.dto.FeedbackSubmissionStatusResponse;
import com.epms.entity.FeedbackEvaluatorAssignment;
import com.epms.entity.FeedbackQuestion;
import com.epms.entity.FeedbackResponse;
import com.epms.entity.FeedbackResponseItem;
import com.epms.entity.FeedbackSection;
import com.epms.entity.User;
import com.epms.entity.enums.AssignmentStatus;
import com.epms.entity.enums.FeedbackCampaignStatus;
import com.epms.entity.enums.FeedbackRequestStatus;
import com.epms.entity.enums.ResponseStatus;
import com.epms.exception.BusinessValidationException;
import com.epms.exception.ResourceNotFoundException;
import com.epms.exception.UnauthorizedActionException;
import com.epms.repository.FeedbackEvaluatorAssignmentRepository;
import com.epms.repository.FeedbackFormRepository;
import com.epms.repository.FeedbackQuestionRepository;
import com.epms.repository.FeedbackRequestRepository;
import com.epms.repository.FeedbackResponseRepository;
import com.epms.repository.RatingScaleRepository;
import com.epms.repository.UserRepository;
import com.epms.service.AuditLogService;
import com.epms.service.FeedbackResponseService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Slf4j
@Service
@RequiredArgsConstructor
public class FeedbackResponseServiceImpl implements FeedbackResponseService {

    private final FeedbackResponseRepository responseRepository;
    private final FeedbackEvaluatorAssignmentRepository assignmentRepository;
    private final FeedbackRequestRepository feedbackRequestRepository;
    private final FeedbackFormRepository feedbackFormRepository;
    private final FeedbackQuestionRepository questionRepository;
    private final RatingScaleRepository ratingScaleRepository;
    private final UserRepository userRepository;
    private final AuditLogService auditLogService;

    @Override
    @Transactional
    public FeedbackResponse saveDraft(Long evaluatorAssignmentId, Long submittingUserId, String comments, List<FeedbackResponseItem> items) {
        FeedbackEvaluatorAssignment assignment = assignmentRepository.findById(evaluatorAssignmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Evaluator Assignment not found."));

        Long submittingEmployeeId = resolveEmployeeIdForUser(submittingUserId);
        if (!assignment.getEvaluatorEmployeeId().equals(submittingEmployeeId)) {
            throw new UnauthorizedActionException("You are not authorized to edit this feedback.");
        }

        ensureCampaignAcceptsFeedback(assignment, "saved as draft");

        LocalDateTime dueAt = resolveEffectiveDeadline(assignment);
        if (dueAt != null && LocalDateTime.now().isAfter(dueAt)) {
            throw new BusinessValidationException("Feedback editing deadline has passed.");
        }

        if (items == null || items.isEmpty()) {
            throw new BusinessValidationException("At least one response item is required.");
        }
        Map<Long, FeedbackQuestion> assignmentQuestions = loadAssignmentQuestions(assignment);
        validateDraftItems(items, assignmentQuestions);

        Optional<FeedbackResponse> existing = responseRepository.findByEvaluatorAssignmentId(evaluatorAssignmentId);
        FeedbackResponse response = existing.orElseGet(FeedbackResponse::new);
        if (existing.isPresent() && ResponseStatus.SUBMITTED.equals(response.getFinalStatus())) {
            throw new BusinessValidationException("Submitted feedback cannot be edited.");
        }

        Double overallScore = calculateOverallScore(items, assignmentQuestions);
        response.setEvaluatorAssignment(assignment);
        response.setOverallScore(overallScore);
        response.setComments(comments);
        response.setFinalStatus(ResponseStatus.DRAFT);
        response.setSubmittedAt(null);

        response.getItems().clear();
        items.forEach(item -> item.setResponse(response));
        response.getItems().addAll(items);

        FeedbackResponse saved = responseRepository.save(response);
        if (AssignmentStatus.PENDING.equals(assignment.getStatus())) {
            assignment.setStatus(AssignmentStatus.IN_PROGRESS);
            assignmentRepository.save(assignment);
        }
        markRequestInProgress(assignment);
        auditLogService.log(
                submittingUserId.intValue(),
                "SAVE_DRAFT",
                "FEEDBACK_RESPONSE",
                saved.getId().intValue(),
                null,
                "assignmentId=" + evaluatorAssignmentId + ",score=" + overallScore,
                "Feedback draft saved"
        );
        return saved;
    }

    @Override
    @Transactional
    public FeedbackResponse submitResponse(Long evaluatorAssignmentId, Long submittingUserId, String comments, List<FeedbackResponseItem> items) {
        log.info("Submitting Feedback Response for Assignment ID: {}", evaluatorAssignmentId);

        FeedbackEvaluatorAssignment assignment = assignmentRepository.findById(evaluatorAssignmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Evaluator Assignment not found."));

        Long submittingEmployeeId = resolveEmployeeIdForUser(submittingUserId);
        if (!assignment.getEvaluatorEmployeeId().equals(submittingEmployeeId)) {
            log.error("Unauthorized submission attempt by User ID: {}", submittingUserId);
            throw new UnauthorizedActionException("You are not authorized to submit this feedback.");
        }

        ensureCampaignAcceptsFeedback(assignment, "submitted");

        LocalDateTime dueAt = resolveEffectiveDeadline(assignment);
        if (dueAt != null && LocalDateTime.now().isAfter(dueAt)) {
            throw new BusinessValidationException("Feedback submission deadline has passed.");
        }

        if (items == null || items.isEmpty()) {
            throw new BusinessValidationException("At least one response item is required.");
        }
        Map<Long, FeedbackQuestion> assignmentQuestions = loadAssignmentQuestions(assignment);
        validateSubmittedItems(items, assignmentQuestions);

        Double overallScore = calculateOverallScore(items, assignmentQuestions);
        Optional<FeedbackResponse> existing = responseRepository.findByEvaluatorAssignmentId(evaluatorAssignmentId);
        if (existing.isPresent() && ResponseStatus.SUBMITTED.equals(existing.get().getFinalStatus())) {
            throw new BusinessValidationException("A response has already been submitted for this assignment.");
        }

        FeedbackResponse response = existing.orElseGet(FeedbackResponse::new);
        response.setEvaluatorAssignment(assignment);
        response.setSubmittedAt(LocalDateTime.now());
        response.setOverallScore(overallScore);
        response.setComments(comments);
        response.setFinalStatus(ResponseStatus.SUBMITTED);

        response.getItems().clear();
        items.forEach(item -> item.setResponse(response));
        response.getItems().addAll(items);

        FeedbackResponse savedResponse = responseRepository.save(response);
        assignment.setStatus(AssignmentStatus.SUBMITTED);
        assignmentRepository.save(assignment);
        refreshRequestStatus(assignment);
        auditLogService.log(
                submittingUserId.intValue(),
                "SUBMIT",
                "FEEDBACK_RESPONSE",
                savedResponse.getId().intValue(),
                "status=" + response.getFinalStatus(),
                "status=SUBMITTED,score=" + overallScore,
                "Feedback submitted"
        );

        log.info("Successfully submitted feedback response with ID: {}", savedResponse.getId());
        return savedResponse;
    }

    @Override
    @Transactional(readOnly = true)
    public FeedbackResponse getResponse(Long responseId, Long requestingUserId, List<String> requesterRoles) {
        FeedbackResponse response = responseRepository.findById(responseId)
                .orElseThrow(() -> new ResourceNotFoundException("Feedback response not found."));

        FeedbackEvaluatorAssignment assignment = response.getEvaluatorAssignment();
        boolean isPrivileged = hasPrivilegedRole(requesterRoles);
        Long requestingEmployeeId = resolveEmployeeIdOrNull(requestingUserId);
        boolean isSubmitter = requestingEmployeeId != null && assignment.getEvaluatorEmployeeId().equals(requestingEmployeeId);
        boolean isTargetEmployee = requestingEmployeeId != null
                && assignment.getFeedbackRequest().getTargetEmployeeId().equals(requestingEmployeeId);
        boolean isManager = requestingEmployeeId != null
                && isManagerOfTarget(assignment.getFeedbackRequest().getTargetEmployeeId(), requestingEmployeeId);
        boolean visibilityReached = hasVisibilityReached(assignment.getFeedbackRequest());

        if (!isSubmitter && !isTargetEmployee && !isManager && !isPrivileged) {
            throw new UnauthorizedActionException("You are not authorized to view this feedback response.");
        }

        if ((isTargetEmployee || isManager) && !visibilityReached) {
            throw new BusinessValidationException("Feedback is visible only after deadline or campaign completion.");
        }

        if (shouldHideEvaluatorIdentity(assignment, requestingEmployeeId)) {
            return maskedAnonymousResponse(response);
        }

        return response;
    }

    @Override
    @Transactional(readOnly = true)
    public List<FeedbackSubmissionStatusResponse> getSubmissionStatuses(Long evaluatorUserId) {
        Long evaluatorEmployeeId = resolveEmployeeIdForUser(evaluatorUserId);
        return assignmentRepository.findByEvaluatorEmployeeId(evaluatorEmployeeId).stream()
                .filter(assignment -> assignment.getStatus() != AssignmentStatus.CANCELLED)
                .filter(assignment -> assignment.getFeedbackRequest().getCampaign().getStatus() != FeedbackCampaignStatus.CANCELLED)
                .sorted(Comparator.comparing(this::resolveEffectiveDeadline, Comparator.nullsLast(Comparator.naturalOrder())))
                .map(assignment -> FeedbackSubmissionStatusResponse.builder()
                        .evaluatorAssignmentId(assignment.getId())
                        .requestId(assignment.getFeedbackRequest().getId())
                        .campaignId(assignment.getFeedbackRequest().getCampaign().getId())
                        .campaignName(assignment.getFeedbackRequest().getCampaign().getName())
                        .targetEmployeeId(assignment.getFeedbackRequest().getTargetEmployeeId())
                        .relationshipType(assignment.getRelationshipType().name())
                        .status(assignment.getStatus().name())
                        .dueAt(resolveEffectiveDeadline(assignment))
                        .build())
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<FeedbackReceivedItemResponse> getReceivedFeedback(Long targetEmployeeId, Long requestingUserId, List<String> requesterRoles) {
        boolean privileged = hasPrivilegedRole(requesterRoles);
        Long requestingEmployeeId = resolveEmployeeIdOrNull(requestingUserId);
        boolean isTargetEmployee = Objects.equals(targetEmployeeId, requestingEmployeeId);
        boolean isManager = requestingEmployeeId != null && isManagerOfTarget(targetEmployeeId, requestingEmployeeId);

        if (!privileged && !isTargetEmployee && !isManager) {
            throw new UnauthorizedActionException("You are not authorized to view feedback for this employee.");
        }

        List<FeedbackResponse> submittedResponses = responseRepository.findByTargetEmployeeIdAndStatus(targetEmployeeId, ResponseStatus.SUBMITTED);

        return submittedResponses.stream()
                .filter(response -> privileged || hasVisibilityReached(response.getEvaluatorAssignment().getFeedbackRequest()))
                .map(response -> {
                    FeedbackEvaluatorAssignment assignment = response.getEvaluatorAssignment();
                    boolean hideIdentity = shouldHideEvaluatorIdentity(assignment, requestingEmployeeId);
                    return FeedbackReceivedItemResponse.builder()
                            .responseId(response.getId())
                            .requestId(assignment.getFeedbackRequest().getId())
                            .campaignId(assignment.getFeedbackRequest().getCampaign().getId())
                            .campaignName(assignment.getFeedbackRequest().getCampaign().getName())
                            .targetEmployeeId(assignment.getFeedbackRequest().getTargetEmployeeId())
                            .overallScore(response.getOverallScore())
                            .comments(response.getComments())
                            .submittedAt(response.getSubmittedAt())
                            .relationshipType(assignment.getRelationshipType().name())
                            .anonymous(Boolean.TRUE.equals(assignment.getIsAnonymous()))
                            .evaluatorEmployeeId(hideIdentity ? null : assignment.getEvaluatorEmployeeId())
                            .build();
                })
                .toList();
    }


    private boolean shouldHideEvaluatorIdentity(FeedbackEvaluatorAssignment assignment, Long requestingEmployeeId) {
        boolean isSubmitter = requestingEmployeeId != null
                && Objects.equals(assignment.getEvaluatorEmployeeId(), requestingEmployeeId);
        return Boolean.TRUE.equals(assignment.getIsAnonymous()) && !isSubmitter;
    }

    private FeedbackResponse maskedAnonymousResponse(FeedbackResponse original) {
        FeedbackEvaluatorAssignment assignment = original.getEvaluatorAssignment();
        FeedbackEvaluatorAssignment maskedAssignment = new FeedbackEvaluatorAssignment();
        maskedAssignment.setId(assignment.getId());
        maskedAssignment.setFeedbackRequest(assignment.getFeedbackRequest());
        maskedAssignment.setRelationshipType(assignment.getRelationshipType());
        maskedAssignment.setSelectionMethod(assignment.getSelectionMethod());
        maskedAssignment.setIsAnonymous(true);
        maskedAssignment.setStatus(assignment.getStatus());
        maskedAssignment.setEvaluatorEmployeeId(null);

        FeedbackResponse maskedResponse = new FeedbackResponse();
        maskedResponse.setId(original.getId());
        maskedResponse.setEvaluatorAssignment(maskedAssignment);
        maskedResponse.setSubmittedAt(original.getSubmittedAt());
        maskedResponse.setOverallScore(original.getOverallScore());
        maskedResponse.setComments(original.getComments());
        maskedResponse.setFinalStatus(original.getFinalStatus());
        maskedResponse.setCreatedAt(original.getCreatedAt());
        maskedResponse.setUpdatedAt(original.getUpdatedAt());
        maskedResponse.getItems().addAll(original.getItems());
        return maskedResponse;
    }

    private void ensureCampaignAcceptsFeedback(FeedbackEvaluatorAssignment assignment, String action) {
        com.epms.entity.FeedbackRequest request = assignment.getFeedbackRequest();
        FeedbackCampaignStatus campaignStatus = request.getCampaign().getStatus();
        if (campaignStatus != FeedbackCampaignStatus.ACTIVE) {
            throw new BusinessValidationException("Feedback can be " + action + " only while the campaign is ACTIVE.");
        }
        if (request.getStatus() == FeedbackRequestStatus.CANCELLED) {
            throw new BusinessValidationException("This feedback request has been cancelled.");
        }
        if (assignment.getStatus() == AssignmentStatus.CANCELLED) {
            throw new BusinessValidationException("This evaluator assignment has been cancelled.");
        }
        LocalDateTime now = LocalDateTime.now();
        if (request.getCampaign().getStartAt() != null && now.isBefore(request.getCampaign().getStartAt())) {
            throw new BusinessValidationException("Feedback campaign has not started yet.");
        }
        if (request.getCampaign().getEndAt() != null && now.isAfter(request.getCampaign().getEndAt())) {
            throw new BusinessValidationException("Feedback campaign deadline has passed.");
        }
    }

    private boolean hasVisibilityReached(com.epms.entity.FeedbackRequest request) {
        if (request.getCampaign().getStatus() == FeedbackCampaignStatus.CLOSED) {
            return true;
        }
        Long requestId = request.getId();
        LocalDateTime dueAt = resolveEffectiveDeadline(request);
        if (dueAt != null && LocalDateTime.now().isAfter(dueAt)) {
            return true;
        }
        long totalAssignments = assignmentRepository.countByFeedbackRequestId(requestId);
        long submittedAssignments = assignmentRepository.countByFeedbackRequestIdAndStatus(requestId, AssignmentStatus.SUBMITTED);
        return totalAssignments > 0 && totalAssignments == submittedAssignments;
    }

    private boolean hasPrivilegedRole(List<String> roles) {
        if (roles == null) {
            return false;
        }
        return roles.stream()
                .map(String::toUpperCase)
                .anyMatch(role -> role.equals("ADMIN") || role.equals("HR") || role.equals("ROLE_ADMIN") || role.equals("ROLE_HR"));
    }

    private boolean isManagerOfTarget(Long targetEmployeeId, Long requestingEmployeeId) {
        return userRepository.findByEmployeeId(targetEmployeeId.intValue())
                .map(user -> Objects.equals(user.getManagerId(), userRepository.findByEmployeeId(requestingEmployeeId.intValue()).map(User::getId).orElse(null)))
                .orElse(false);
    }

    private LocalDateTime resolveEffectiveDeadline(FeedbackEvaluatorAssignment assignment) {
        return resolveEffectiveDeadline(assignment.getFeedbackRequest());
    }

    private LocalDateTime resolveEffectiveDeadline(com.epms.entity.FeedbackRequest request) {
        return request.getCampaign().getEndAt();
    }

    private Map<Long, FeedbackQuestion> loadAssignmentQuestions(FeedbackEvaluatorAssignment assignment) {
        Long formId = assignment.getFeedbackRequest().getForm().getId();

        List<FeedbackSection> sections =
                feedbackFormRepository.findSectionsWithQuestionsByFormId(formId);

        if (sections == null || sections.isEmpty()) {
            throw new ResourceNotFoundException("Assigned feedback form not found.");
        }

        return sections.stream()
                .flatMap(section ->
                        section.getQuestions() == null
                                ? Stream.empty()
                                : section.getQuestions().stream()
                )
                .collect(Collectors.toMap(FeedbackQuestion::getId, Function.identity()));
    }

    private void validateDraftItems(List<FeedbackResponseItem> items, Map<Long, FeedbackQuestion> assignmentQuestions) {
        validateQuestionMembershipAndRatings(items, assignmentQuestions, false);
    }

    private void validateSubmittedItems(List<FeedbackResponseItem> items, Map<Long, FeedbackQuestion> assignmentQuestions) {
        validateQuestionMembershipAndRatings(items, assignmentQuestions, true);

        Set<Long> answeredQuestionIds = items.stream()
                .filter(item -> item.getRatingValue() != null)
                .map(item -> item.getQuestion().getId())
                .collect(Collectors.toSet());

        List<Long> missingRequiredIds = assignmentQuestions.values().stream()
                .filter(question -> Boolean.TRUE.equals(question.getIsRequired()))
                .map(FeedbackQuestion::getId)
                .filter(questionId -> !answeredQuestionIds.contains(questionId))
                .toList();

        if (!missingRequiredIds.isEmpty()) {
            throw new BusinessValidationException("All required feedback questions must have a rating before submission.");
        }
    }

    private void validateQuestionMembershipAndRatings(
            List<FeedbackResponseItem> items,
            Map<Long, FeedbackQuestion> assignmentQuestions,
            boolean requireRatingsForRequiredQuestions
    ) {
        Set<Long> seenQuestionIds = new HashSet<>();

        for (FeedbackResponseItem item : items) {
            Long questionId = item.getQuestion() != null ? item.getQuestion().getId() : null;
            if (questionId == null) {
                throw new BusinessValidationException("Question ID is required for each response item.");
            }
            if (!seenQuestionIds.add(questionId)) {
                throw new BusinessValidationException("Duplicate responses for the same question are not allowed.");
            }
            FeedbackQuestion question = assignmentQuestions.get(questionId);
            if (question == null) {
                throw new BusinessValidationException("Question " + questionId + " does not belong to the assigned feedback form.");
            }
            item.setQuestion(question);

            Double ratingValue = item.getRatingValue();
            if (ratingValue == null) {
                if (requireRatingsForRequiredQuestions && Boolean.TRUE.equals(question.getIsRequired())) {
                    throw new BusinessValidationException("Rating value is required for required question " + questionId + ".");
                }
                continue;
            }

            double maxRating = resolveMaxRating(question);
            if (ratingValue < 1.0 || ratingValue > maxRating) {
                throw new BusinessValidationException(
                        "Rating for question " + questionId + " must be between 1 and " + formatScore(maxRating) + "."
                );
            }
        }
    }

    private Double calculateOverallScore(List<FeedbackResponseItem> items, Map<Long, FeedbackQuestion> assignmentQuestions) {
        double weightedPoints = 0.0;
        double weightedPossiblePoints = 0.0;

        for (FeedbackResponseItem item : items) {
            if (item.getRatingValue() == null) {
                continue;
            }

            Long questionId = item.getQuestion().getId();
            FeedbackQuestion question = assignmentQuestions.get(questionId);
            if (question == null) {
                question = questionRepository.findById(questionId)
                        .orElseThrow(() -> new ResourceNotFoundException("Feedback question not found: " + questionId));
            }

            double weight = question.getWeight() != null && question.getWeight() > 0 ? question.getWeight() : 1.0;
            double maxRating = resolveMaxRating(question);
            weightedPoints += item.getRatingValue() * weight;
            weightedPossiblePoints += maxRating * weight;
            item.setQuestion(question);
        }

        if (weightedPossiblePoints == 0) {
            return 0.0;
        }
        return roundToTwoDecimals((weightedPoints / weightedPossiblePoints) * 100.0);
    }

    private double resolveMaxRating(FeedbackQuestion question) {
        Integer ratingScaleId = question.getRatingScaleId();
        if (ratingScaleId == null) {
            return 5.0;
        }
        return ratingScaleRepository.findById(ratingScaleId)
                .map(scale -> scale.getScales() != null && scale.getScales() > 0 ? scale.getScales().doubleValue() : 5.0)
                .orElseThrow(() -> new BusinessValidationException("Rating scale not found for question " + question.getId() + "."));
    }

    private double roundToTwoDecimals(double value) {
        return Math.round(value * 100.0) / 100.0;
    }

    private String formatScore(double value) {
        if (value == Math.rint(value)) {
            return String.valueOf((long) value);
        }
        return String.valueOf(value);
    }

    private void markRequestInProgress(FeedbackEvaluatorAssignment assignment) {
        if (assignment.getFeedbackRequest().getStatus() == FeedbackRequestStatus.PENDING) {
            assignment.getFeedbackRequest().setStatus(FeedbackRequestStatus.IN_PROGRESS);
            feedbackRequestRepository.save(assignment.getFeedbackRequest());
        }
    }

    private void refreshRequestStatus(FeedbackEvaluatorAssignment assignment) {
        long totalAssignments = assignmentRepository.countByFeedbackRequestId(assignment.getFeedbackRequest().getId());
        long submittedAssignments = assignmentRepository.countByFeedbackRequestIdAndStatus(
                assignment.getFeedbackRequest().getId(),
                AssignmentStatus.SUBMITTED
        );
        assignment.getFeedbackRequest().setStatus(
                totalAssignments > 0 && totalAssignments == submittedAssignments
                        ? FeedbackRequestStatus.COMPLETED
                        : FeedbackRequestStatus.IN_PROGRESS
        );
        feedbackRequestRepository.save(assignment.getFeedbackRequest());
    }

    private Long resolveEmployeeIdForUser(Long userId) {
        User user = userRepository.findById(userId.intValue())
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));
        if (user.getEmployeeId() == null) {
            throw new BusinessValidationException("This user is not linked to an employee record.");
        }
        return user.getEmployeeId().longValue();
    }

    private Long resolveEmployeeIdOrNull(Long userId) {
        return userRepository.findById(userId.intValue())
                .map(User::getEmployeeId)
                .filter(Objects::nonNull)
                .map(Integer::longValue)
                .orElse(null);
    }
}
