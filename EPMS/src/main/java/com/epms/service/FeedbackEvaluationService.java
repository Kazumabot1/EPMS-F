package com.epms.service;

import com.epms.dto.EvaluatorConfigDTO;
import com.epms.dto.FeedbackAssignmentGenerationResponse;
import com.epms.repository.projection.PendingEvaluatorProjection;

import java.util.List;

public interface FeedbackEvaluationService {
    FeedbackAssignmentGenerationResponse generateAssignments(Long campaignId, EvaluatorConfigDTO config);
    List<PendingEvaluatorProjection> getPendingEvaluators(Long requestId);
}
