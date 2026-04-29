package com.epms.service;

import com.epms.dto.FeedbackAssignmentDetailResponse;
import com.epms.dto.FeedbackEvaluatorTaskResponse;

import java.util.List;

public interface FeedbackEvaluatorTaskService {
    List<FeedbackEvaluatorTaskResponse> getMyTasks(Long userId);
    FeedbackAssignmentDetailResponse getAssignmentDetail(Long assignmentId, Long userId);
}
