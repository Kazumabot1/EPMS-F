package com.epms.service;

import com.epms.dto.FeedbackCampaignSummaryResponse;
import com.epms.dto.FeedbackMyResultResponse;
import com.epms.dto.FeedbackTeamSummaryResponse;

public interface FeedbackSummaryService {
    FeedbackCampaignSummaryResponse getCampaignSummary(Long campaignId);
    FeedbackMyResultResponse getMyResult(Long userId);
    FeedbackTeamSummaryResponse getTeamSummary(Long userId);
}
