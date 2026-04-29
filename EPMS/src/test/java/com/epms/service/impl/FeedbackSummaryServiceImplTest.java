package com.epms.service.impl;

import com.epms.dto.FeedbackCampaignSummaryResponse;
import com.epms.dto.FeedbackMyResultResponse;
import com.epms.dto.FeedbackTeamSummaryResponse;
import com.epms.entity.Employee;
import com.epms.entity.FeedbackCampaign;
import com.epms.entity.FeedbackEvaluatorAssignment;
import com.epms.entity.FeedbackRequest;
import com.epms.entity.FeedbackResponse;
import com.epms.entity.FeedbackSummary;
import com.epms.entity.User;
import com.epms.entity.enums.FeedbackCampaignStatus;
import com.epms.entity.enums.FeedbackRelationshipType;
import com.epms.entity.enums.ResponseStatus;
import com.epms.exception.BusinessValidationException;
import com.epms.repository.EmployeeRepository;
import com.epms.repository.FeedbackCampaignRepository;
import com.epms.repository.FeedbackResponseRepository;
import com.epms.repository.FeedbackSummaryRepository;
import com.epms.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class FeedbackSummaryServiceImplTest {

    @Mock
    private FeedbackCampaignRepository feedbackCampaignRepository;

    @Mock
    private FeedbackResponseRepository feedbackResponseRepository;

    @Mock
    private FeedbackSummaryRepository feedbackSummaryRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private EmployeeRepository employeeRepository;

    @InjectMocks
    private FeedbackSummaryServiceImpl service;

    @Test
    void getCampaignSummaryRejectsNonClosedCampaign() {
        FeedbackCampaign campaign = new FeedbackCampaign();
        campaign.setId(1L);
        campaign.setStatus(FeedbackCampaignStatus.ACTIVE);

        when(feedbackCampaignRepository.findById(1L)).thenReturn(Optional.of(campaign));

        assertThatThrownBy(() -> service.getCampaignSummary(1L))
                .isInstanceOf(BusinessValidationException.class)
                .hasMessage("Feedback results are available only after the campaign is CLOSED.");
    }

    @Test
    void getCampaignSummaryAggregatesResponsesIntoSummaryRows() {
        FeedbackCampaign campaign = new FeedbackCampaign();
        campaign.setId(1L);
        campaign.setName("Leadership 360");
        campaign.setStatus(FeedbackCampaignStatus.CLOSED);
        campaign.setEndDate(LocalDate.of(2026, 5, 31));

        FeedbackRequest request = new FeedbackRequest();
        request.setId(5L);
        request.setCampaign(campaign);
        request.setTargetEmployeeId(100L);

        FeedbackEvaluatorAssignment assignment = new FeedbackEvaluatorAssignment();
        assignment.setFeedbackRequest(request);
        assignment.setRelationshipType(FeedbackRelationshipType.PEER);

        FeedbackResponse response = new FeedbackResponse();
        response.setEvaluatorAssignment(assignment);
        response.setFinalStatus(ResponseStatus.SUBMITTED);
        response.setOverallScore(4.5);

        Employee employee = new Employee();
        employee.setId(100);
        employee.setFirstName("Jane");
        employee.setLastName("Doe");

        when(feedbackCampaignRepository.findById(1L)).thenReturn(Optional.of(campaign));
        when(feedbackResponseRepository.findByCampaignIdAndStatus(1L, ResponseStatus.SUBMITTED)).thenReturn(List.of(response));
        when(feedbackSummaryRepository.findByCampaignIdAndTargetEmployeeId(1L, 100L)).thenReturn(Optional.empty());
        when(feedbackSummaryRepository.save(any(FeedbackSummary.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(feedbackSummaryRepository.findByCampaignIdOrderByTargetEmployeeIdAsc(1L)).thenAnswer(invocation -> {
            FeedbackSummary summary = new FeedbackSummary();
            summary.setCampaign(campaign);
            summary.setTargetEmployeeId(100L);
            summary.setAverageScore(4.5);
            summary.setTotalResponses(1L);
            summary.setManagerResponses(0L);
            summary.setPeerResponses(1L);
            summary.setSubordinateResponses(0L);
            summary.setSummarizedAt(java.time.LocalDateTime.now());
            return List.of(summary);
        });
        when(employeeRepository.findAllById(List.of(100))).thenReturn(List.of(employee));

        FeedbackCampaignSummaryResponse result = service.getCampaignSummary(1L);

        assertThat(result.getCampaignId()).isEqualTo(1L);
        assertThat(result.getItems()).hasSize(1);
        assertThat(result.getItems().get(0).getTargetEmployeeName()).isEqualTo("Jane Doe");
        assertThat(result.getItems().get(0).getAverageScore()).isEqualTo(4.5);
    }

    @Test
    void getMyResultReturnsClosedCampaignSummariesForCurrentEmployee() {
        User user = new User();
        user.setId(7);
        user.setEmployeeId(100);

        FeedbackCampaign campaign = new FeedbackCampaign();
        campaign.setId(1L);
        campaign.setName("Leadership 360");
        campaign.setStatus(FeedbackCampaignStatus.CLOSED);
        campaign.setEndDate(LocalDate.of(2026, 5, 31));

        FeedbackSummary summary = new FeedbackSummary();
        summary.setCampaign(campaign);
        summary.setTargetEmployeeId(100L);
        summary.setAverageScore(4.2);
        summary.setTotalResponses(3L);
        summary.setManagerResponses(1L);
        summary.setPeerResponses(2L);
        summary.setSubordinateResponses(0L);
        summary.setSummarizedAt(java.time.LocalDateTime.now());

        Employee employee = new Employee();
        employee.setId(100);
        employee.setFirstName("Jane");
        employee.setLastName("Doe");

        when(userRepository.findById(7)).thenReturn(Optional.of(user));
        when(feedbackSummaryRepository.findByTargetEmployeeIdOrderByCampaignEndDateDesc(100L)).thenReturn(List.of(summary));
        when(employeeRepository.findAllById(List.of(100))).thenReturn(List.of(employee));

        FeedbackMyResultResponse result = service.getMyResult(7L);

        assertThat(result.getEmployeeName()).isEqualTo("Jane Doe");
        assertThat(result.getResults()).hasSize(1);
        assertThat(result.getResults().get(0).getCampaignName()).isEqualTo("Leadership 360");
    }

    @Test
    void getTeamSummaryReturnsClosedResultsForDirectReports() {
        User directReport = new User();
        directReport.setId(8);
        directReport.setEmployeeId(100);

        FeedbackCampaign campaign = new FeedbackCampaign();
        campaign.setId(1L);
        campaign.setName("Leadership 360");
        campaign.setStatus(FeedbackCampaignStatus.CLOSED);
        campaign.setEndDate(LocalDate.of(2026, 5, 31));

        FeedbackSummary summary = new FeedbackSummary();
        summary.setCampaign(campaign);
        summary.setTargetEmployeeId(100L);
        summary.setAverageScore(4.0);
        summary.setTotalResponses(2L);
        summary.setManagerResponses(1L);
        summary.setPeerResponses(1L);
        summary.setSubordinateResponses(0L);
        summary.setSummarizedAt(java.time.LocalDateTime.now());

        Employee employee = new Employee();
        employee.setId(100);
        employee.setFirstName("Jane");
        employee.setLastName("Doe");

        when(userRepository.findByManagerIdAndActiveTrue(7)).thenReturn(List.of(directReport));
        when(feedbackCampaignRepository.findByStatusOrderByStartDateDesc(FeedbackCampaignStatus.CLOSED)).thenReturn(List.of());
        when(feedbackSummaryRepository.findByTargetEmployeeIdInOrderByCampaignEndDateDesc(List.of(100L))).thenReturn(List.of(summary));
        when(employeeRepository.findAllById(List.of(100))).thenReturn(List.of(employee));

        FeedbackTeamSummaryResponse result = service.getTeamSummary(7L);

        assertThat(result.getTotalDirectReports()).isEqualTo(1);
        assertThat(result.getItems()).hasSize(1);
        assertThat(result.getItems().get(0).getTargetEmployeeName()).isEqualTo("Jane Doe");
    }
}
