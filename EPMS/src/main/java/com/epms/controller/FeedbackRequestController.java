package com.epms.controller;

import com.epms.dto.FeedbackRequestListResponse;
import com.epms.dto.GenericApiResponse;
import com.epms.entity.FeedbackRequest;
import com.epms.service.FeedbackRequestService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/feedback/requests")
@RequiredArgsConstructor
public class FeedbackRequestController {

    private final FeedbackRequestService feedbackRequestService;

    @GetMapping("/{employeeId}")
    public ResponseEntity<GenericApiResponse<Page<FeedbackRequestListResponse>>> getRequestsForEmployee(
            @PathVariable Long employeeId,
            Pageable pageable
    ) {
        List<FeedbackRequest> requests = feedbackRequestService.getRequestsForEmployee(employeeId);
        List<FeedbackRequestListResponse> dtoList = requests.stream()
                .map(req -> FeedbackRequestListResponse.builder()
                        .id(req.getId())
                        .campaignId(req.getCampaign().getId())
                        .campaignName(req.getCampaign().getName())
                        .targetEmployeeId(req.getTargetEmployeeId())
                        .totalAssignments(req.getAssignments() != null ? req.getAssignments().size() : 0)
                        .submittedAssignments(
                                req.getAssignments() == null
                                        ? 0
                                        : req.getAssignments().stream().filter(a -> "SUBMITTED".equals(a.getStatus().name())).count()
                        )
                        .build())
                .toList();

        int start = (int) pageable.getOffset();
        int end = Math.min(start + pageable.getPageSize(), dtoList.size());
        List<FeedbackRequestListResponse> content = start >= dtoList.size()
                ? List.of()
                : dtoList.subList(start, end);

        return ResponseEntity.ok(GenericApiResponse.success(
                "Feedback requests fetched successfully",
                new PageImpl<>(content, pageable, dtoList.size())
        ));
    }
}
