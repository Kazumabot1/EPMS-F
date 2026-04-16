package com.epms.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "feedback_evaluator_assignment")
public class FeedbackEvaluatorAssignment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long evaluatorAssignmentId;

    private Long evaluatorEmployeeId;

    private String sourceType; // manager, peer, subordinate, self

    private String selectionMethod; // auto_random, manual

    private Boolean isAnonymous;

    private String status;

    @ManyToOne
    @JoinColumn(name = "feedback_request_id")
    private FeedbackRequest feedbackRequest;

    @OneToOne(mappedBy = "assignment", cascade = CascadeType.ALL)
    private FeedbackResponse response;
}