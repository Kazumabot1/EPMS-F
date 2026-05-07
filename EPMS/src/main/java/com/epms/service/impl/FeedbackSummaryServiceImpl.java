package com.epms.service.impl;

import com.epms.dto.FeedbackCampaignSummaryResponse;
import com.epms.dto.FeedbackIntegrationScoreResponse;
import com.epms.dto.FeedbackMyResultResponse;
import com.epms.dto.FeedbackResultItemResponse;
import com.epms.dto.FeedbackTeamSummaryResponse;
import com.epms.entity.Employee;
import com.epms.entity.FeedbackCampaign;
import com.epms.entity.FeedbackEvaluatorAssignment;
import com.epms.entity.FeedbackRequest;
import com.epms.entity.FeedbackResponse;
import com.epms.entity.FeedbackSummary;
import com.epms.entity.User;
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
import com.epms.repository.FeedbackSummaryRepository;
import com.epms.repository.UserRepository;
import com.epms.service.FeedbackSummaryService;
import com.epms.util.FeedbackScoreUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class FeedbackSummaryServiceImpl implements FeedbackSummaryService {

    private static final String SCORE_METHOD = "SUBMITTED_RESPONSE_AVERAGE";

    private final FeedbackCampaignRepository feedbackCampaignRepository;
    private final FeedbackRequestRepository feedbackRequestRepository;
    private final FeedbackEvaluatorAssignmentRepository feedbackEvaluatorAssignmentRepository;
    private final FeedbackResponseRepository feedbackResponseRepository;
    private final FeedbackSummaryRepository feedbackSummaryRepository;
    private final UserRepository userRepository;
    private final EmployeeRepository employeeRepository;

    @Override
    @Transactional
    public FeedbackCampaignSummaryResponse getCampaignSummary(Long campaignId) {
        FeedbackCampaign campaign = getClosedCampaign(campaignId);
        List<FeedbackSummary> summaries = refreshCampaignSummary(campaign);
        return buildCampaignSummary(campaign, summaries);
    }

    @Override
    @Transactional
    public FeedbackCampaignSummaryResponse recalculateCampaignSummary(Long campaignId) {
        FeedbackCampaign campaign = getCampaign(campaignId);
        List<FeedbackSummary> summaries = refreshCampaignSummary(campaign);
        return buildCampaignSummary(campaign, summaries);
    }

    @Override
    @Transactional
    public FeedbackMyResultResponse getMyResult(Long userId) {
        User user = getUser(userId);
        Long employeeId = requireEmployeeId(user);
        refreshClosedCampaignSummariesForEmployee(employeeId);

        List<FeedbackSummary> results = feedbackSummaryRepository.findByTargetEmployeeIdOrderByCampaignEndDateDesc(employeeId)
                .stream()
                .filter(summary -> summary.getCampaign().getStatus() == FeedbackCampaignStatus.CLOSED)
                .toList();

        String employeeName = loadEmployeeNames(List.of(employeeId)).getOrDefault(employeeId, "Employee #" + employeeId);
        return FeedbackMyResultResponse.builder()
                .employeeId(employeeId)
                .employeeName(employeeName)
                .results(mapResults(results, Map.of(employeeId, employeeName)))
                .build();
    }

    @Override
    @Transactional
    public FeedbackTeamSummaryResponse getTeamSummary(Long userId) {
        List<User> directReports = userRepository.findByManagerIdAndActiveTrue(userId.intValue());
        List<Long> employeeIds = directReports.stream()
                .map(User::getEmployeeId)
                .filter(Objects::nonNull)
                .map(Integer::longValue)
                .distinct()
                .toList();

        if (employeeIds.isEmpty()) {
            return FeedbackTeamSummaryResponse.builder()
                    .managerUserId(userId)
                    .totalDirectReports(0)
                    .totalClosedResults(0)
                    .items(List.of())
                    .build();
        }

        refreshClosedCampaignSummariesForEmployees(employeeIds);
        List<FeedbackSummary> summaries = feedbackSummaryRepository.findByTargetEmployeeIdInOrderByCampaignEndDateDesc(employeeIds)
                .stream()
                .filter(summary -> summary.getCampaign().getStatus() == FeedbackCampaignStatus.CLOSED)
                .toList();

        return FeedbackTeamSummaryResponse.builder()
                .managerUserId(userId)
                .totalDirectReports(employeeIds.size())
                .totalClosedResults(summaries.size())
                .items(mapResults(summaries, loadEmployeeNames(employeeIds)))
                .build();
    }

    @Override
    @Transactional
    public List<FeedbackIntegrationScoreResponse> getIntegrationScores(Long campaignId) {
        FeedbackCampaign campaign = getCampaign(campaignId);
        List<FeedbackSummary> summaries = refreshCampaignSummary(campaign);
        Map<Long, String> employeeNames = loadEmployeeNames(extractTargetEmployeeIds(summaries));
        return summaries.stream()
                .map(summary -> mapIntegrationScore(summary, employeeNames))
                .toList();
    }

    @Override
    @Transactional
    public List<FeedbackIntegrationScoreResponse> getIntegrationScoresForEmployee(Long employeeId) {
        refreshClosedCampaignSummariesForEmployee(employeeId);
        List<FeedbackSummary> summaries = feedbackSummaryRepository.findByTargetEmployeeIdOrderByCampaignEndDateDesc(employeeId);
        Map<Long, String> employeeNames = loadEmployeeNames(List.of(employeeId));
        return summaries.stream()
                .map(summary -> mapIntegrationScore(summary, employeeNames))
                .toList();
    }

    private FeedbackCampaignSummaryResponse buildCampaignSummary(FeedbackCampaign campaign, List<FeedbackSummary> summaries) {
        List<FeedbackResultItemResponse> items = mapResults(summaries, loadEmployeeNames(extractTargetEmployeeIds(summaries)));

        double overallAverage = summaries.stream()
                .map(FeedbackSummary::getAverageScore)
                .filter(Objects::nonNull)
                .mapToDouble(Double::doubleValue)
                .average()
                .orElse(0.0);
        long totalResponses = summaries.stream().mapToLong(summary -> safeLong(summary.getTotalResponses())).sum();
        long assignedCount = summaries.stream().mapToLong(summary -> safeLong(summary.getAssignedEvaluatorCount())).sum();
        long submittedCount = summaries.stream().mapToLong(summary -> safeLong(summary.getSubmittedEvaluatorCount())).sum();
        long pendingCount = summaries.stream().mapToLong(summary -> safeLong(summary.getPendingEvaluatorCount())).sum();
        double completionRate = assignedCount == 0 ? 0.0 : roundToTwoDecimals((submittedCount * 100.0) / assignedCount);
        long insufficientCount = summaries.stream().filter(summary -> Boolean.TRUE.equals(summary.getInsufficientFeedback())).count();
        LocalDateTime summarizedAt = summaries.stream()
                .map(FeedbackSummary::getSummarizedAt)
                .filter(Objects::nonNull)
                .max(LocalDateTime::compareTo)
                .orElse(LocalDateTime.now());

        return FeedbackCampaignSummaryResponse.builder()
                .campaignId(campaign.getId())
                .campaignName(campaign.getName())
                .status(campaign.getStatus().name())
                .overallAverageScore(roundToTwoDecimals(overallAverage))
                .overallScoreCategory(FeedbackScoreUtil.category(overallAverage))
                .totalEmployees((long) items.size())
                .totalResponses(totalResponses)
                .assignedEvaluatorCount(assignedCount)
                .submittedEvaluatorCount(submittedCount)
                .pendingEvaluatorCount(pendingCount)
                .completionRate(completionRate)
                .insufficientFeedbackCount(insufficientCount)
                .summarizedAt(summarizedAt)
                .items(items)
                .build();
    }

    private void refreshClosedCampaignSummariesForEmployee(Long employeeId) {
        refreshClosedCampaignSummariesForEmployees(List.of(employeeId));
    }

    private void refreshClosedCampaignSummariesForEmployees(List<Long> employeeIds) {
        List<FeedbackCampaign> closedCampaigns = feedbackCampaignRepository.findByStatusOrderByStartDateDesc(FeedbackCampaignStatus.CLOSED);
        for (FeedbackCampaign campaign : closedCampaigns) {
            List<FeedbackRequest> requests = feedbackRequestRepository.findByCampaignIdOrderByTargetEmployeeIdAsc(campaign.getId())
                    .stream()
                    .filter(request -> employeeIds.contains(request.getTargetEmployeeId()))
                    .toList();
            if (!requests.isEmpty()) {
                refreshCampaignSummary(campaign, requests);
            }
        }
    }

    private FeedbackCampaign getClosedCampaign(Long campaignId) {
        FeedbackCampaign campaign = getCampaign(campaignId);
        if (campaign.getStatus() != FeedbackCampaignStatus.CLOSED) {
            throw new BusinessValidationException("Feedback results are available only after the campaign is CLOSED.");
        }
        return campaign;
    }

    private FeedbackCampaign getCampaign(Long campaignId) {
        return feedbackCampaignRepository.findById(campaignId)
                .orElseThrow(() -> new ResourceNotFoundException("Feedback campaign not found."));
    }

    private List<FeedbackSummary> refreshCampaignSummary(FeedbackCampaign campaign) {
        List<FeedbackRequest> requests = feedbackRequestRepository.findByCampaignIdOrderByTargetEmployeeIdAsc(campaign.getId());
        return refreshCampaignSummary(campaign, requests);
    }

    private List<FeedbackSummary> refreshCampaignSummary(FeedbackCampaign campaign, List<FeedbackRequest> requests) {
        List<FeedbackEvaluatorAssignment> campaignAssignments = feedbackEvaluatorAssignmentRepository.findByCampaignIdWithRequest(campaign.getId());
        List<FeedbackResponse> submittedResponses = feedbackResponseRepository.findByCampaignIdAndStatus(campaign.getId(), ResponseStatus.SUBMITTED);

        Map<Long, List<FeedbackEvaluatorAssignment>> assignmentsByRequestId = campaignAssignments.stream()
                .collect(Collectors.groupingBy(assignment -> assignment.getFeedbackRequest().getId()));

        Map<Long, FeedbackResponse> submittedResponseByAssignmentId = submittedResponses.stream()
                .filter(response -> response.getEvaluatorAssignment() != null)
                .collect(Collectors.toMap(
                        response -> response.getEvaluatorAssignment().getId(),
                        response -> response,
                        (first, duplicate) -> first
                ));

        List<FeedbackSummary> persisted = new ArrayList<>();
        Set<Long> activeTargetEmployeeIds = new HashSet<>();
        LocalDateTime now = LocalDateTime.now();

        for (FeedbackRequest request : requests) {
            Long targetEmployeeId = request.getTargetEmployeeId();
            activeTargetEmployeeIds.add(targetEmployeeId);
            List<FeedbackEvaluatorAssignment> assignments = assignmentsByRequestId.getOrDefault(request.getId(), List.of());
            List<FeedbackEvaluatorAssignment> countedAssignments = assignments.stream()
                    .filter(assignment -> assignment.getStatus() != AssignmentStatus.CANCELLED)
                    .toList();
            List<FeedbackResponse> responses = countedAssignments.stream()
                    .map(assignment -> submittedResponseByAssignmentId.get(assignment.getId()))
                    .filter(Objects::nonNull)
                    .toList();

            FeedbackSummary summary = feedbackSummaryRepository.findByCampaignIdAndTargetEmployeeId(campaign.getId(), targetEmployeeId)
                    .orElseGet(FeedbackSummary::new);
            applySummaryValues(summary, campaign, targetEmployeeId, countedAssignments, responses, now);
            persisted.add(feedbackSummaryRepository.save(summary));
        }

        List<FeedbackSummary> existing = feedbackSummaryRepository.findByCampaignIdOrderByTargetEmployeeIdAsc(campaign.getId());
        for (FeedbackSummary summary : existing) {
            if (!activeTargetEmployeeIds.contains(summary.getTargetEmployeeId())) {
                feedbackSummaryRepository.delete(summary);
            }
        }

        return persisted.stream()
                .sorted(Comparator.comparing(FeedbackSummary::getTargetEmployeeId))
                .toList();
    }

    private void applySummaryValues(
            FeedbackSummary summary,
            FeedbackCampaign campaign,
            Long targetEmployeeId,
            List<FeedbackEvaluatorAssignment> assignments,
            List<FeedbackResponse> responses,
            LocalDateTime summarizedAt
    ) {
        long assignedCount = assignments.size();
        long submittedCount = responses.size();
        long pendingCount = Math.max(0, assignedCount - submittedCount);
        double completionRate = assignedCount == 0 ? 0.0 : roundToTwoDecimals((submittedCount * 100.0) / assignedCount);
        Double rawAverage = averageScore(responses);
        String confidenceLevel = determineConfidenceLevel(assignedCount, submittedCount, completionRate);
        boolean insufficientFeedback = isInsufficientFeedback(assignedCount, submittedCount);

        summary.setCampaign(campaign);
        summary.setTargetEmployeeId(targetEmployeeId);
        summary.setRawAverageScore(rawAverage);
        summary.setAverageScore(rawAverage);
        summary.setTotalResponses(submittedCount);
        summary.setManagerResponses(countByRelationship(responses, FeedbackRelationshipType.MANAGER));
        summary.setPeerResponses(countByRelationship(responses, FeedbackRelationshipType.PEER));
        summary.setSubordinateResponses(countByRelationship(responses, FeedbackRelationshipType.SUBORDINATE));
        summary.setSelfResponses(countByRelationship(responses, FeedbackRelationshipType.SELF));
        summary.setProjectStakeholderResponses(countByRelationship(responses, FeedbackRelationshipType.PROJECT_STAKEHOLDER));
        summary.setAssignedEvaluatorCount(assignedCount);
        summary.setSubmittedEvaluatorCount(submittedCount);
        summary.setPendingEvaluatorCount(pendingCount);
        summary.setCompletionRate(completionRate);
        summary.setConfidenceLevel(confidenceLevel);
        summary.setInsufficientFeedback(insufficientFeedback);
        summary.setScoreCalculationMethod(SCORE_METHOD);
        summary.setScoreCalculationNote(buildScoreCalculationNote(assignedCount, submittedCount, insufficientFeedback));
        summary.setManagerAverageScore(averageScoreByRelationship(responses, FeedbackRelationshipType.MANAGER));
        summary.setPeerAverageScore(averageScoreByRelationship(responses, FeedbackRelationshipType.PEER));
        summary.setSubordinateAverageScore(averageScoreByRelationship(responses, FeedbackRelationshipType.SUBORDINATE));
        summary.setSelfAverageScore(averageScoreByRelationship(responses, FeedbackRelationshipType.SELF));
        summary.setProjectStakeholderAverageScore(averageScoreByRelationship(responses, FeedbackRelationshipType.PROJECT_STAKEHOLDER));
        summary.setSummarizedAt(summarizedAt);
    }

    private String buildScoreCalculationNote(long assignedCount, long submittedCount, boolean insufficientFeedback) {
        if (assignedCount == 0) {
            return "No evaluator assignments exist for this target employee.";
        }
        if (submittedCount == 0) {
            return "No submitted feedback responses are available yet.";
        }
        if (insufficientFeedback) {
            return "Feedback score is calculated from submitted responses, but confidence is low because too few evaluators submitted.";
        }
        return "Feedback score is the average of submitted evaluator response scores. It is a 360 feedback score only, not a final performance score.";
    }

    private boolean isInsufficientFeedback(long assignedCount, long submittedCount) {
        if (submittedCount == 0) {
            return true;
        }
        return assignedCount > 1 && submittedCount < 2;
    }

    private String determineConfidenceLevel(long assignedCount, long submittedCount, double completionRate) {
        if (assignedCount == 0 || submittedCount == 0) {
            return "INSUFFICIENT";
        }
        if (submittedCount < 2 || completionRate < 50.0) {
            return "LOW";
        }
        if (completionRate < 100.0 || submittedCount < 3) {
            return "MEDIUM";
        }
        return "HIGH";
    }

    private long countByRelationship(List<FeedbackResponse> responses, FeedbackRelationshipType relationshipType) {
        return responses.stream()
                .filter(response -> response.getEvaluatorAssignment().getRelationshipType() == relationshipType)
                .count();
    }

    private Double averageScore(List<FeedbackResponse> responses) {
        return responses.stream()
                .map(FeedbackResponse::getOverallScore)
                .filter(Objects::nonNull)
                .mapToDouble(Double::doubleValue)
                .average()
                .stream()
                .map(this::roundToTwoDecimals)
                .boxed()
                .findFirst()
                .orElse(null);
    }

    private Double averageScoreByRelationship(List<FeedbackResponse> responses, FeedbackRelationshipType relationshipType) {
        return averageScore(responses.stream()
                .filter(response -> response.getEvaluatorAssignment().getRelationshipType() == relationshipType)
                .toList());
    }

    private List<FeedbackResultItemResponse> mapResults(List<FeedbackSummary> summaries, Map<Long, String> employeeNames) {
        return summaries.stream()
                .map(summary -> FeedbackResultItemResponse.builder()
                        .campaignId(summary.getCampaign().getId())
                        .campaignName(summary.getCampaign().getName())
                        .targetEmployeeId(summary.getTargetEmployeeId())
                        .targetEmployeeName(employeeNames.getOrDefault(
                                summary.getTargetEmployeeId(),
                                "Employee #" + summary.getTargetEmployeeId()
                        ))
                        .averageScore(summary.getAverageScore())
                        .rawAverageScore(summary.getRawAverageScore())
                        .scoreCategory(FeedbackScoreUtil.category(summary.getAverageScore()))
                        .totalResponses(safeLong(summary.getTotalResponses()))
                        .managerResponses(safeLong(summary.getManagerResponses()))
                        .peerResponses(safeLong(summary.getPeerResponses()))
                        .subordinateResponses(safeLong(summary.getSubordinateResponses()))
                        .selfResponses(safeLong(summary.getSelfResponses()))
                        .projectStakeholderResponses(safeLong(summary.getProjectStakeholderResponses()))
                        .assignedEvaluatorCount(safeLong(summary.getAssignedEvaluatorCount()))
                        .submittedEvaluatorCount(safeLong(summary.getSubmittedEvaluatorCount()))
                        .pendingEvaluatorCount(safeLong(summary.getPendingEvaluatorCount()))
                        .completionRate(safeDouble(summary.getCompletionRate()))
                        .confidenceLevel(summary.getConfidenceLevel())
                        .insufficientFeedback(Boolean.TRUE.equals(summary.getInsufficientFeedback()))
                        .managerAverageScore(summary.getManagerAverageScore())
                        .peerAverageScore(summary.getPeerAverageScore())
                        .subordinateAverageScore(summary.getSubordinateAverageScore())
                        .selfAverageScore(summary.getSelfAverageScore())
                        .projectStakeholderAverageScore(summary.getProjectStakeholderAverageScore())
                        .scoreCalculationMethod(summary.getScoreCalculationMethod())
                        .scoreCalculationNote(summary.getScoreCalculationNote())
                        .summarizedAt(summary.getSummarizedAt())
                        .build())
                .toList();
    }

    private FeedbackIntegrationScoreResponse mapIntegrationScore(FeedbackSummary summary, Map<Long, String> employeeNames) {
        return FeedbackIntegrationScoreResponse.builder()
                .campaignId(summary.getCampaign().getId())
                .campaignName(summary.getCampaign().getName())
                .campaignStatus(summary.getCampaign().getStatus().name())
                .targetEmployeeId(summary.getTargetEmployeeId())
                .targetEmployeeName(employeeNames.getOrDefault(summary.getTargetEmployeeId(), "Employee #" + summary.getTargetEmployeeId()))
                .feedbackScore(summary.getAverageScore())
                .rawFeedbackScore(summary.getRawAverageScore())
                .scoreBand(FeedbackScoreUtil.category(summary.getAverageScore()))
                .assignedEvaluatorCount(safeLong(summary.getAssignedEvaluatorCount()))
                .submittedEvaluatorCount(safeLong(summary.getSubmittedEvaluatorCount()))
                .pendingEvaluatorCount(safeLong(summary.getPendingEvaluatorCount()))
                .completionRate(safeDouble(summary.getCompletionRate()))
                .confidenceLevel(summary.getConfidenceLevel())
                .insufficientFeedback(Boolean.TRUE.equals(summary.getInsufficientFeedback()))
                .managerAverageScore(summary.getManagerAverageScore())
                .peerAverageScore(summary.getPeerAverageScore())
                .subordinateAverageScore(summary.getSubordinateAverageScore())
                .selfAverageScore(summary.getSelfAverageScore())
                .projectStakeholderAverageScore(summary.getProjectStakeholderAverageScore())
                .managerResponses(safeLong(summary.getManagerResponses()))
                .peerResponses(safeLong(summary.getPeerResponses()))
                .subordinateResponses(safeLong(summary.getSubordinateResponses()))
                .selfResponses(safeLong(summary.getSelfResponses()))
                .projectStakeholderResponses(safeLong(summary.getProjectStakeholderResponses()))
                .scoreCalculationMethod(summary.getScoreCalculationMethod())
                .scoreCalculationNote(summary.getScoreCalculationNote())
                .summarizedAt(summary.getSummarizedAt())
                .build();
    }

    private List<Long> extractTargetEmployeeIds(List<FeedbackSummary> summaries) {
        return summaries.stream()
                .map(FeedbackSummary::getTargetEmployeeId)
                .distinct()
                .toList();
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

    private User getUser(Long userId) {
        return userRepository.findById(userId.intValue())
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));
    }

    private Long requireEmployeeId(User user) {
        if (user.getEmployeeId() == null) {
            throw new BusinessValidationException("This user is not linked to an employee record.");
        }
        return user.getEmployeeId().longValue();
    }

    private long safeLong(Long value) {
        return value == null ? 0L : value;
    }

    private double safeDouble(Double value) {
        return value == null ? 0.0 : value;
    }

    private double roundToTwoDecimals(double value) {
        return Math.round(value * 100.0) / 100.0;
    }
}
