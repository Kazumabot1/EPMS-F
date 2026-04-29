package com.epms.controller;

import com.epms.dto.EvaluatorConfigDTO;
import com.epms.dto.FeedbackAssignmentGenerationResponse;
import com.epms.dto.FeedbackCampaignCreateRequest;
import com.epms.dto.FeedbackCampaignResponse;
import com.epms.dto.FeedbackCampaignTargetsRequest;
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
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

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

    private FeedbackCampaignResponse mapCampaign(FeedbackCampaign campaign) {
        List<FeedbackRequest> requests = feedbackCampaignService.getRequestsForCampaign(campaign.getId());

        return FeedbackCampaignResponse.builder()
                .id(campaign.getId())
                .name(campaign.getName())
                .startDate(campaign.getStartDate())
                .endDate(campaign.getEndDate())
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
                .filter(role -> role != null)
                .map(role -> role.toUpperCase().replace("ROLE_", "").replace(" ", "_").replace("-", "_"))
                .anyMatch(role ->
                        role.equals("HR")
                                || role.equals("ADMIN")
                                || role.equals("HUMAN_RESOURCES")
                                || role.equals("HUMAN_RESOURCE")
                                || role.equals("HR_MANAGER")
                );
        if (!authorized) {
            throw new UnauthorizedActionException("Only HR/Admin can manage feedback campaigns.");
        }
    }
}
