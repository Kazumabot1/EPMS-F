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
    Double averageScore;
    Long totalResponses;
    Long managerResponses;
    Long peerResponses;
    Long subordinateResponses;
    LocalDateTime summarizedAt;
}
