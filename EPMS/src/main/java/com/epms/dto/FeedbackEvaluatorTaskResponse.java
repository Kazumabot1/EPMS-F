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
    Long targetEmployeeId;
    String targetEmployeeName;
    String relationshipType;
    Boolean anonymous;
    String status;
    LocalDateTime dueAt;
    LocalDateTime submittedAt;
}
