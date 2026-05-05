package com.epms.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class FeedbackCompletionDashboardResponse {
    private Long campaignId;
    private String campaignName;
    private Long totalRequests;
    private Long totalAssignments;
    private Long submittedAssignments;
    private Double completionPercent;
    private Long pendingUsers;
    private List<FeedbackCompletionItemResponse> requests;
}
