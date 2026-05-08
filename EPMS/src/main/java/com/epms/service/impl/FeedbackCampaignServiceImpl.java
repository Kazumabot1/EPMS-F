package com.epms.service.impl;

import com.epms.dto.FeedbackCampaignCreateRequest;
import com.epms.dto.FeedbackReminderResponse;
import com.epms.entity.Employee;
import com.epms.entity.FeedbackCampaign;
import com.epms.entity.FeedbackEvaluatorAssignment;
import com.epms.entity.FeedbackForm;
import com.epms.entity.FeedbackQuestion;
import com.epms.entity.FeedbackRequest;
import com.epms.entity.FeedbackResponse;
import com.epms.entity.FeedbackResponseItem;
import com.epms.entity.FeedbackSection;
import com.epms.entity.enums.AssignmentStatus;
import com.epms.entity.enums.FeedbackCampaignEarlyCloseStatus;
import com.epms.entity.enums.FeedbackCampaignRound;
import com.epms.entity.enums.FeedbackCampaignStatus;
import com.epms.entity.enums.FeedbackFormStatus;
import com.epms.entity.enums.FeedbackRequestStatus;
import com.epms.entity.enums.ResponseStatus;
import com.epms.exception.BusinessValidationException;
import com.epms.exception.ResourceNotFoundException;
import com.epms.repository.EmployeeRepository;
import com.epms.repository.FeedbackCampaignRepository;
import com.epms.repository.FeedbackEvaluatorAssignmentRepository;
import com.epms.repository.FeedbackFormRepository;
import com.epms.repository.FeedbackRequestRepository;
import com.epms.repository.FeedbackResponseRepository;
import com.epms.service.FeedbackOperationalService;
import com.epms.service.FeedbackCampaignService;
import com.epms.service.FeedbackSummaryService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class FeedbackCampaignServiceImpl implements FeedbackCampaignService {

    private static final List<FeedbackCampaignStatus> SAME_ROUND_BLOCKING_STATUSES = List.of(
            FeedbackCampaignStatus.DRAFT,
            FeedbackCampaignStatus.ACTIVE,
            FeedbackCampaignStatus.CLOSED
    );

    private static final List<FeedbackCampaignStatus> OVERLAP_BLOCKING_STATUSES = List.of(
            FeedbackCampaignStatus.DRAFT,
            FeedbackCampaignStatus.ACTIVE
    );

    private final FeedbackCampaignRepository feedbackCampaignRepository;
    private final FeedbackRequestRepository feedbackRequestRepository;
    private final FeedbackEvaluatorAssignmentRepository assignmentRepository;
    private final FeedbackFormRepository feedbackFormRepository;
    private final FeedbackResponseRepository feedbackResponseRepository;
    private final EmployeeRepository employeeRepository;
    private final FeedbackOperationalService feedbackOperationalService;
    private final FeedbackSummaryService feedbackSummaryService;

    @Override
    @Transactional
    public FeedbackCampaign createCampaign(FeedbackCampaignCreateRequest request, Long createdByUserId) {
        CampaignWindow window = resolveWindow(request);
        applyLegacyDefaults(request, window);
        validateCampaignMetadata(request, window);
        validateNoDuplicateCampaignForReviewRound(request);
        validateNoOverlappingOpenCampaign(window);

        FeedbackForm form = feedbackFormRepository.findById(request.getFormId())
                .orElseThrow(() -> new ResourceNotFoundException("Feedback form not found."));
        if (form.getStatus() != FeedbackFormStatus.ACTIVE) {
            throw new BusinessValidationException("Only ACTIVE feedback forms can be used in a campaign.");
        }

        FeedbackCampaign campaign = new FeedbackCampaign();
        campaign.setName(request.getName().trim());
        campaign.setReviewYear(request.getReviewYear());
        campaign.setReviewRound(request.getReviewRound());
        campaign.setStartDate(window.startAt.toLocalDate());
        campaign.setEndDate(window.endAt.toLocalDate());
        campaign.setStartTime(window.startAt.toLocalTime());
        campaign.setEndTime(window.endAt.toLocalTime());
        campaign.setDescription(normalizeText(request.getDescription(), 2000));
        campaign.setInstructions(normalizeText(request.getInstructions(), 4000));
        campaign.setFormId(request.getFormId());
        campaign.setAutoSubmitCompletedDraftsOnClose(Boolean.TRUE.equals(request.getAutoSubmitCompletedDraftsOnClose()));
        campaign.setStatus(FeedbackCampaignStatus.DRAFT);
        campaign.setCreatedByUserId(createdByUserId);
        FeedbackCampaign saved = feedbackCampaignRepository.save(campaign);
        auditLifecycleChange(createdByUserId, saved, null, FeedbackCampaignStatus.DRAFT, "Feedback campaign created");
        return saved;
    }

    @Override
    @Transactional(readOnly = true)
    public FeedbackCampaign getCampaignById(Long campaignId) {
        return feedbackCampaignRepository.findById(campaignId)
                .orElseThrow(() -> new ResourceNotFoundException("Feedback campaign not found."));
    }

    @Override
    @Transactional(readOnly = true)
    public List<FeedbackCampaign> getAllCampaigns() {
        return feedbackCampaignRepository.findAllByOrderByStartDateDesc();
    }

    @Override
    @Transactional(readOnly = true)
    public List<FeedbackCampaign> getPendingEarlyCloseRequests() {
        return feedbackCampaignRepository.findByEarlyCloseRequestStatusOrderByEarlyCloseRequestedAtAsc(
                FeedbackCampaignEarlyCloseStatus.REQUESTED
        );
    }

    @Override
    @Transactional(readOnly = true)
    public List<FeedbackRequest> getRequestsForCampaign(Long campaignId) {
        return feedbackRequestRepository.findByCampaignIdOrderByTargetEmployeeIdAsc(campaignId);
    }

    @Override
    @Transactional
    public List<FeedbackRequest> replaceTargets(Long campaignId, List<Long> targetEmployeeIds, Long requestedByUserId) {
        FeedbackCampaign campaign = getCampaignById(campaignId);
        ensureDraftCampaign(campaign, "Only DRAFT campaigns can be reconfigured.");

        Set<Long> uniqueTargetIds = normalizeTargetIds(targetEmployeeIds);
        List<Employee> employees = employeeRepository.findAllById(
                uniqueTargetIds.stream().map(Long::intValue).toList()
        );
        if (employees.size() != uniqueTargetIds.size()) {
            throw new ResourceNotFoundException("One or more target employees do not exist.");
        }

        FeedbackForm form = feedbackFormRepository.findById(campaign.getFormId())
                .orElseThrow(() -> new ResourceNotFoundException("Feedback form not found."));
        if (form.getStatus() != FeedbackFormStatus.ACTIVE) {
            throw new BusinessValidationException("Only ACTIVE feedback forms can be assigned to campaign targets.");
        }

        List<FeedbackRequest> existingRequests = feedbackRequestRepository.findByCampaignIdOrderByTargetEmployeeIdAsc(campaignId);
        if (!existingRequests.isEmpty()) {
            // Delete/flush old targets before inserting replacements. Without the flush, Hibernate may try
            // to insert the new (campaign_id, target_employee_id) rows before the old rows are removed,
            // causing a duplicate-key failure when HR saves the same target list again.
            assignmentRepository.deleteByFeedbackRequestCampaignId(campaignId);
            assignmentRepository.flush();
            feedbackRequestRepository.deleteAllInBatch(existingRequests);
            feedbackRequestRepository.flush();
        }

        List<FeedbackRequest> newRequests = uniqueTargetIds.stream()
                .map(targetEmployeeId -> buildRequest(campaign, form, targetEmployeeId, requestedByUserId))
                .toList();
        List<FeedbackRequest> saved = feedbackRequestRepository.saveAll(newRequests);
        feedbackOperationalService.audit(
                requestedByUserId,
                FeedbackOperationalService.TARGETS_UPDATED,
                FeedbackOperationalService.ENTITY_CAMPAIGN,
                campaignId,
                null,
                "targetCount=" + saved.size(),
                "Feedback campaign targets replaced"
        );
        return saved;
    }

    @Override
    @Transactional
    public FeedbackCampaign activateCampaign(Long campaignId, Long actorUserId) {
        FeedbackCampaign campaign = getCampaignById(campaignId);
        ensureDraftCampaign(campaign, "Only DRAFT campaigns can be activated.");
        validateCampaignCanStillOpen(campaign);

        FeedbackForm form = feedbackFormRepository.findById(campaign.getFormId())
                .orElseThrow(() -> new ResourceNotFoundException("Feedback form not found."));
        if (form.getStatus() != FeedbackFormStatus.ACTIVE) {
            throw new BusinessValidationException("Only campaigns using an ACTIVE feedback form can be activated.");
        }

        List<FeedbackRequest> requests = feedbackRequestRepository.findByCampaignIdOrderByTargetEmployeeIdAsc(campaignId);
        if (requests.isEmpty()) {
            throw new BusinessValidationException("Select target employees before activating the campaign.");
        }

        List<Long> requestsWithoutAssignments = requests.stream()
                .filter(request -> assignmentRepository.countByFeedbackRequestId(request.getId()) == 0)
                .map(FeedbackRequest::getTargetEmployeeId)
                .toList();
        if (!requestsWithoutAssignments.isEmpty()) {
            throw new BusinessValidationException(
                    "Generate evaluator assignments for every target before activation. Missing target employee IDs: "
                            + requestsWithoutAssignments
            );
        }

        requests.forEach(request -> {
            if (request.getStatus() == FeedbackRequestStatus.CANCELLED) {
                request.setStatus(FeedbackRequestStatus.PENDING);
            }
        });
        feedbackRequestRepository.saveAll(requests);

        FeedbackCampaignStatus oldStatus = campaign.getStatus();
        campaign.setStatus(FeedbackCampaignStatus.ACTIVE);
        FeedbackCampaign saved = feedbackCampaignRepository.save(campaign);
        auditLifecycleChange(actorUserId, saved, oldStatus, FeedbackCampaignStatus.ACTIVE, "Feedback campaign activated");
        feedbackOperationalService.notifyCampaignActivated(saved);
        return saved;
    }

    @Override
    @Transactional
    public FeedbackCampaign requestEarlyClose(Long campaignId, Long actorUserId, String reason) {
        FeedbackCampaign campaign = getCampaignById(campaignId);
        ensureActiveCampaign(campaign);
        if (!isBeforeDeadline(campaign)) {
            throw new BusinessValidationException("Early close approval is only needed before the campaign deadline. Close or let the scheduler close after the deadline.");
        }
        AssignmentCounts counts = assignmentCounts(campaignId);
        if (counts.totalAssignments() == 0) {
            throw new BusinessValidationException("Cannot request early close before evaluator assignments are generated.");
        }
        if (counts.submittedAssignments() < counts.totalAssignments()) {
            throw new BusinessValidationException("Early close can be requested only after all evaluators submit final feedback. Pending assignments: "
                    + counts.pendingAssignments() + ".");
        }

        FeedbackCampaignEarlyCloseStatus oldStatus = campaign.getEarlyCloseRequestStatus();
        campaign.setEarlyCloseRequestStatus(FeedbackCampaignEarlyCloseStatus.REQUESTED);
        campaign.setEarlyCloseRequestedAt(LocalDateTime.now());
        campaign.setEarlyCloseRequestedByUserId(actorUserId);
        campaign.setEarlyCloseRequestReason(normalizeText(reason, 1000));
        campaign.setEarlyCloseReviewedAt(null);
        campaign.setEarlyCloseReviewedByUserId(null);
        campaign.setEarlyCloseReviewReason(null);
        FeedbackCampaign saved = feedbackCampaignRepository.save(campaign);

        feedbackOperationalService.audit(
                actorUserId,
                FeedbackOperationalService.CAMPAIGN_EARLY_CLOSE_REQUESTED,
                FeedbackOperationalService.ENTITY_CAMPAIGN,
                saved.getId(),
                "earlyCloseStatus=" + oldStatus,
                "earlyCloseStatus=REQUESTED,totalAssignments=" + counts.totalAssignments() + ",submittedAssignments=" + counts.submittedAssignments(),
                "Early close requested: " + saved.getEarlyCloseRequestReason()
        );
        feedbackOperationalService.notifyEarlyCloseRequested(saved, counts.totalAssignments(), counts.submittedAssignments());
        return saved;
    }

    @Override
    @Transactional
    public FeedbackCampaign approveEarlyClose(Long campaignId, Long actorUserId, String reviewNote) {
        FeedbackCampaign campaign = getCampaignById(campaignId);
        ensureActiveCampaign(campaign);
        if (campaign.getEarlyCloseRequestStatus() != FeedbackCampaignEarlyCloseStatus.REQUESTED) {
            throw new BusinessValidationException("No pending early close request exists for this campaign.");
        }
        if (!isBeforeDeadline(campaign)) {
            return closeCampaign(campaignId, actorUserId);
        }
        AssignmentCounts counts = assignmentCounts(campaignId);
        if (counts.totalAssignments() == 0 || counts.submittedAssignments() < counts.totalAssignments()) {
            throw new BusinessValidationException("This campaign is no longer eligible for early close because not all evaluators have submitted final feedback.");
        }

        campaign.setEarlyCloseRequestStatus(FeedbackCampaignEarlyCloseStatus.APPROVED);
        campaign.setEarlyCloseReviewedAt(LocalDateTime.now());
        campaign.setEarlyCloseReviewedByUserId(actorUserId);
        campaign.setEarlyCloseReviewReason(normalizeText(reviewNote, 1000));
        feedbackCampaignRepository.save(campaign);

        feedbackOperationalService.audit(
                actorUserId,
                FeedbackOperationalService.CAMPAIGN_EARLY_CLOSE_APPROVED,
                FeedbackOperationalService.ENTITY_CAMPAIGN,
                campaign.getId(),
                "earlyCloseStatus=REQUESTED",
                "earlyCloseStatus=APPROVED,totalAssignments=" + counts.totalAssignments() + ",submittedAssignments=" + counts.submittedAssignments(),
                "Early close approved" + noteSuffix(reviewNote)
        );

        FeedbackCampaign closed = closeCampaignInternal(campaign, actorUserId, true,
                "Early close approved by Admin" + noteSuffix(reviewNote), false);
        feedbackOperationalService.notifyEarlyCloseReviewed(closed, true);
        return closed;
    }

    @Override
    @Transactional
    public FeedbackCampaign rejectEarlyClose(Long campaignId, Long actorUserId, String reviewNote) {
        FeedbackCampaign campaign = getCampaignById(campaignId);
        ensureActiveCampaign(campaign);
        if (campaign.getEarlyCloseRequestStatus() != FeedbackCampaignEarlyCloseStatus.REQUESTED) {
            throw new BusinessValidationException("No pending early close request exists for this campaign.");
        }

        campaign.setEarlyCloseRequestStatus(FeedbackCampaignEarlyCloseStatus.REJECTED);
        campaign.setEarlyCloseReviewedAt(LocalDateTime.now());
        campaign.setEarlyCloseReviewedByUserId(actorUserId);
        campaign.setEarlyCloseReviewReason(normalizeText(reviewNote, 1000));
        FeedbackCampaign saved = feedbackCampaignRepository.save(campaign);

        feedbackOperationalService.audit(
                actorUserId,
                FeedbackOperationalService.CAMPAIGN_EARLY_CLOSE_REJECTED,
                FeedbackOperationalService.ENTITY_CAMPAIGN,
                saved.getId(),
                "earlyCloseStatus=REQUESTED",
                "earlyCloseStatus=REJECTED",
                "Early close rejected" + noteSuffix(reviewNote)
        );
        feedbackOperationalService.notifyEarlyCloseReviewed(saved, false);
        return saved;
    }

    @Override
    @Transactional
    public FeedbackCampaign closeCampaign(Long campaignId, Long actorUserId) {
        FeedbackCampaign campaign = getCampaignById(campaignId);
        if (campaign.getStatus() == FeedbackCampaignStatus.CLOSED) {
            return campaign;
        }
        ensureActiveCampaign(campaign);
        if (isBeforeDeadline(campaign)) {
            throw new BusinessValidationException("Campaign cannot be closed before the deadline. If all evaluators submitted, request Admin early-close approval.");
        }
        return closeCampaignInternal(campaign, actorUserId, false, "Feedback campaign closed after scheduled deadline", true);
    }

    @Override
    @Transactional
    public int closeExpiredCampaigns() {
        LocalDateTime now = LocalDateTime.now();
        List<FeedbackCampaign> activeCampaigns = feedbackCampaignRepository.findByStatusOrderByStartDateDesc(FeedbackCampaignStatus.ACTIVE);
        int closed = 0;
        for (FeedbackCampaign campaign : activeCampaigns) {
            LocalDateTime endAt = campaign.getEndAt();
            if (endAt != null && !endAt.isAfter(now)) {
                closeCampaignInternal(campaign, null, false, "Feedback campaign automatically closed at scheduled deadline", true);
                closed++;
            }
        }
        return closed;
    }

    private FeedbackCampaign closeCampaignInternal(
            FeedbackCampaign campaign,
            Long actorUserId,
            boolean earlyClose,
            String closeReason,
            boolean allowAutoSubmit
    ) {
        if (campaign.getStatus() == FeedbackCampaignStatus.CLOSED) {
            return campaign;
        }
        ensureActiveCampaign(campaign);

        AutoSubmitCloseResult autoSubmitResult = allowAutoSubmit
                && Boolean.TRUE.equals(campaign.getAutoSubmitCompletedDraftsOnClose())
                ? autoSubmitCompletedDraftsOnClose(campaign, actorUserId)
                : AutoSubmitCloseResult.empty();

        List<FeedbackRequest> requests = feedbackRequestRepository.findByCampaignIdOrderByTargetEmployeeIdAsc(campaign.getId());
        for (FeedbackRequest request : requests) {
            if (request.getStatus() == FeedbackRequestStatus.CANCELLED) {
                continue;
            }
            long totalAssignments = assignmentRepository.countByFeedbackRequestId(request.getId());
            long submittedAssignments = assignmentRepository.countByFeedbackRequestIdAndStatus(request.getId(), AssignmentStatus.SUBMITTED);
            if (totalAssignments > 0 && submittedAssignments == totalAssignments) {
                request.setStatus(FeedbackRequestStatus.COMPLETED);
            } else if (request.getStatus() == FeedbackRequestStatus.PENDING) {
                request.setStatus(FeedbackRequestStatus.IN_PROGRESS);
            }
        }
        feedbackRequestRepository.saveAll(requests);

        FeedbackCampaignStatus oldStatus = campaign.getStatus();
        campaign.setStatus(FeedbackCampaignStatus.CLOSED);
        campaign.setClosedAt(LocalDateTime.now());
        campaign.setClosedByUserId(actorUserId);
        campaign.setClosedEarly(earlyClose);
        campaign.setCloseReason(closeReason);
        if (!earlyClose && campaign.getEarlyCloseRequestStatus() == FeedbackCampaignEarlyCloseStatus.REQUESTED) {
            campaign.setEarlyCloseRequestStatus(FeedbackCampaignEarlyCloseStatus.REJECTED);
            campaign.setEarlyCloseReviewedAt(LocalDateTime.now());
            campaign.setEarlyCloseReviewedByUserId(actorUserId);
            campaign.setEarlyCloseReviewReason("Campaign reached the scheduled deadline before Admin review.");
        }
        FeedbackCampaign saved = feedbackCampaignRepository.save(campaign);

        auditLifecycleChange(actorUserId, saved, oldStatus, FeedbackCampaignStatus.CLOSED,
                autoSubmitResult.submittedCount() > 0
                        ? closeReason + "; auto-submitted " + autoSubmitResult.submittedCount() + " completed draft(s)"
                        : closeReason);
        feedbackSummaryService.recalculateCampaignSummary(saved.getId());
        return saved;
    }

    private AutoSubmitCloseResult autoSubmitCompletedDraftsOnClose(FeedbackCampaign campaign, Long actorUserId) {
        List<FeedbackResponse> drafts = feedbackResponseRepository.findByCampaignIdAndStatusWithItems(
                campaign.getId(),
                ResponseStatus.DRAFT
        );
        if (drafts.isEmpty()) {
            return AutoSubmitCloseResult.empty();
        }

        Map<Long, FeedbackQuestion> campaignQuestions = loadCampaignQuestions(campaign.getFormId());
        int submitted = 0;
        int skippedIncomplete = 0;

        for (FeedbackResponse response : drafts) {
            FeedbackEvaluatorAssignment assignment = response.getEvaluatorAssignment();
            if (assignment == null || assignment.getStatus() == AssignmentStatus.SUBMITTED
                    || assignment.getStatus() == AssignmentStatus.CANCELLED) {
                continue;
            }
            if (!hasAllRequiredRatings(response, campaignQuestions)) {
                skippedIncomplete++;
                continue;
            }

            AssignmentStatus oldAssignmentStatus = assignment.getStatus();
            response.setFinalStatus(ResponseStatus.SUBMITTED);
            response.setSubmittedAt(LocalDateTime.now());
            assignment.setStatus(AssignmentStatus.SUBMITTED);

            feedbackResponseRepository.save(response);
            assignmentRepository.save(assignment);
            feedbackOperationalService.audit(
                    actorUserId,
                    FeedbackOperationalService.DRAFT_AUTO_SUBMITTED_ON_CLOSE,
                    FeedbackOperationalService.ENTITY_RESPONSE,
                    response.getId(),
                    "status=DRAFT,assignmentStatus=" + oldAssignmentStatus,
                    "status=SUBMITTED,trigger=SCHEDULED_CAMPAIGN_CLOSE,score=" + response.getOverallScore(),
                    "Completed draft automatically submitted when campaign reached the scheduled deadline"
            );
            feedbackOperationalService.notifyDraftAutoSubmittedOnClose(campaign, assignment);
            submitted++;
        }

        return new AutoSubmitCloseResult(submitted, skippedIncomplete);
    }

    private Map<Long, FeedbackQuestion> loadCampaignQuestions(Long formId) {
        List<FeedbackSection> sections = feedbackFormRepository.findSectionsWithQuestionsByFormId(formId);
        if (sections == null || sections.isEmpty()) {
            throw new ResourceNotFoundException("Feedback form questions not found for campaign.");
        }
        return sections.stream()
                .flatMap(section -> section.getQuestions() == null
                        ? java.util.stream.Stream.<FeedbackQuestion>empty()
                        : section.getQuestions().stream())
                .collect(Collectors.toMap(FeedbackQuestion::getId, question -> question, (first, duplicate) -> first));
    }

    private boolean hasAllRequiredRatings(FeedbackResponse response, Map<Long, FeedbackQuestion> campaignQuestions) {
        Set<Long> requiredQuestionIds = campaignQuestions.values().stream()
                .filter(question -> Boolean.TRUE.equals(question.getIsRequired()))
                .map(FeedbackQuestion::getId)
                .collect(Collectors.toSet());
        if (requiredQuestionIds.isEmpty()) {
            return true;
        }

        Set<Long> answeredRequiredQuestionIds = new HashSet<>();
        for (FeedbackResponseItem item : response.getItems()) {
            if (item == null || item.getQuestion() == null || item.getQuestion().getId() == null || item.getRatingValue() == null) {
                continue;
            }
            Long questionId = item.getQuestion().getId();
            if (requiredQuestionIds.contains(questionId)) {
                answeredRequiredQuestionIds.add(questionId);
            }
        }
        return answeredRequiredQuestionIds.containsAll(requiredQuestionIds);
    }

    private record AssignmentCounts(long totalAssignments, long submittedAssignments) {
        long pendingAssignments() {
            return Math.max(0, totalAssignments - submittedAssignments);
        }
    }

    private record AutoSubmitCloseResult(int submittedCount, int skippedIncompleteCount) {
        private static AutoSubmitCloseResult empty() {
            return new AutoSubmitCloseResult(0, 0);
        }
    }

    @Override
    @Transactional
    public FeedbackCampaign cancelCampaign(Long campaignId, Long actorUserId) {
        FeedbackCampaign campaign = getCampaignById(campaignId);
        if (campaign.getStatus() == FeedbackCampaignStatus.CANCELLED) {
            return campaign;
        }
        if (campaign.getStatus() == FeedbackCampaignStatus.CLOSED) {
            throw new BusinessValidationException("Closed campaigns cannot be cancelled.");
        }

        List<FeedbackRequest> requests = feedbackRequestRepository.findByCampaignIdOrderByTargetEmployeeIdAsc(campaignId);
        List<FeedbackEvaluatorAssignment> assignmentsToSave = new ArrayList<>();
        for (FeedbackRequest request : requests) {
            if (request.getStatus() != FeedbackRequestStatus.COMPLETED) {
                request.setStatus(FeedbackRequestStatus.CANCELLED);
            }
            for (FeedbackEvaluatorAssignment assignment : assignmentRepository.findByFeedbackRequestId(request.getId())) {
                if (assignment.getStatus() != AssignmentStatus.SUBMITTED) {
                    assignment.setStatus(AssignmentStatus.CANCELLED);
                    assignmentsToSave.add(assignment);
                }
            }
        }
        feedbackRequestRepository.saveAll(requests);
        if (!assignmentsToSave.isEmpty()) {
            assignmentRepository.saveAll(assignmentsToSave);
        }

        FeedbackCampaignStatus oldStatus = campaign.getStatus();
        campaign.setStatus(FeedbackCampaignStatus.CANCELLED);
        FeedbackCampaign saved = feedbackCampaignRepository.save(campaign);
        auditLifecycleChange(actorUserId, saved, oldStatus, FeedbackCampaignStatus.CANCELLED, "Feedback campaign cancelled");
        return saved;
    }

    @Override
    @Transactional(readOnly = true)
    public long countAssignments(Long campaignId) {
        return feedbackRequestRepository.findByCampaignId(campaignId).stream()
                .mapToLong(request -> assignmentRepository.countByFeedbackRequestId(request.getId()))
                .sum();
    }

    @Override
    @Transactional
    public FeedbackReminderResponse sendPendingEvaluatorReminders(Long campaignId, Long actorUserId) {
        FeedbackCampaign campaign = getCampaignById(campaignId);
        if (campaign.getStatus() != FeedbackCampaignStatus.ACTIVE) {
            throw new BusinessValidationException("Reminders can only be sent for ACTIVE feedback campaigns.");
        }

        FeedbackOperationalService.FeedbackReminderKind kind = LocalDateTime.now().isAfter(campaign.getEndAt())
                ? FeedbackOperationalService.FeedbackReminderKind.OVERDUE
                : FeedbackOperationalService.FeedbackReminderKind.DEADLINE;

        FeedbackOperationalService.NotificationDeliveryResult result = feedbackOperationalService.notifyPendingEvaluatorReminders(campaign, kind);

        if (actorUserId != null) {
            feedbackOperationalService.audit(
                    actorUserId,
                    kind == FeedbackOperationalService.FeedbackReminderKind.OVERDUE
                            ? FeedbackOperationalService.OVERDUE_REMINDERS_SENT
                            : FeedbackOperationalService.DEADLINE_REMINDERS_SENT,
                    FeedbackOperationalService.ENTITY_CAMPAIGN,
                    campaignId,
                    null,
                    "pendingAssignments=" + result.getCandidateCount() + ", notifiedAssignments=" + result.getSentCount()
                            + ", notifiedUsers=" + result.getUniqueUserCount() + ", skippedAssignments=" + result.getSkippedCount(),
                    kind == FeedbackOperationalService.FeedbackReminderKind.OVERDUE
                            ? "Overdue 360 feedback reminders sent"
                            : "Pending 360 feedback reminders sent"
            );
        }

        return FeedbackReminderResponse.builder()
                .campaignId(campaign.getId())
                .campaignName(campaign.getName())
                .pendingAssignmentCount(result.getCandidateCount())
                .notifiedEvaluatorCount(result.getSentCount())
                .skippedAssignmentCount(result.getSkippedCount())
                .warnings(result.getWarnings())
                .build();
    }

    private void ensureActiveCampaign(FeedbackCampaign campaign) {
        if (campaign.getStatus() == FeedbackCampaignStatus.CANCELLED) {
            throw new BusinessValidationException("Cancelled campaigns cannot be closed.");
        }
        if (campaign.getStatus() != FeedbackCampaignStatus.ACTIVE) {
            throw new BusinessValidationException("Only ACTIVE campaigns can be closed or reviewed for early close.");
        }
    }

    private boolean isBeforeDeadline(FeedbackCampaign campaign) {
        LocalDateTime endAt = campaign.getEndAt();
        return endAt != null && LocalDateTime.now().isBefore(endAt);
    }

    private AssignmentCounts assignmentCounts(Long campaignId) {
        List<FeedbackEvaluatorAssignment> assignments = assignmentRepository.findByCampaignIdWithRequest(campaignId).stream()
                .filter(assignment -> assignment.getStatus() != AssignmentStatus.CANCELLED)
                .toList();
        long submitted = assignments.stream()
                .filter(assignment -> assignment.getStatus() == AssignmentStatus.SUBMITTED)
                .count();
        return new AssignmentCounts(assignments.size(), submitted);
    }

    private String noteSuffix(String note) {
        String normalized = normalizeText(note, 1000);
        return normalized == null || normalized.isBlank() ? "" : ": " + normalized;
    }

    private FeedbackRequest buildRequest(FeedbackCampaign campaign, FeedbackForm form, Long targetEmployeeId, Long requestedByUserId) {
        FeedbackRequest request = new FeedbackRequest();
        request.setCampaign(campaign);
        request.setTargetEmployeeId(targetEmployeeId);

        // Legacy persistence fields kept populated until the old table constraints are fully migrated away.
        request.setForm(form);
        request.setRequestedByUserId(requestedByUserId);
        request.setDueAt(null);
        request.setIsAnonymousEnabled(false);
        request.setStatus(FeedbackRequestStatus.PENDING);
        return request;
    }

    private Set<Long> normalizeTargetIds(List<Long> targetEmployeeIds) {
        if (targetEmployeeIds == null || targetEmployeeIds.isEmpty()) {
            throw new BusinessValidationException("At least one target employee is required.");
        }

        Set<Long> uniqueTargetIds = new LinkedHashSet<>();
        for (Long employeeId : targetEmployeeIds) {
            if (employeeId == null) {
                throw new BusinessValidationException("Target employee IDs cannot contain null values.");
            }
            uniqueTargetIds.add(employeeId);
        }
        return uniqueTargetIds;
    }

    private void applyLegacyDefaults(FeedbackCampaignCreateRequest request, CampaignWindow window) {
        if (request.getReviewYear() == null) {
            request.setReviewYear(window.startAt.getYear());
        }
        if (request.getReviewRound() == null) {
            request.setReviewRound(FeedbackCampaignRound.ANNUAL);
        }
    }

    private CampaignWindow resolveWindow(FeedbackCampaignCreateRequest request) {
        LocalDateTime startAt = request.getStartAt();
        LocalDateTime endAt = request.getEndAt();

        if (startAt == null && request.getStartDate() != null) {
            startAt = request.getStartDate().atTime(LocalTime.of(9, 0));
        }
        if (endAt == null && request.getEndDate() != null) {
            endAt = request.getEndDate().atTime(LocalTime.of(17, 0));
        }

        if (startAt == null || endAt == null) {
            throw new BusinessValidationException("Campaign start and end date/time are required.");
        }
        if (!startAt.isBefore(endAt)) {
            throw new BusinessValidationException("Campaign start date/time must be earlier than the end date/time.");
        }
        return new CampaignWindow(startAt, endAt);
    }

    private void validateCampaignMetadata(FeedbackCampaignCreateRequest request, CampaignWindow window) {
        if (request.getName() == null || request.getName().trim().isBlank()) {
            throw new BusinessValidationException("Campaign name is required.");
        }
        if (request.getName().trim().length() > 255) {
            throw new BusinessValidationException("Campaign name cannot exceed 255 characters.");
        }
        if (request.getReviewYear() == null) {
            throw new BusinessValidationException("Review year is required.");
        }
        if (request.getReviewRound() == null) {
            throw new BusinessValidationException("Review round is required.");
        }
        if (window.startAt.toLocalDate().isAfter(window.endAt.toLocalDate())) {
            throw new BusinessValidationException("Campaign start date cannot be after end date.");
        }
        if (window.startAt.getYear() != request.getReviewYear() && window.endAt.getYear() != request.getReviewYear()) {
            throw new BusinessValidationException("Campaign window should belong to the selected review year.");
        }
        if (request.getDescription() != null && request.getDescription().length() > 2000) {
            throw new BusinessValidationException("Campaign description cannot exceed 2,000 characters.");
        }
        if (request.getInstructions() != null && request.getInstructions().length() > 4000) {
            throw new BusinessValidationException("Campaign instructions cannot exceed 4,000 characters.");
        }
    }

    private void validateNoDuplicateCampaignForReviewRound(FeedbackCampaignCreateRequest request) {
        if (request.getReviewRound() == FeedbackCampaignRound.SPECIAL) {
            return;
        }

        List<FeedbackCampaign> duplicates = feedbackCampaignRepository.findByReviewYearAndReviewRoundAndStatusIn(
                request.getReviewYear(),
                request.getReviewRound(),
                SAME_ROUND_BLOCKING_STATUSES
        );
        if (!duplicates.isEmpty()) {
            FeedbackCampaign existing = duplicates.get(0);
            throw new BusinessValidationException(
                    "A non-cancelled " + labelRound(request.getReviewRound()) + " 360 campaign already exists for "
                            + request.getReviewYear() + ": " + existing.getName() + ". Use another round, close/cancel the old setup where allowed, or create a SPECIAL campaign."
            );
        }
    }

    private void validateNoOverlappingOpenCampaign(CampaignWindow window) {
        List<FeedbackCampaign> overlappingCampaigns = feedbackCampaignRepository.findOverlappingCampaigns(
                window.startAt.toLocalDate(),
                window.endAt.toLocalDate(),
                OVERLAP_BLOCKING_STATUSES
        );

        if (!overlappingCampaigns.isEmpty()) {
            FeedbackCampaign existing = overlappingCampaigns.get(0);
            throw new BusinessValidationException(
                    "Another open 360 campaign overlaps this submission window: " + existing.getName()
                            + " (" + formatDeadline(existing.getStartAt()) + " - " + formatDeadline(existing.getEndAt()) + "). Close/cancel it or choose a non-overlapping window."
            );
        }
    }

    private void validateCampaignCanStillOpen(FeedbackCampaign campaign) {
        LocalDateTime now = LocalDateTime.now();
        if (campaign.getEndAt() != null && now.isAfter(campaign.getEndAt())) {
            throw new BusinessValidationException("This campaign's end date/time has already passed. Update the campaign policy or create a new campaign.");
        }
    }

    private void ensureDraftCampaign(FeedbackCampaign campaign, String message) {
        if (campaign.getStatus() != FeedbackCampaignStatus.DRAFT) {
            throw new BusinessValidationException(message);
        }
    }

    private void auditLifecycleChange(
            Long actorUserId,
            FeedbackCampaign campaign,
            FeedbackCampaignStatus oldStatus,
            FeedbackCampaignStatus newStatus,
            String reason
    ) {
        String action = switch (newStatus) {
            case DRAFT -> FeedbackOperationalService.CAMPAIGN_CREATED;
            case ACTIVE -> FeedbackOperationalService.CAMPAIGN_ACTIVATED;
            case CLOSED -> FeedbackOperationalService.CAMPAIGN_CLOSED;
            case CANCELLED -> FeedbackOperationalService.CAMPAIGN_CANCELLED;
        };
        feedbackOperationalService.audit(
                actorUserId,
                action,
                FeedbackOperationalService.ENTITY_CAMPAIGN,
                campaign.getId(),
                oldStatus != null ? "status=" + oldStatus : null,
                "status=" + newStatus,
                reason
        );
    }

    private String normalizeText(String value, int maxLength) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        if (trimmed.isBlank()) {
            return null;
        }
        return trimmed.length() > maxLength ? trimmed.substring(0, maxLength) : trimmed;
    }

    private String labelRound(FeedbackCampaignRound round) {
        if (round == null) {
            return "";
        }
        return switch (round) {
            case ANNUAL -> "Annual";
            case FIRST_HALF -> "First Half";
            case SECOND_HALF -> "Second Half";
            case SPECIAL -> "Special";
        };
    }

    private String formatDeadline(LocalDateTime value) {
        return value == null ? "the campaign deadline" : value.toString().replace('T', ' ');
    }

    private static class CampaignWindow {
        private final LocalDateTime startAt;
        private final LocalDateTime endAt;

        private CampaignWindow(LocalDateTime startAt, LocalDateTime endAt) {
            this.startAt = startAt;
            this.endAt = endAt;
        }
    }
}
