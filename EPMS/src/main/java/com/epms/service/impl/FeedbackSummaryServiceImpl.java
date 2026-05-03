package com.epms.service.impl;

import com.epms.dto.FeedbackCampaignSummaryResponse;
import com.epms.dto.FeedbackMyResultResponse;
import com.epms.dto.FeedbackResultItemResponse;
import com.epms.dto.FeedbackTeamSummaryResponse;
import com.epms.entity.Employee;
import com.epms.entity.FeedbackCampaign;
import com.epms.entity.FeedbackResponse;
import com.epms.entity.FeedbackSummary;
import com.epms.entity.User;
import com.epms.entity.enums.FeedbackCampaignStatus;
import com.epms.entity.enums.FeedbackRelationshipType;
import com.epms.entity.enums.ResponseStatus;
import com.epms.exception.BusinessValidationException;
import com.epms.exception.ResourceNotFoundException;
import com.epms.repository.EmployeeRepository;
import com.epms.repository.FeedbackCampaignRepository;
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
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class FeedbackSummaryServiceImpl implements FeedbackSummaryService {

    private final FeedbackCampaignRepository feedbackCampaignRepository;
    private final FeedbackResponseRepository feedbackResponseRepository;
    private final FeedbackSummaryRepository feedbackSummaryRepository;
    private final UserRepository userRepository;
    private final EmployeeRepository employeeRepository;

    @Override
    @Transactional
    public FeedbackCampaignSummaryResponse getCampaignSummary(Long campaignId) {
        FeedbackCampaign campaign = getClosedCampaign(campaignId);
        List<FeedbackSummary> summaries = refreshCampaignSummary(campaign);
        List<FeedbackResultItemResponse> items = mapResults(summaries, loadEmployeeNames(extractTargetEmployeeIds(summaries)));

        double overallAverage = summaries.stream()
                .map(FeedbackSummary::getAverageScore)
                .filter(Objects::nonNull)
                .mapToDouble(Double::doubleValue)
                .average()
                .orElse(0.0);
        long totalResponses = summaries.stream()
                .mapToLong(FeedbackSummary::getTotalResponses)
                .sum();
        LocalDateTime summarizedAt = summaries.stream()
                .map(FeedbackSummary::getSummarizedAt)
                .max(LocalDateTime::compareTo)
                .orElse(LocalDateTime.now());

        return FeedbackCampaignSummaryResponse.builder()
                .campaignId(campaign.getId())
                .campaignName(campaign.getName())
                .status(campaign.getStatus().name())
                .overallAverageScore(overallAverage)
                .overallScoreCategory(FeedbackScoreUtil.category(overallAverage))
                .totalEmployees((long) items.size())
                .totalResponses(totalResponses)
                .summarizedAt(summarizedAt)
                .items(items)
                .build();
    }

    @Override
    @Transactional
    public FeedbackMyResultResponse getMyResult(Long userId) {
        User user = getUser(userId);
        Long employeeId = requireEmployeeId(user);
        List<FeedbackSummary> results = feedbackSummaryRepository.findByTargetEmployeeIdOrderByCampaignEndDateDesc(employeeId)
                .stream()
                .filter(summary -> summary.getCampaign().getStatus() == FeedbackCampaignStatus.CLOSED)
                .toList();

        if (results.isEmpty()) {
            refreshClosedCampaignSummariesForEmployee(employeeId);
            results = feedbackSummaryRepository.findByTargetEmployeeIdOrderByCampaignEndDateDesc(employeeId).stream()
                    .filter(summary -> summary.getCampaign().getStatus() == FeedbackCampaignStatus.CLOSED)
                    .toList();
        }

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

    private void refreshClosedCampaignSummariesForEmployee(Long employeeId) {
        refreshClosedCampaignSummariesForEmployees(List.of(employeeId));
    }

    private void refreshClosedCampaignSummariesForEmployees(List<Long> employeeIds) {
        List<FeedbackCampaign> closedCampaigns = feedbackCampaignRepository.findByStatusOrderByStartDateDesc(FeedbackCampaignStatus.CLOSED);
        for (FeedbackCampaign campaign : closedCampaigns) {
            List<FeedbackResponse> submittedResponses = feedbackResponseRepository.findByCampaignIdAndStatus(campaign.getId(), ResponseStatus.SUBMITTED)
                    .stream()
                    .filter(response -> employeeIds.contains(response.getEvaluatorAssignment().getFeedbackRequest().getTargetEmployeeId()))
                    .toList();
            upsertSummaries(campaign, submittedResponses);
        }
    }

    private FeedbackCampaign getClosedCampaign(Long campaignId) {
        FeedbackCampaign campaign = feedbackCampaignRepository.findById(campaignId)
                .orElseThrow(() -> new ResourceNotFoundException("Feedback campaign not found."));
        if (campaign.getStatus() != FeedbackCampaignStatus.CLOSED) {
            throw new BusinessValidationException("Feedback results are available only after the campaign is CLOSED.");
        }
        return campaign;
    }

    private List<FeedbackSummary> refreshCampaignSummary(FeedbackCampaign campaign) {
        List<FeedbackResponse> submittedResponses = feedbackResponseRepository.findByCampaignIdAndStatus(
                campaign.getId(),
                ResponseStatus.SUBMITTED
        );
        return upsertSummaries(campaign, submittedResponses);
    }

    private List<FeedbackSummary> upsertSummaries(FeedbackCampaign campaign, List<FeedbackResponse> submittedResponses) {
        Map<Long, List<FeedbackResponse>> grouped = submittedResponses.stream()
                .collect(Collectors.groupingBy(response -> response.getEvaluatorAssignment().getFeedbackRequest().getTargetEmployeeId()));

        List<FeedbackSummary> persisted = new ArrayList<>();
        for (Map.Entry<Long, List<FeedbackResponse>> entry : grouped.entrySet()) {
            Long targetEmployeeId = entry.getKey();
            List<FeedbackResponse> responses = entry.getValue();

            FeedbackSummary summary = feedbackSummaryRepository.findByCampaignIdAndTargetEmployeeId(campaign.getId(), targetEmployeeId)
                    .orElseGet(FeedbackSummary::new);
            summary.setCampaign(campaign);
            summary.setTargetEmployeeId(targetEmployeeId);
            summary.setAverageScore(responses.stream()
                    .map(FeedbackResponse::getOverallScore)
                    .filter(Objects::nonNull)
                    .mapToDouble(Double::doubleValue)
                    .average()
                    .orElse(0.0));
            summary.setTotalResponses((long) responses.size());
            summary.setManagerResponses(countByRelationship(responses, FeedbackRelationshipType.MANAGER));
            summary.setPeerResponses(countByRelationship(responses, FeedbackRelationshipType.PEER));
            summary.setSubordinateResponses(countByRelationship(responses, FeedbackRelationshipType.SUBORDINATE));
            summary.setSummarizedAt(LocalDateTime.now());
            persisted.add(feedbackSummaryRepository.save(summary));
        }

        List<FeedbackSummary> existing = feedbackSummaryRepository.findByCampaignIdOrderByTargetEmployeeIdAsc(campaign.getId());
        for (FeedbackSummary summary : existing) {
            if (!grouped.containsKey(summary.getTargetEmployeeId())) {
                feedbackSummaryRepository.delete(summary);
            }
        }

        return feedbackSummaryRepository.findByCampaignIdOrderByTargetEmployeeIdAsc(campaign.getId());
    }

    private long countByRelationship(List<FeedbackResponse> responses, FeedbackRelationshipType relationshipType) {
        return responses.stream()
                .filter(response -> response.getEvaluatorAssignment().getRelationshipType() == relationshipType)
                .count();
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
                        .scoreCategory(FeedbackScoreUtil.category(summary.getAverageScore()))
                        .totalResponses(summary.getTotalResponses())
                        .managerResponses(summary.getManagerResponses())
                        .peerResponses(summary.getPeerResponses())
                        .subordinateResponses(summary.getSubordinateResponses())
                        .summarizedAt(summary.getSummarizedAt())
                        .build())
                .toList();
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
}
