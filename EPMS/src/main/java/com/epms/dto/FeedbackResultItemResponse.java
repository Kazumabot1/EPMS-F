package com.epms.dto;

import lombok.Builder;
import lombok.Value;

import java.time.LocalDateTime;

@Value
@Builder
public class FeedbackResultItemResponse {
    Long campaignId;
    String campaignName;
    Long targetEmployeeId;
    String targetEmployeeName;
    /** Normalized 0-100 percentage score. */
    Double averageScore;
    String scoreCategory;
    Long totalResponses;
    Long managerResponses;
    Long peerResponses;
    Long subordinateResponses;
    LocalDateTime summarizedAt;
}
