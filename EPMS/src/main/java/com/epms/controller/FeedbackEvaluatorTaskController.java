package com.epms.controller;

import com.epms.dto.FeedbackAssignmentDetailResponse;
import com.epms.dto.FeedbackEvaluatorTaskResponse;
import com.epms.dto.GenericApiResponse;
import com.epms.security.SecurityUtils;
import com.epms.service.FeedbackEvaluatorTaskService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/feedback")
@RequiredArgsConstructor
public class FeedbackEvaluatorTaskController {

    private final FeedbackEvaluatorTaskService feedbackEvaluatorTaskService;

    @GetMapping("/my-tasks")
    public ResponseEntity<GenericApiResponse<List<FeedbackEvaluatorTaskResponse>>> getMyTasks() {
        List<FeedbackEvaluatorTaskResponse> tasks = feedbackEvaluatorTaskService
                .getMyTasks(SecurityUtils.currentUserId().longValue());
        return ResponseEntity.ok(GenericApiResponse.success("Feedback tasks retrieved successfully", tasks));
    }

    @GetMapping("/assignments/{assignmentId}")
    public ResponseEntity<GenericApiResponse<FeedbackAssignmentDetailResponse>> getAssignmentDetail(
            @PathVariable Long assignmentId
    ) {
        FeedbackAssignmentDetailResponse assignment = feedbackEvaluatorTaskService.getAssignmentDetail(
                assignmentId,
                SecurityUtils.currentUserId().longValue()
        );
        return ResponseEntity.ok(GenericApiResponse.success("Feedback assignment retrieved successfully", assignment));
    }
}
