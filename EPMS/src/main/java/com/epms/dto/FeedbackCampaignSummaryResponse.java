package com.epms.dto;

import lombok.Builder;
import lombok.Value;

import java.time.LocalDateTime;
import java.util.List;

@Value
@Builder
public class FeedbackCampaignSummaryResponse {
    Long campaignId;
    String campaignName;
    String status;
    /** Normalized 0-100 percentage score. */
    Double overallAverageScore;
    String overallScoreCategory;
    Long totalEmployees;
    Long totalResponses;
    LocalDateTime summarizedAt;
    List<FeedbackResultItemResponse> items;
}
