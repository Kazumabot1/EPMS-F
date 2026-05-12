package com.epms.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "feedback_response_items", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"response_id", "question_id"}),
        @UniqueConstraint(name = "uk_feedback_response_assignment_question", columnNames = {"response_id", "assignment_question_id"})
})
@Getter
@Setter
@NoArgsConstructor
public class FeedbackResponseItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "response_id", nullable = false)
    private FeedbackResponse response;

    /**
     * Legacy source question reference. New dynamic forms validate and score against assignmentQuestion,
     * while this field remains populated when the snapshot originated from an existing form question so
     * older analytics/report queries continue to work during migration.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "question_id")
    private FeedbackQuestion question;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assignment_question_id")
    private FeedbackAssignmentQuestion assignmentQuestion;

    @Column(name = "rating_value")
    private Double ratingValue;

    @Column(name = "comment", columnDefinition = "TEXT")
    private String comment;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
