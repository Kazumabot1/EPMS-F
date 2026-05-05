package com.epms.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class FeedbackSourceBreakdownResponse {
    private String sourceType;
    private Long responseCount;
    private Double averageScore;
    private String scoreCategory;
}
