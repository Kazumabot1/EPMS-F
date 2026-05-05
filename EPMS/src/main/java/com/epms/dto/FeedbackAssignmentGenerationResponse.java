package com.epms.dto;

import lombok.Builder;
import lombok.Value;

import java.util.List;

@Value
@Builder
public class FeedbackAssignmentGenerationResponse {
    Long campaignId;
    int totalTargets;
    int totalEvaluatorsGenerated;
    EvaluatorConfigDTO evaluatorConfig;
    List<FeedbackAssignmentPreviewItemResponse> requests;
    List<FeedbackAssignmentDetailItemResponse> assignmentDetails;
    List<String> warnings;
}
