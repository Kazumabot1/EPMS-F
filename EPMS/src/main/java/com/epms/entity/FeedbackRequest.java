package com.epms.entity;

import jakarta.persistence.*;

import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "feedback_request")
public class FeedbackRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long feedbackRequestId;

    private Long cycleId;

    private Long targetEmployeeId;

    private Long requestedByUserId;

    private Boolean isAnonymousEnabled;

    private String status;

    private LocalDateTime dueAt;

    @ManyToOne
    @JoinColumn(name = "feedback_form_id")
    private FeedbackForm feedbackForm;

    @OneToMany(mappedBy = "feedbackRequest", cascade = CascadeType.ALL)
    private List<FeedbackEvaluatorAssignment> assignments;
}
