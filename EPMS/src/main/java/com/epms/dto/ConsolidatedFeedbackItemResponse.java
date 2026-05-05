package com.epms.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class ConsolidatedFeedbackItemResponse {
    private Long targetEmployeeId;
    private String targetEmployeeName;
    /** Normalized 0-100 percentage score. */
    private Double averageScore;
    private String scoreCategory;
    private Long totalResponses;
    private Long managerResponses;
    private Long peerResponses;
    private Long subordinateResponses;
    private Long selfResponses;
    private Double managerAverageScore;
    private Double peerAverageScore;
    private Double subordinateAverageScore;
    private Double selfAverageScore;
    /** Aggregated source-type data only. No evaluator identity is exposed here. */
    private List<FeedbackSourceBreakdownResponse> sourceBreakdown;
}
