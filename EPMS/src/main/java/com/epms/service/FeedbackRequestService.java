package com.epms.service;

import com.epms.dto.ConsolidatedFeedbackReportResponse;
import com.epms.dto.FeedbackCompletionDashboardResponse;
import com.epms.entity.FeedbackRequest;
import com.epms.repository.projection.FeedbackSummaryProjection;

import java.util.List;

public interface FeedbackRequestService {
    FeedbackSummaryProjection getFeedbackSummary(Long requestId);
    List<FeedbackRequest> getRequestsForEmployee(Long employeeId);
    FeedbackCompletionDashboardResponse getCompletionDashboard(Long campaignId);
    ConsolidatedFeedbackReportResponse getConsolidatedReport(Long campaignId);
}
