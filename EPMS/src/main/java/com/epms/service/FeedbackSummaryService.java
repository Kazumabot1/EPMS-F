package com.epms.service;

import com.epms.dto.FeedbackCampaignSummaryResponse;
import com.epms.dto.FeedbackIntegrationScoreResponse;
import com.epms.dto.FeedbackMyResultResponse;
import com.epms.dto.FeedbackTeamSummaryResponse;

import java.util.List;

public interface FeedbackSummaryService {
    FeedbackCampaignSummaryResponse getCampaignSummary(Long campaignId);
    FeedbackCampaignSummaryResponse recalculateCampaignSummary(Long campaignId);
    FeedbackMyResultResponse getMyResult(Long userId);
    FeedbackTeamSummaryResponse getTeamSummary(Long userId);
    List<FeedbackIntegrationScoreResponse> getIntegrationScores(Long campaignId);
    List<FeedbackIntegrationScoreResponse> getIntegrationScoresForEmployee(Long employeeId);
}
