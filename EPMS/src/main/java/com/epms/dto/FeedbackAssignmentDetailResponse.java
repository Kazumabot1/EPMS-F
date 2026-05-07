package com.epms.dto;

import lombok.Builder;
import lombok.Value;

import java.time.LocalDateTime;
import java.util.List;

@Value
@Builder
public class FeedbackAssignmentDetailResponse {
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
    LocalDateTime dueAt;
    LocalDateTime submittedAt;
    Boolean canSubmit;
    String lifecycleMessage;
    String comments;
    Integer totalQuestionCount;
    Integer requiredQuestionCount;
    Integer answeredQuestionCount;
    Integer answeredRequiredQuestionCount;
    Integer completionPercent;
    Boolean finalSubmissionReady;
    Boolean submittedLocked;
    List<FeedbackAssignmentSectionDetailResponse> sections;
}
