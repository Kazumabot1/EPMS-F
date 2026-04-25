package com.epms.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ConsolidatedFeedbackItemResponse {
    private Long targetEmployeeId;
    private Double averageScore;
    private Long totalResponses;
    private Long managerResponses;
    private Long peerResponses;
    private Long subordinateResponses;
}
