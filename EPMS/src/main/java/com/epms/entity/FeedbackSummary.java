package com.epms.entity;

import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "feedback_summary")
public class FeedbackSummary {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long feedbackSummaryId;

    private Double averageScore;

    private Integer totalResponses;

    private LocalDateTime generatedAt;

    @OneToOne
    @JoinColumn(name = "feedback_request_id")
    private FeedbackRequest feedbackRequest;
}
