package com.epms.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class FeedbackReceivedItemResponse {
    private Long responseId;
    private Long requestId;
    private Long campaignId;
    private String campaignName;
    private Long targetEmployeeId;
    private Double overallScore;
    private String comments;
    private LocalDateTime submittedAt;
    private String sourceType;
    private Boolean anonymous;
    private Long evaluatorEmployeeId;
}
