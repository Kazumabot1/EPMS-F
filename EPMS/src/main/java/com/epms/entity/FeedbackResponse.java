package com.epms.entity;

import jakarta.persistence.*;

import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "feedback_response")
public class FeedbackResponse {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long feedbackResponseId;

    private LocalDateTime submittedAt;

    private Double overallScore;

    private String comments;

    private String finalStatus;

    @OneToOne
    @JoinColumn(name = "evaluator_assignment_id")
    private FeedbackEvaluatorAssignment assignment;

    @OneToMany(mappedBy = "feedbackResponse", cascade = CascadeType.ALL)
    private List<FeedbackResponseItem> items;
}
