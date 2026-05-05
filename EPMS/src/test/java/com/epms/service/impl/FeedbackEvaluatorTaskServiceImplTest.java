package com.epms.service.impl;

import com.epms.dto.FeedbackAssignmentDetailResponse;
import com.epms.dto.FeedbackEvaluatorTaskResponse;
import com.epms.entity.Employee;
import com.epms.entity.FeedbackCampaign;
import com.epms.entity.FeedbackEvaluatorAssignment;
import com.epms.entity.FeedbackForm;
import com.epms.entity.FeedbackQuestion;
import com.epms.entity.FeedbackRequest;
import com.epms.entity.FeedbackResponse;
import com.epms.entity.FeedbackResponseItem;
import com.epms.entity.FeedbackSection;
import com.epms.entity.User;
import com.epms.entity.enums.AssignmentStatus;
import com.epms.entity.enums.FeedbackRelationshipType;
import com.epms.repository.EmployeeRepository;
import com.epms.repository.FeedbackEvaluatorAssignmentRepository;
import com.epms.repository.FeedbackFormRepository;
import com.epms.repository.FeedbackResponseRepository;
import com.epms.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class FeedbackEvaluatorTaskServiceImplTest {

    @Mock
    private FeedbackEvaluatorAssignmentRepository assignmentRepository;

    @Mock
    private FeedbackFormRepository feedbackFormRepository;

    @Mock
    private FeedbackResponseRepository feedbackResponseRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private EmployeeRepository employeeRepository;

    @InjectMocks
    private FeedbackEvaluatorTaskServiceImpl service;

    @Test
    void getAssignmentDetailBuildsDynamicFormAndExistingDraft() {
        User evaluator = new User();
        evaluator.setId(7);
        evaluator.setEmployeeId(200);

        Employee target = new Employee();
        target.setId(100);
        target.setFirstName("Jane");
        target.setLastName("Doe");

        FeedbackCampaign campaign = new FeedbackCampaign();
        campaign.setId(1L);
        campaign.setName("Leadership 360");
        campaign.setEndDate(LocalDate.of(2026, 5, 31));

        FeedbackForm form = new FeedbackForm();
        form.setId(5L);

        FeedbackSection section = new FeedbackSection();
        section.setId(9L);
        section.setTitle("Leadership");
        section.setOrderNo(1);
        section.setForm(form);

        FeedbackQuestion question = new FeedbackQuestion();
        question.setId(11L);
        question.setQuestionText("Communicates clearly");
        question.setQuestionOrder(1);
        question.setIsRequired(true);
        question.setSection(section);
        section.setQuestions(List.of(question));
        form.setSections(List.of(section));

        FeedbackRequest request = new FeedbackRequest();
        request.setId(3L);
        request.setCampaign(campaign);
        request.setForm(form);
        request.setTargetEmployeeId(100L);

        FeedbackEvaluatorAssignment assignment = new FeedbackEvaluatorAssignment();
        assignment.setId(4L);
        assignment.setFeedbackRequest(request);
        assignment.setEvaluatorEmployeeId(200L);
        assignment.setRelationshipType(FeedbackRelationshipType.PEER);
        assignment.setIsAnonymous(true);
        assignment.setStatus(AssignmentStatus.IN_PROGRESS);

        FeedbackResponseItem responseItem = new FeedbackResponseItem();
        responseItem.setQuestion(question);
        responseItem.setRatingValue(4.0);
        responseItem.setComment("Strong communicator");

        FeedbackResponse response = new FeedbackResponse();
        response.setSubmittedAt(null);
        response.setComments("Draft comments");
        response.setItems(List.of(responseItem));

        when(userRepository.findById(7)).thenReturn(Optional.of(evaluator));
        when(assignmentRepository.findById(4L)).thenReturn(Optional.of(assignment));
        when(feedbackFormRepository.findByIdWithSectionsAndQuestions(5L)).thenReturn(Optional.of(form));
        when(feedbackResponseRepository.findByEvaluatorAssignmentId(4L)).thenReturn(Optional.of(response));
        when(employeeRepository.findAllById(List.of(100))).thenReturn(List.of(target));

        FeedbackAssignmentDetailResponse detail = service.getAssignmentDetail(4L, 7L);

        assertThat(detail.getAssignmentId()).isEqualTo(4L);
        assertThat(detail.getTargetEmployeeName()).isEqualTo("Jane Doe");
        assertThat(detail.getAnonymous()).isTrue();
        assertThat(detail.getCanSubmit()).isTrue();
        assertThat(detail.getSections()).hasSize(1);
        assertThat(detail.getSections().get(0).getQuestions()).hasSize(1);
        assertThat(detail.getSections().get(0).getQuestions().get(0).getExistingRatingValue()).isEqualTo(4.0);
    }

    @Test
    void getMyTasksReturnsEvaluatorAssignments() {
        User evaluator = new User();
        evaluator.setId(7);
        evaluator.setEmployeeId(200);

        Employee target = new Employee();
        target.setId(100);
        target.setFirstName("Jane");
        target.setLastName("Doe");

        FeedbackCampaign campaign = new FeedbackCampaign();
        campaign.setId(1L);
        campaign.setName("Leadership 360");
        campaign.setEndDate(LocalDate.of(2026, 5, 31));

        FeedbackForm form = new FeedbackForm();
        form.setId(5L);

        FeedbackRequest request = new FeedbackRequest();
        request.setId(3L);
        request.setCampaign(campaign);
        request.setForm(form);
        request.setTargetEmployeeId(100L);

        FeedbackResponse response = new FeedbackResponse();
        response.setSubmittedAt(LocalDateTime.of(2026, 5, 15, 10, 0));

        FeedbackEvaluatorAssignment assignment = new FeedbackEvaluatorAssignment();
        assignment.setId(4L);
        assignment.setFeedbackRequest(request);
        assignment.setEvaluatorEmployeeId(200L);
        assignment.setRelationshipType(FeedbackRelationshipType.MANAGER);
        assignment.setIsAnonymous(false);
        assignment.setStatus(AssignmentStatus.SUBMITTED);
        assignment.setResponse(response);

        when(userRepository.findById(7)).thenReturn(Optional.of(evaluator));
        when(assignmentRepository.findByEvaluatorEmployeeId(200L)).thenReturn(List.of(assignment));
        when(employeeRepository.findAllById(List.of(100))).thenReturn(List.of(target));

        List<FeedbackEvaluatorTaskResponse> tasks = service.getMyTasks(7L);

        assertThat(tasks).hasSize(1);
        assertThat(tasks.get(0).getTargetEmployeeName()).isEqualTo("Jane Doe");
        assertThat(tasks.get(0).getStatus()).isEqualTo("SUBMITTED");
    }
}
