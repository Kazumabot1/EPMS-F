package com.epms.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class FeedbackReminderResponse {
    private Long campaignId;
    private String campaignName;
    private int pendingAssignmentCount;
    private int notifiedEvaluatorCount;
    private int skippedAssignmentCount;
    private List<String> warnings;
}
