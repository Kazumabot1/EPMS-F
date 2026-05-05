package com.epms.service.impl;

import com.epms.dto.FeedbackCampaignCreateRequest;
import com.epms.dto.FeedbackReminderResponse;
import com.epms.entity.Employee;
import com.epms.entity.FeedbackCampaign;
import com.epms.entity.FeedbackEvaluatorAssignment;
import com.epms.entity.FeedbackForm;
import com.epms.entity.FeedbackRequest;
import com.epms.entity.User;
import com.epms.entity.enums.AssignmentStatus;
import com.epms.entity.enums.FeedbackCampaignRound;
import com.epms.entity.enums.FeedbackCampaignStatus;
import com.epms.entity.enums.FeedbackFormStatus;
import com.epms.entity.enums.FeedbackRequestStatus;
import com.epms.exception.BusinessValidationException;
import com.epms.exception.ResourceNotFoundException;
import com.epms.repository.EmployeeRepository;
import com.epms.repository.FeedbackCampaignRepository;
import com.epms.repository.FeedbackEvaluatorAssignmentRepository;
import com.epms.repository.FeedbackFormRepository;
import com.epms.repository.FeedbackRequestRepository;
import com.epms.repository.UserRepository;
import com.epms.service.AuditLogService;
import com.epms.service.FeedbackCampaignService;
import com.epms.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

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
    private final EmployeeRepository employeeRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final AuditLogService auditLogService;

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
            List<FeedbackEvaluatorAssignment> assignments = new ArrayList<>();
            for (FeedbackRequest request : existingRequests) {
                assignments.addAll(assignmentRepository.findByFeedbackRequestId(request.getId()));
            }
            if (!assignments.isEmpty()) {
                assignmentRepository.deleteAll(assignments);
            }
            feedbackRequestRepository.deleteAll(existingRequests);
        }

        List<FeedbackRequest> newRequests = uniqueTargetIds.stream()
                .map(targetEmployeeId -> buildRequest(campaign, form, targetEmployeeId, requestedByUserId))
                .toList();
        List<FeedbackRequest> saved = feedbackRequestRepository.saveAll(newRequests);
        auditLogService.log(
                requestedByUserId.intValue(),
                "REPLACE_TARGETS",
                "FEEDBACK_CAMPAIGN",
                campaignId.intValue(),
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
        return saved;
    }

    @Override
    @Transactional
    public FeedbackCampaign closeCampaign(Long campaignId, Long actorUserId) {
        FeedbackCampaign campaign = getCampaignById(campaignId);
        if (campaign.getStatus() == FeedbackCampaignStatus.CLOSED) {
            return campaign;
        }
        if (campaign.getStatus() == FeedbackCampaignStatus.CANCELLED) {
            throw new BusinessValidationException("Cancelled campaigns cannot be closed.");
        }
        if (campaign.getStatus() != FeedbackCampaignStatus.ACTIVE) {
            throw new BusinessValidationException("Only ACTIVE campaigns can be closed.");
        }

        List<FeedbackRequest> requests = feedbackRequestRepository.findByCampaignIdOrderByTargetEmployeeIdAsc(campaignId);
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
        FeedbackCampaign saved = feedbackCampaignRepository.save(campaign);
        auditLifecycleChange(actorUserId, saved, oldStatus, FeedbackCampaignStatus.CLOSED, "Feedback campaign closed");
        return saved;
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

        List<FeedbackEvaluatorAssignment> pendingAssignments = assignmentRepository.findByCampaignIdWithRequest(campaignId).stream()
                .filter(assignment -> assignment.getStatus() == AssignmentStatus.PENDING
                        || assignment.getStatus() == AssignmentStatus.IN_PROGRESS)
                .toList();

        int notified = 0;
        int skipped = 0;
        List<String> warnings = new ArrayList<>();
        Set<Integer> notifiedUserIds = new LinkedHashSet<>();

        for (FeedbackEvaluatorAssignment assignment : pendingAssignments) {
            Long evaluatorEmployeeId = assignment.getEvaluatorEmployeeId();
            Optional<User> evaluatorUser = evaluatorEmployeeId == null
                    ? Optional.empty()
                    : userRepository.findByEmployeeId(evaluatorEmployeeId.intValue());

            if (evaluatorUser.isEmpty() || Boolean.FALSE.equals(evaluatorUser.get().getActive())) {
                skipped++;
                warnings.add("No active user account found for evaluator employee ID " + evaluatorEmployeeId + ".");
                continue;
            }

            User user = evaluatorUser.get();
            String targetLabel = "Employee #" + assignment.getFeedbackRequest().getTargetEmployeeId();
            String title = "360 feedback reminder";
            String message = "Please complete your " + assignment.getRelationshipType().name().toLowerCase().replace('_', ' ')
                    + " feedback for " + targetLabel + " in campaign " + campaign.getName()
                    + " before " + formatDeadline(campaign.getEndAt()) + ".";

            notificationService.send(user.getId(), title, message, "FEEDBACK_360_REMINDER");
            notified++;
            notifiedUserIds.add(user.getId());
        }

        if (actorUserId != null) {
            auditLogService.log(
                    actorUserId.intValue(),
                    "SEND_360_REMINDERS",
                    "FEEDBACK_CAMPAIGN",
                    campaignId.intValue(),
                    null,
                    "pendingAssignments=" + pendingAssignments.size() + ", notifiedAssignments=" + notified
                            + ", notifiedUsers=" + notifiedUserIds.size() + ", skippedAssignments=" + skipped,
                    "Pending 360 feedback reminders sent"
            );
        }

        return FeedbackReminderResponse.builder()
                .campaignId(campaign.getId())
                .campaignName(campaign.getName())
                .pendingAssignmentCount(pendingAssignments.size())
                .notifiedEvaluatorCount(notified)
                .skippedAssignmentCount(skipped)
                .warnings(warnings)
                .build();
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
        if (actorUserId == null) {
            return;
        }
        auditLogService.log(
                actorUserId.intValue(),
                "CAMPAIGN_STATUS_CHANGE",
                "FEEDBACK_CAMPAIGN",
                campaign.getId() != null ? campaign.getId().intValue() : null,
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
