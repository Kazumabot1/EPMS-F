package com.epms.dto;

import lombok.Builder;
import lombok.Value;

import java.time.LocalDateTime;

@Value
@Builder
public class FeedbackEvaluatorTaskResponse {
    Long assignmentId;
    Long campaignId;
    String campaignName;
    String campaignStatus;
    LocalDateTime campaignStartAt;
    Long targetEmployeeId;
    String targetEmployeeName;
    String relationshipType;
    Boolean anonymous;
    String status;
    Boolean canSubmit;
    String lifecycleMessage;
    LocalDateTime dueAt;
    LocalDateTime submittedAt;
}
