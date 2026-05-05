package com.epms.service;

import com.epms.dto.EvaluatorConfigDTO;
import com.epms.dto.FeedbackAssignmentGenerationResponse;
import com.epms.dto.FeedbackManualAssignmentRequest;
import com.epms.repository.projection.PendingEvaluatorProjection;

import java.util.List;

public interface FeedbackEvaluationService {
    FeedbackAssignmentGenerationResponse generateAssignments(Long campaignId, EvaluatorConfigDTO config);
    FeedbackAssignmentGenerationResponse getAssignmentPreview(Long campaignId);
    FeedbackAssignmentGenerationResponse addManualAssignment(Long campaignId, FeedbackManualAssignmentRequest request);
    FeedbackAssignmentGenerationResponse removeAssignment(Long campaignId, Long assignmentId);
    List<PendingEvaluatorProjection> getPendingEvaluators(Long requestId);
}
