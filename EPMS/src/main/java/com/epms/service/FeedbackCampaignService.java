package com.epms.service;

import com.epms.dto.FeedbackCampaignCreateRequest;
import com.epms.dto.FeedbackReminderResponse;
import com.epms.entity.FeedbackCampaign;
import com.epms.entity.FeedbackRequest;

import java.util.List;

public interface FeedbackCampaignService {
    FeedbackCampaign createCampaign(FeedbackCampaignCreateRequest request, Long createdByUserId);
    FeedbackCampaign getCampaignById(Long campaignId);
    List<FeedbackCampaign> getAllCampaigns();
    List<FeedbackCampaign> getPendingEarlyCloseRequests();
    List<FeedbackRequest> getRequestsForCampaign(Long campaignId);
    List<FeedbackRequest> replaceTargets(Long campaignId, List<Long> targetEmployeeIds, Long requestedByUserId);
    FeedbackCampaign activateCampaign(Long campaignId, Long actorUserId);
    FeedbackCampaign requestEarlyClose(Long campaignId, Long actorUserId, String reason);
    FeedbackCampaign approveEarlyClose(Long campaignId, Long actorUserId, String reviewNote);
    FeedbackCampaign rejectEarlyClose(Long campaignId, Long actorUserId, String reviewNote);
    FeedbackCampaign closeCampaign(Long campaignId, Long actorUserId);
    int closeExpiredCampaigns();
    FeedbackCampaign cancelCampaign(Long campaignId, Long actorUserId);
    long countAssignments(Long campaignId);
    FeedbackReminderResponse sendPendingEvaluatorReminders(Long campaignId, Long actorUserId);
}
