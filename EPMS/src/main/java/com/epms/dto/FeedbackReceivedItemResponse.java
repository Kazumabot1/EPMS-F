package com.epms.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class FeedbackReceivedItemResponse {
    private Long responseId;
    private Long requestId;
    private Long campaignId;
    private String campaignName;
    private String campaignStatus;
    private Long targetEmployeeId;
    private String targetEmployeeName;
    private Double overallScore;
    private String scoreCategory;
    private String comments;
    private LocalDateTime submittedAt;
    private String relationshipType;
    private Boolean anonymous;
    private Long evaluatorEmployeeId;
    private String evaluatorDisplayName;
    private Boolean evaluatorIdentityVisible;
    private String evaluatorSourceLabel;
    private String identityProtectionReason;
    private String visibilityReason;
    private List<FeedbackReceivedQuestionItemResponse> questionItems;
}
