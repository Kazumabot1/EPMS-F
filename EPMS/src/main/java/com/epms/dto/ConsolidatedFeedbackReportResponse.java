package com.epms.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class ConsolidatedFeedbackReportResponse {
    private Long campaignId;
    private String campaignName;
    private Double campaignAverageScore;
    private Long totalResponses;
    private List<ConsolidatedFeedbackItemResponse> items;
}
