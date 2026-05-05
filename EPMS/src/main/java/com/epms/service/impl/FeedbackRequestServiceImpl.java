package com.epms.service.impl;

import com.epms.dto.ConsolidatedFeedbackItemResponse;
import com.epms.dto.ConsolidatedFeedbackReportResponse;
import com.epms.dto.FeedbackCompletionDashboardResponse;
import com.epms.dto.FeedbackCompletionItemResponse;
import com.epms.dto.FeedbackSourceBreakdownResponse;
import com.epms.entity.Employee;
import com.epms.entity.FeedbackCampaign;
import com.epms.entity.FeedbackRequest;
import com.epms.entity.FeedbackResponse;
import com.epms.entity.enums.AssignmentStatus;
import com.epms.entity.enums.FeedbackCampaignStatus;
import com.epms.entity.enums.FeedbackRelationshipType;
import com.epms.entity.enums.ResponseStatus;
import com.epms.exception.BusinessValidationException;
import com.epms.exception.ResourceNotFoundException;
import com.epms.repository.EmployeeRepository;
import com.epms.repository.FeedbackCampaignRepository;
import com.epms.repository.FeedbackEvaluatorAssignmentRepository;
import com.epms.repository.FeedbackRequestRepository;
import com.epms.repository.FeedbackResponseRepository;
import com.epms.repository.projection.FeedbackSummaryProjection;
import com.epms.service.FeedbackRequestService;
import com.epms.util.FeedbackScoreUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Service
@RequiredArgsConstructor
public class FeedbackRequestServiceImpl implements FeedbackRequestService {

    private final FeedbackRequestRepository feedbackRequestRepository;
    private final FeedbackCampaignRepository feedbackCampaignRepository;
    private final FeedbackEvaluatorAssignmentRepository assignmentRepository;
    private final FeedbackResponseRepository responseRepository;
    private final EmployeeRepository employeeRepository;

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
                    List<com.epms.entity.FeedbackEvaluatorAssignment> activeAssignments = assignmentRepository
                            .findByFeedbackRequestId(request.getId())
                            .stream()
                            .filter(assignment -> assignment.getStatus() != AssignmentStatus.CANCELLED)
                            .toList();
                    long total = activeAssignments.size();
                    long submitted = activeAssignments.stream()
                            .filter(assignment -> assignment.getStatus() == AssignmentStatus.SUBMITTED)
                            .count();
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
        if (campaign.getStatus() != FeedbackCampaignStatus.CLOSED) {
            throw new BusinessValidationException("Consolidated feedback report is available only after the campaign is CLOSED.");
        }
        List<FeedbackResponse> responses = responseRepository.findByCampaignIdAndStatus(campaignId, ResponseStatus.SUBMITTED);

        Map<Long, List<FeedbackResponse>> byTarget = responses.stream()
                .collect(Collectors.groupingBy(r -> r.getEvaluatorAssignment().getFeedbackRequest().getTargetEmployeeId()));
        Map<Long, String> employeeNames = loadEmployeeNames(byTarget.keySet().stream().toList());

        List<ConsolidatedFeedbackItemResponse> items = byTarget.entrySet().stream()
                .map(entry -> buildConsolidatedItem(entry.getKey(), entry.getValue(), employeeNames))
                .sorted(Comparator.comparing(ConsolidatedFeedbackItemResponse::getTargetEmployeeId))
                .toList();

        double campaignAverageScore = averageScore(responses);

