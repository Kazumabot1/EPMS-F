package com.epms.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class ConsolidatedFeedbackReportResponse {
    private Long campaignId;
    private String campaignName;
    /** Normalized 0-100 percentage score. */
    private Double campaignAverageScore;
    private String campaignScoreCategory;
    private Long totalResponses;
    private Long totalEmployees;
    private Long managerResponses;
    private Long peerResponses;
    private Long subordinateResponses;
    private Long selfResponses;
    /** Aggregated source-type data only. No evaluator identity is exposed here. */
    private List<FeedbackSourceBreakdownResponse> sourceBreakdown;
    private List<ConsolidatedFeedbackItemResponse> items;
}
