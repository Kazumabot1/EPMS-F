package com.epms.controller;

import com.epms.dto.EvaluatorConfigDTO;
import com.epms.dto.FeedbackAssignmentGenerationResponse;
import com.epms.dto.FeedbackCampaignCreateRequest;
import com.epms.dto.FeedbackCampaignResponse;
import com.epms.dto.FeedbackCampaignTargetsRequest;
import com.epms.dto.FeedbackManualAssignmentRequest;
import com.epms.dto.FeedbackReminderResponse;
import com.epms.dto.GenericApiResponse;
import com.epms.entity.FeedbackCampaign;
import com.epms.entity.FeedbackRequest;
import com.epms.exception.UnauthorizedActionException;
import com.epms.security.SecurityUtils;
import com.epms.service.FeedbackCampaignService;
import com.epms.service.FeedbackEvaluationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Locale;

@RestController
@RequestMapping("/api/v1/feedback/campaigns")
@RequiredArgsConstructor
public class FeedbackCampaignController {

    private final FeedbackCampaignService feedbackCampaignService;
    private final FeedbackEvaluationService feedbackEvaluationService;

    @PostMapping
    public ResponseEntity<GenericApiResponse<FeedbackCampaignResponse>> createCampaign(
            @Valid @RequestBody FeedbackCampaignCreateRequest request) {
        ensureHrOrAdmin();
        FeedbackCampaign campaign = feedbackCampaignService.createCampaign(request, SecurityUtils.currentUserId().longValue());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(GenericApiResponse.success("Feedback campaign created successfully", mapCampaign(campaign)));
    }

    @GetMapping
    public ResponseEntity<GenericApiResponse<List<FeedbackCampaignResponse>>> getCampaigns() {
        ensureHrOrAdmin();
        List<FeedbackCampaignResponse> response = feedbackCampaignService.getAllCampaigns().stream()
                .map(this::mapCampaign)
                .toList();
        return ResponseEntity.ok(GenericApiResponse.success("Feedback campaigns retrieved successfully", response));
    }

    @GetMapping("/{campaignId}")
    public ResponseEntity<GenericApiResponse<FeedbackCampaignResponse>> getCampaign(@PathVariable Long campaignId) {
        ensureHrOrAdmin();
        return ResponseEntity.ok(GenericApiResponse.success(
                "Feedback campaign retrieved successfully",
                mapCampaign(feedbackCampaignService.getCampaignById(campaignId))
        ));
    }

    @PostMapping("/{campaignId}/targets")
    public ResponseEntity<GenericApiResponse<FeedbackCampaignResponse>> assignTargets(
            @PathVariable Long campaignId,
            @Valid @RequestBody FeedbackCampaignTargetsRequest request
    ) {
        ensureHrOrAdmin();
        feedbackCampaignService.replaceTargets(campaignId, request.getEmployeeIds(), SecurityUtils.currentUserId().longValue());
        FeedbackCampaign campaign = feedbackCampaignService.getCampaignById(campaignId);
        return ResponseEntity.ok(GenericApiResponse.success(
                "Feedback campaign targets saved successfully",
                mapCampaign(campaign)
        ));
    }

    @PostMapping("/{campaignId}/assignments/generate")
    public ResponseEntity<GenericApiResponse<FeedbackAssignmentGenerationResponse>> generateAssignments(
            @PathVariable Long campaignId,
            @Valid @RequestBody EvaluatorConfigDTO request
    ) {
        ensureHrOrAdmin();
        FeedbackAssignmentGenerationResponse response = feedbackEvaluationService.generateAssignments(campaignId, request);
        return ResponseEntity.ok(GenericApiResponse.success("Evaluator assignments generated successfully", response));
    }



    @GetMapping("/{campaignId}/assignments/preview")
    public ResponseEntity<GenericApiResponse<FeedbackAssignmentGenerationResponse>> getAssignmentPreview(
            @PathVariable Long campaignId
    ) {
        ensureHrOrAdmin();
        FeedbackAssignmentGenerationResponse response = feedbackEvaluationService.getAssignmentPreview(campaignId);
        return ResponseEntity.ok(GenericApiResponse.success("Evaluator assignment preview retrieved successfully", response));
    }

    @PostMapping("/{campaignId}/assignments/manual")
    public ResponseEntity<GenericApiResponse<FeedbackAssignmentGenerationResponse>> addManualAssignment(
            @PathVariable Long campaignId,
            @Valid @RequestBody FeedbackManualAssignmentRequest request
    ) {
        ensureHrOrAdmin();
        FeedbackAssignmentGenerationResponse response = feedbackEvaluationService.addManualAssignment(campaignId, request);
        return ResponseEntity.ok(GenericApiResponse.success("Manual evaluator assignment added successfully", response));
    }