        return ConsolidatedFeedbackReportResponse.builder()
                .campaignId(campaignId)
                .campaignName(campaign.getName())
                .campaignAverageScore(campaignAverageScore)
                .campaignScoreCategory(FeedbackScoreUtil.category(campaignAverageScore))
                .totalResponses((long) responses.size())
                .totalEmployees((long) items.size())
                .managerResponses(countByRelationship(responses, FeedbackRelationshipType.MANAGER))
                .peerResponses(countByRelationship(responses, FeedbackRelationshipType.PEER))
                .subordinateResponses(countByRelationship(responses, FeedbackRelationshipType.SUBORDINATE))
                .selfResponses(countByRelationship(responses, FeedbackRelationshipType.SELF))
                .sourceBreakdown(buildSourceBreakdown(responses))
                .items(items)
                .build();
    }

    private ConsolidatedFeedbackItemResponse buildConsolidatedItem(
            Long targetEmployeeId,
            List<FeedbackResponse> targetResponses,
            Map<Long, String> employeeNames
    ) {
        double averageScore = averageScore(targetResponses);
        return ConsolidatedFeedbackItemResponse.builder()
                .targetEmployeeId(targetEmployeeId)
                .targetEmployeeName(employeeNames.getOrDefault(targetEmployeeId, "Employee #" + targetEmployeeId))
                .averageScore(averageScore)
                .scoreCategory(FeedbackScoreUtil.category(averageScore))
                .totalResponses((long) targetResponses.size())
                .managerResponses(countByRelationship(targetResponses, FeedbackRelationshipType.MANAGER))
                .peerResponses(countByRelationship(targetResponses, FeedbackRelationshipType.PEER))
                .subordinateResponses(countByRelationship(targetResponses, FeedbackRelationshipType.SUBORDINATE))
                .selfResponses(countByRelationship(targetResponses, FeedbackRelationshipType.SELF))
                .managerAverageScore(averageScoreByRelationship(targetResponses, FeedbackRelationshipType.MANAGER))
                .peerAverageScore(averageScoreByRelationship(targetResponses, FeedbackRelationshipType.PEER))
                .subordinateAverageScore(averageScoreByRelationship(targetResponses, FeedbackRelationshipType.SUBORDINATE))
                .selfAverageScore(averageScoreByRelationship(targetResponses, FeedbackRelationshipType.SELF))
                .sourceBreakdown(buildSourceBreakdown(targetResponses))
                .build();
    }

    private List<FeedbackSourceBreakdownResponse> buildSourceBreakdown(List<FeedbackResponse> responses) {
        return Stream.of(
                        FeedbackRelationshipType.MANAGER,
                        FeedbackRelationshipType.PEER,
                        FeedbackRelationshipType.SUBORDINATE,
                        FeedbackRelationshipType.SELF
                )
                .map(type -> {
                    long count = countByRelationship(responses, type);
                    double average = averageScoreByRelationship(responses, type);
                    return FeedbackSourceBreakdownResponse.builder()
                            .sourceType(type.name())
                            .responseCount(count)
                            .averageScore(average)
                            .scoreCategory(FeedbackScoreUtil.category(average))
                            .build();
                })
                .toList();
    }

    private long countByRelationship(List<FeedbackResponse> responses, FeedbackRelationshipType relationshipType) {
        return responses.stream()
                .filter(response -> response.getEvaluatorAssignment().getRelationshipType() == relationshipType)
                .count();
    }

    private double averageScoreByRelationship(List<FeedbackResponse> responses, FeedbackRelationshipType relationshipType) {
        return averageScore(responses.stream()
                .filter(response -> response.getEvaluatorAssignment().getRelationshipType() == relationshipType)
                .toList());
    }

    private double averageScore(List<FeedbackResponse> responses) {
        return FeedbackScoreUtil.averageOrZero(responses.stream().map(FeedbackResponse::getOverallScore));
    }

    private Map<Long, String> loadEmployeeNames(List<Long> employeeIds) {
        if (employeeIds.isEmpty()) {
            return Map.of();
        }
        Map<Long, String> names = new LinkedHashMap<>();
        List<Employee> employees = employeeRepository.findAllById(employeeIds.stream().map(Long::intValue).toList());
        for (Employee employee : employees) {
            String fullName = ((employee.getFirstName() != null ? employee.getFirstName() : "") + " "
                    + (employee.getLastName() != null ? employee.getLastName() : "")).trim();
            names.put(employee.getId().longValue(), fullName.isBlank() ? "Employee #" + employee.getId() : fullName);
        }
        for (Long employeeId : employeeIds) {
            names.putIfAbsent(employeeId, "Employee #" + employeeId);
        }
        return names;
    }
}
