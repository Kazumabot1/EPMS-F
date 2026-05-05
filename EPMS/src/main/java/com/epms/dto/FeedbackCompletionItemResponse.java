package com.epms.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class FeedbackCompletionItemResponse {
    private Long requestId;
    private Long targetEmployeeId;
    private Long totalEvaluators;
    private Long submittedEvaluators;
    private Long pendingEvaluators;
    private Double completionPercent;
}
