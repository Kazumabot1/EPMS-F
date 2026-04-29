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
    Double overallAverageScore;
    Long totalEmployees;
    Long totalResponses;
    LocalDateTime summarizedAt;
    List<FeedbackResultItemResponse> items;
}
