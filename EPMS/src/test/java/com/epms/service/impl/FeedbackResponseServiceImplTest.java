package com.epms.service.impl;

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
import com.epms.entity.enums.FeedbackRequestStatus;
import com.epms.exception.BusinessValidationException;
import com.epms.repository.FeedbackEvaluatorAssignmentRepository;
import com.epms.repository.FeedbackFormRepository;
import com.epms.repository.FeedbackQuestionRepository;
import com.epms.repository.FeedbackRequestRepository;
import com.epms.repository.FeedbackResponseRepository;
import com.epms.repository.RatingScaleRepository;
import com.epms.repository.UserRepository;
import com.epms.service.AuditLogService;
import org.junit.jupiter.api.BeforeEach;
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
class FeedbackResponseServiceImplTest {

    @Mock
    private FeedbackResponseRepository responseRepository;

    @Mock
    private FeedbackEvaluatorAssignmentRepository assignmentRepository;

    @Mock
    private FeedbackRequestRepository feedbackRequestRepository;

    @Mock
    private FeedbackFormRepository feedbackFormRepository;

    @Mock
    private FeedbackQuestionRepository questionRepository;

    @Mock
    private RatingScaleRepository ratingScaleRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private AuditLogService auditLogService;

    @InjectMocks
    private FeedbackResponseServiceImpl service;

    private FeedbackEvaluatorAssignment assignment;
    private FeedbackForm form;
    private FeedbackQuestion requiredQuestion;
    private FeedbackQuestion optionalQuestion;

    @BeforeEach
    void setUp() {
        FeedbackCampaign campaign = new FeedbackCampaign();
        campaign.setStartDate(LocalDate.of(2026, 5, 1));
        campaign.setEndDate(LocalDate.of(2026, 5, 31));

        form = new FeedbackForm();
        form.setId(7L);

        FeedbackSection section = new FeedbackSection();
        section.setId(3L);
        section.setOrderNo(1);
        section.setTitle("Leadership");
        section.setForm(form);

        requiredQuestion = new FeedbackQuestion();
        requiredQuestion.setId(11L);
        requiredQuestion.setQuestionOrder(1);
        requiredQuestion.setQuestionText("Required question");
        requiredQuestion.setIsRequired(true);
        requiredQuestion.setWeight(1.0);
        requiredQuestion.setSection(section);

        optionalQuestion = new FeedbackQuestion();
        optionalQuestion.setId(12L);
        optionalQuestion.setQuestionOrder(2);
        optionalQuestion.setQuestionText("Optional question");
        optionalQuestion.setIsRequired(false);
        optionalQuestion.setWeight(1.0);
        optionalQuestion.setSection(section);

        section.setQuestions(List.of(requiredQuestion, optionalQuestion));
        form.setSections(List.of(section));

        FeedbackRequest request = new FeedbackRequest();
        request.setId(5L);
        request.setCampaign(campaign);
        request.setForm(form);
        request.setTargetEmployeeId(100L);
        request.setStatus(FeedbackRequestStatus.PENDING);

        assignment = new FeedbackEvaluatorAssignment();
        assignment.setId(4L);
        assignment.setEvaluatorEmployeeId(200L);
        assignment.setFeedbackRequest(request);
        assignment.setStatus(AssignmentStatus.PENDING);

        User user = new User();
        user.setId(9);
        user.setEmployeeId(200);

        when(userRepository.findById(9)).thenReturn(Optional.of(user));
        when(assignmentRepository.findById(4L)).thenReturn(Optional.of(assignment));
        when(feedbackFormRepository.findSectionsWithQuestionsByFormId(7L)).thenReturn(List.of(section));
    }

    @Test
    void submitResponseRejectsMissingRequiredQuestions() {
        FeedbackResponseItem optionalItem = item(12L, 4.0);

        assertThatThrownBy(() -> service.submitResponse(4L, 9L, "Looks good", List.of(optionalItem)))
                .isInstanceOf(BusinessValidationException.class)
                .hasMessage("All required feedback questions must have a rating before submission.");
    }

    @Test
    void submitResponseRejectsMissingRequiredRatingValue() {
        FeedbackResponseItem requiredItem = item(11L, null);

        assertThatThrownBy(() -> service.submitResponse(4L, 9L, "Looks good", List.of(requiredItem)))
                .isInstanceOf(BusinessValidationException.class)
                .hasMessage("Rating value is required for required question 11.");
    }

    @Test
    void submitResponseRejectsRatingBeyondConfiguredDefaultScale() {
        FeedbackResponseItem requiredItem = item(11L, 6.0);

        assertThatThrownBy(() -> service.submitResponse(4L, 9L, "Looks good", List.of(requiredItem)))
                .isInstanceOf(BusinessValidationException.class)
                .hasMessage("Rating for question 11 must be between 1 and 5.");
    }

    @Test
    void submitResponseRejectsQuestionsOutsideAssignedForm() {
        FeedbackResponseItem invalidItem = item(99L, 4.0);

        assertThatThrownBy(() -> service.submitResponse(4L, 9L, "Looks good", List.of(invalidItem)))
                .isInstanceOf(BusinessValidationException.class)
                .hasMessage("Question 99 does not belong to the assigned feedback form.");
    }

    @Test
    void submitResponseStoresPercentageScoreInsteadOfRawRatingAverage() {
        when(responseRepository.findByEvaluatorAssignmentId(4L)).thenReturn(Optional.empty());
        when(responseRepository.save(any(FeedbackResponse.class))).thenAnswer(invocation -> {
            FeedbackResponse response = invocation.getArgument(0);
            response.setId(77L);
            return response;
        });

        FeedbackResponse saved = service.submitResponse(4L, 9L, "Looks good", List.of(
                item(11L, 4.0),
                item(12L, 4.0)
        ));

        assertThat(saved.getOverallScore()).isEqualTo(80.0);
    }

    private FeedbackResponseItem item(Long questionId, Double ratingValue) {
        FeedbackResponseItem item = new FeedbackResponseItem();
        FeedbackQuestion questionRef = new FeedbackQuestion();
        questionRef.setId(questionId);
        item.setQuestion(questionRef);
        item.setRatingValue(ratingValue);
        return item;
    }
}
