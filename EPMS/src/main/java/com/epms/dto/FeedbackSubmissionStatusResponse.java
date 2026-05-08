package com.epms.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class FeedbackSubmissionStatusResponse {
    private Long evaluatorAssignmentId;
    private Long requestId;
    private Long campaignId;
    private String campaignName;
    private String campaignStatus;
    private Long targetEmployeeId;
    private String targetEmployeeName;
    private String relationshipType;
    private String status;
    private Boolean canSubmit;
    private String lifecycleMessage;
    private LocalDateTime dueAt;
}
