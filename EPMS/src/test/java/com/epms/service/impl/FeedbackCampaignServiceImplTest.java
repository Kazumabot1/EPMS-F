package com.epms.service.impl;

import com.epms.dto.FeedbackCampaignCreateRequest;
import com.epms.entity.FeedbackCampaign;
import com.epms.entity.FeedbackForm;
import com.epms.entity.enums.FeedbackCampaignStatus;
import com.epms.exception.BusinessValidationException;
import com.epms.repository.EmployeeRepository;
import com.epms.repository.FeedbackCampaignRepository;
import com.epms.repository.FeedbackEvaluatorAssignmentRepository;
import com.epms.repository.FeedbackRequestRepository;
import com.epms.service.FeedbackFormService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class FeedbackCampaignServiceImplTest {

    @Mock
    private FeedbackCampaignRepository feedbackCampaignRepository;

    @Mock
    private FeedbackRequestRepository feedbackRequestRepository;

    @Mock
    private FeedbackEvaluatorAssignmentRepository assignmentRepository;

    @Mock
    private FeedbackFormService feedbackFormService;

    @Mock
    private EmployeeRepository employeeRepository;

    @InjectMocks
    private FeedbackCampaignServiceImpl service;

    private FeedbackCampaignCreateRequest request;

    @BeforeEach
    void setUp() {
        request = new FeedbackCampaignCreateRequest();
        request.setName(" Leadership 360 ");
        request.setStartDate(LocalDate.of(2026, 5, 1));
        request.setEndDate(LocalDate.of(2026, 5, 31));
        request.setFormId(7L);
    }

    @Test
    void createCampaignSetsDraftStatusAndPersistsTrimmedName() {
        when(feedbackFormService.getFormById(7L)).thenReturn(new FeedbackForm());
        when(feedbackCampaignRepository.save(any(FeedbackCampaign.class))).thenAnswer(invocation -> invocation.getArgument(0));

        FeedbackCampaign created = service.createCampaign(request, 99L);

        ArgumentCaptor<FeedbackCampaign> captor = ArgumentCaptor.forClass(FeedbackCampaign.class);
        verify(feedbackCampaignRepository).save(captor.capture());
        assertThat(captor.getValue().getName()).isEqualTo("Leadership 360");
        assertThat(captor.getValue().getStatus()).isEqualTo(FeedbackCampaignStatus.DRAFT);
        assertThat(captor.getValue().getFormId()).isEqualTo(7L);
        assertThat(created.getCreatedByUserId()).isEqualTo(99L);
    }

    @Test
    void createCampaignRejectsInvalidDateRange() {
        request.setStartDate(LocalDate.of(2026, 6, 1));
        request.setEndDate(LocalDate.of(2026, 6, 1));

        assertThatThrownBy(() -> service.createCampaign(request, 99L))
                .isInstanceOf(BusinessValidationException.class)
                .hasMessage("Campaign start date must be earlier than the end date.");
    }
}
