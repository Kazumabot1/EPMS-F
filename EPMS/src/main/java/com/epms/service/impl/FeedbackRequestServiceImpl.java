package com.epms.service.impl;

import com.epms.dto.ConsolidatedFeedbackItemResponse;
import com.epms.dto.ConsolidatedFeedbackReportResponse;
import com.epms.dto.FeedbackCompletionDashboardResponse;
import com.epms.dto.FeedbackCompletionItemResponse;
import com.epms.entity.FeedbackCampaign;
import com.epms.entity.FeedbackRequest;
import com.epms.entity.FeedbackResponse;
import com.epms.entity.enums.AssignmentStatus;
import com.epms.entity.enums.FeedbackRelationshipType;
import com.epms.entity.enums.ResponseStatus;
import com.epms.exception.ResourceNotFoundException;
import com.epms.repository.FeedbackCampaignRepository;
import com.epms.repository.FeedbackEvaluatorAssignmentRepository;
import com.epms.repository.FeedbackRequestRepository;
import com.epms.repository.FeedbackResponseRepository;
import com.epms.repository.projection.FeedbackSummaryProjection;
import com.epms.service.FeedbackRequestService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class FeedbackRequestServiceImpl implements FeedbackRequestService {

    private final FeedbackRequestRepository feedbackRequestRepository;
    private final FeedbackCampaignRepository feedbackCampaignRepository;
    private final FeedbackEvaluatorAssignmentRepository assignmentRepository;
    private final FeedbackResponseRepository responseRepository;

    @Override
    @Transactional(readOnly = true)
    public FeedbackSummaryProjection getFeedbackSummary(Long requestId) {
        return feedbackRequestRepository.getFeedbackSummaryByRequestId(requestId);
    }

    @Override
    @Transactional(readOnly = true)
    public List<FeedbackRequest> getRequestsForEmployee(Long employeeId) {
        return feedbackRequestRepository.findByTargetEmployeeId(employeeId);
    }

    @Override
    @Transactional(readOnly = true)
    public FeedbackCompletionDashboardResponse getCompletionDashboard(Long campaignId) {
        FeedbackCampaign campaign = feedbackCampaignRepository.findById(campaignId)
                .orElseThrow(() -> new ResourceNotFoundException("Feedback campaign not found."));
        List<FeedbackRequest> requests = feedbackRequestRepository.findByCampaignIdOrderByTargetEmployeeIdAsc(campaignId);

        List<FeedbackCompletionItemResponse> items = requests.stream()
                .map(request -> {
                    long total = assignmentRepository.countByFeedbackRequestId(request.getId());
                    long submitted = assignmentRepository.countByFeedbackRequestIdAndStatus(request.getId(), AssignmentStatus.SUBMITTED);
                    long pending = Math.max(0L, total - submitted);
                    double percent = total == 0 ? 0.0 : (submitted * 100.0) / total;
                    return FeedbackCompletionItemResponse.builder()
                            .requestId(request.getId())
                            .targetEmployeeId(request.getTargetEmployeeId())
                            .totalEvaluators(total)
                            .submittedEvaluators(submitted)
                            .pendingEvaluators(pending)
                            .completionPercent(percent)
                            .build();
                })
                .toList();

        long totalAssignments = items.stream().mapToLong(FeedbackCompletionItemResponse::getTotalEvaluators).sum();
        long submittedAssignments = items.stream().mapToLong(FeedbackCompletionItemResponse::getSubmittedEvaluators).sum();
        long pendingUsers = Math.max(0L, totalAssignments - submittedAssignments);
        double completionPercent = totalAssignments == 0 ? 0.0 : (submittedAssignments * 100.0) / totalAssignments;

        return FeedbackCompletionDashboardResponse.builder()
                .campaignId(campaignId)
                .campaignName(campaign.getName())
                .totalRequests((long) requests.size())
                .totalAssignments(totalAssignments)
                .submittedAssignments(submittedAssignments)
                .completionPercent(completionPercent)
                .pendingUsers(pendingUsers)
                .requests(items)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public ConsolidatedFeedbackReportResponse getConsolidatedReport(Long campaignId) {
        FeedbackCampaign campaign = feedbackCampaignRepository.findById(campaignId)
                .orElseThrow(() -> new ResourceNotFoundException("Feedback campaign not found."));
        List<FeedbackResponse> responses = responseRepository.findByCampaignIdAndStatus(campaignId, ResponseStatus.SUBMITTED);

        Map<Long, List<FeedbackResponse>> byTarget = responses.stream()
                .collect(Collectors.groupingBy(r -> r.getEvaluatorAssignment().getFeedbackRequest().getTargetEmployeeId()));

        List<ConsolidatedFeedbackItemResponse> items = byTarget.entrySet().stream()
                .map(entry -> {
                    Long targetEmployeeId = entry.getKey();
                    List<FeedbackResponse> targetResponses = entry.getValue();
                    double averageScore = targetResponses.stream()
                            .map(FeedbackResponse::getOverallScore)
                            .filter(java.util.Objects::nonNull)
                            .mapToDouble(Double::doubleValue)
                            .average()
                            .orElse(0.0);
                    long managerResponses = targetResponses.stream()
                            .filter(r -> r.getEvaluatorAssignment().getRelationshipType() == FeedbackRelationshipType.MANAGER)
                            .count();
                    long peerResponses = targetResponses.stream()
                            .filter(r -> r.getEvaluatorAssignment().getRelationshipType() == FeedbackRelationshipType.PEER)
                            .count();
                    long subordinateResponses = targetResponses.stream()
                            .filter(r -> r.getEvaluatorAssignment().getRelationshipType() == FeedbackRelationshipType.SUBORDINATE)
                            .count();
                    return ConsolidatedFeedbackItemResponse.builder()
                            .targetEmployeeId(targetEmployeeId)
                            .averageScore(averageScore)
                            .totalResponses((long) targetResponses.size())
                            .managerResponses(managerResponses)
                            .peerResponses(peerResponses)
                            .subordinateResponses(subordinateResponses)
                            .build();
                })
                .sorted(Comparator.comparing(ConsolidatedFeedbackItemResponse::getTargetEmployeeId))
                .toList();

        double campaignAverageScore = responses.stream()
                .map(FeedbackResponse::getOverallScore)
                .filter(java.util.Objects::nonNull)
                .mapToDouble(Double::doubleValue)
                .average()
                .orElse(0.0);

        return ConsolidatedFeedbackReportResponse.builder()
                .campaignId(campaignId)
                .campaignName(campaign.getName())
                .campaignAverageScore(campaignAverageScore)
                .totalResponses((long) responses.size())
                .items(items)
                .build();
    }
}