    @DeleteMapping("/{campaignId}/assignments/{assignmentId}")
    public ResponseEntity<GenericApiResponse<FeedbackAssignmentGenerationResponse>> removeAssignment(
            @PathVariable Long campaignId,
            @PathVariable Long assignmentId
    ) {
        ensureHrOrAdmin();
        FeedbackAssignmentGenerationResponse response = feedbackEvaluationService.removeAssignment(campaignId, assignmentId);
        return ResponseEntity.ok(GenericApiResponse.success("Evaluator assignment removed successfully", response));
    }


    @PostMapping("/{campaignId}/activate")
    public ResponseEntity<GenericApiResponse<FeedbackCampaignResponse>> activateCampaign(@PathVariable Long campaignId) {
        ensureHrOrAdmin();
        FeedbackCampaign campaign = feedbackCampaignService.activateCampaign(campaignId, SecurityUtils.currentUserId().longValue());
        return ResponseEntity.ok(GenericApiResponse.success(
                "Feedback campaign activated successfully",
                mapCampaign(campaign)
        ));
    }

    @PostMapping("/{campaignId}/close")
    public ResponseEntity<GenericApiResponse<FeedbackCampaignResponse>> closeCampaign(@PathVariable Long campaignId) {
        ensureHrOrAdmin();
        FeedbackCampaign campaign = feedbackCampaignService.closeCampaign(campaignId, SecurityUtils.currentUserId().longValue());
        return ResponseEntity.ok(GenericApiResponse.success(
                "Feedback campaign closed successfully",
                mapCampaign(campaign)
        ));
    }

    @PostMapping("/{campaignId}/cancel")
    public ResponseEntity<GenericApiResponse<FeedbackCampaignResponse>> cancelCampaign(@PathVariable Long campaignId) {
        ensureHrOrAdmin();
        FeedbackCampaign campaign = feedbackCampaignService.cancelCampaign(campaignId, SecurityUtils.currentUserId().longValue());
        return ResponseEntity.ok(GenericApiResponse.success(
                "Feedback campaign cancelled successfully",
                mapCampaign(campaign)
        ));
    }

    @PostMapping("/{campaignId}/reminders")
    public ResponseEntity<GenericApiResponse<FeedbackReminderResponse>> sendPendingReminders(@PathVariable Long campaignId) {
        ensureHrOrAdmin();
        FeedbackReminderResponse response = feedbackCampaignService.sendPendingEvaluatorReminders(
                campaignId,
                SecurityUtils.currentUserId().longValue()
        );
        return ResponseEntity.ok(GenericApiResponse.success(
                "Pending evaluator reminders sent successfully",
                response
        ));
    }

    private FeedbackCampaignResponse mapCampaign(FeedbackCampaign campaign) {
        List<FeedbackRequest> requests = feedbackCampaignService.getRequestsForCampaign(campaign.getId());

        return FeedbackCampaignResponse.builder()
                .id(campaign.getId())
                .name(campaign.getName())
                .reviewYear(campaign.getReviewYear())
                .reviewRound(campaign.getReviewRound())
                .startDate(campaign.getStartDate())
                .endDate(campaign.getEndDate())
                .startAt(campaign.getStartAt())
                .endAt(campaign.getEndAt())
                .description(campaign.getDescription())
                .instructions(campaign.getInstructions())
                .status(campaign.getStatus().name())
                .formId(campaign.getFormId())
                .createdBy(campaign.getCreatedByUserId())
                .createdAt(campaign.getCreatedAt())
                .targetCount(requests.size())
                .assignmentCount((int) feedbackCampaignService.countAssignments(campaign.getId()))
                .targetEmployeeIds(requests.stream().map(FeedbackRequest::getTargetEmployeeId).sorted().toList())
                .build();
    }

    private void ensureHrOrAdmin() {
        List<String> roles = SecurityUtils.currentUser().getRoles();
        boolean authorized = roles != null && roles.stream()
                .filter(role -> role != null && !role.isBlank())
                .map(this::normalizeRole)
                .anyMatch(role ->
                        role.equals("HR")
                                || role.equals("ADMIN")
                                || role.equals("HR_ADMIN")
                                || role.equals("HUMAN_RESOURCES")
                                || role.equals("HUMAN_RESOURCE")
                                || role.equals("HR_MANAGER")
                );
        if (!authorized) {
            throw new UnauthorizedActionException("Only HR/Admin can manage feedback campaigns.");
        }
    }

    private String normalizeRole(String role) {
        return role
                .replaceFirst("(?i)^ROLE_", "")
                .trim()
                .replaceAll("[^A-Za-z0-9]+", "_")
                .replaceAll("^_+|_+$", "")
                .toUpperCase(Locale.ROOT);
    }
}
