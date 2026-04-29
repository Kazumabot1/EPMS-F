package com.epms.service;

import com.epms.dto.FeedbackCampaignCreateRequest;
import com.epms.entity.FeedbackCampaign;
import com.epms.entity.FeedbackRequest;

import java.util.List;

public interface FeedbackCampaignService {
    FeedbackCampaign createCampaign(FeedbackCampaignCreateRequest request, Long createdByUserId);
    FeedbackCampaign getCampaignById(Long campaignId);
    List<FeedbackCampaign> getAllCampaigns();
    List<FeedbackRequest> getRequestsForCampaign(Long campaignId);
    List<FeedbackRequest> replaceTargets(Long campaignId, List<Long> targetEmployeeIds, Long requestedByUserId);
    long countAssignments(Long campaignId);
}
