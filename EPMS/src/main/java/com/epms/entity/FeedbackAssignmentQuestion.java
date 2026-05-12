package com.epms.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "feedback_assignment_questions", uniqueConstraints = {
        @UniqueConstraint(name = "uk_feedback_assignment_question_code", columnNames = {"assignment_id", "question_code"})
})
@Getter
@Setter
@NoArgsConstructor
public class FeedbackAssignmentQuestion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assignment_id", nullable = false)
    private FeedbackEvaluatorAssignment assignment;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "source_question_id")
    private FeedbackQuestion sourceQuestion;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "question_version_id")
    private FeedbackQuestionVersion questionVersion;

    @Column(name = "question_bank_id")
    private Long questionBankId;

    @Column(name = "question_code", nullable = false, length = 80)
    private String questionCode;

    @Column(name = "competency_code", length = 80)
    private String competencyCode;

    @Column(name = "question_text_snapshot", nullable = false, columnDefinition = "TEXT")
    private String questionTextSnapshot;

    @Column(name = "response_type", nullable = false, length = 40)
    private String responseType = "RATING_WITH_COMMENT";

    @Column(name = "scoring_behavior", nullable = false, length = 30)
    private String scoringBehavior = "SCORED";

    @Column(name = "rating_scale_id")
    private Integer ratingScaleId;

    @Column(name = "is_required", nullable = false)
    private Boolean required = true;

    @Column(name = "weight", nullable = false)
    private Double weight = 1.0;

    @Column(name = "section_code", nullable = false, length = 80)
    private String sectionCode;

    @Column(name = "section_title", nullable = false, length = 150)
    private String sectionTitle;

    @Column(name = "section_order", nullable = false)
    private Integer sectionOrder = 1;

    @Column(name = "display_order", nullable = false)
    private Integer displayOrder = 1;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        if (this.responseType == null || this.responseType.isBlank()) {
            this.responseType = "RATING_WITH_COMMENT";
        }
        if (this.scoringBehavior == null || this.scoringBehavior.isBlank()) {
            this.scoringBehavior = "SCORED";
        }
        if (this.required == null) {
            this.required = true;
        }
        if (this.weight == null || this.weight <= 0) {
            this.weight = 1.0;
        }
        if (this.sectionOrder == null) {
            this.sectionOrder = 1;
        }
        if (this.displayOrder == null) {
            this.displayOrder = 1;
        }
    }
}
