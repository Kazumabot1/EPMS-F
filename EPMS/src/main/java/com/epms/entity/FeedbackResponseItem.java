package com.epms.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "feedback_response_item")
public class FeedbackResponseItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long feedbackResponseItemId;

    private Double ratingValue;

    private String comments;

    @ManyToOne
    @JoinColumn(name = "feedback_response_id")
    private FeedbackResponse feedbackResponse;

    @ManyToOne
    @JoinColumn(name = "feedback_question_id")
    private FeedbackQuestion feedbackQuestion;
}
