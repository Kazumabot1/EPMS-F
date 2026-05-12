package com.epms.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "feedback_question_versions", uniqueConstraints = {
        @UniqueConstraint(name = "uk_feedback_question_version", columnNames = {"question_bank_id", "version_number"})
})
@Getter
@Setter
@NoArgsConstructor
public class FeedbackQuestionVersion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "question_bank_id", nullable = false)
    private FeedbackQuestionBank questionBank;

    @Column(name = "version_number", nullable = false)
    private Integer versionNumber = 1;

    @Column(name = "question_text", nullable = false, columnDefinition = "TEXT")
    private String questionText;

    @Column(name = "response_type", nullable = false, length = 40)
    private String responseType = "RATING_WITH_COMMENT";

    @Column(name = "scoring_behavior", nullable = false, length = 30)
    private String scoringBehavior = "SCORED";

    @Column(name = "rating_scale_id")
    private Integer ratingScaleId;

    @Column(name = "help_text", columnDefinition = "TEXT")
    private String helpText;

    @Column(name = "is_active", nullable = false)
    private Boolean active = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        if (this.versionNumber == null || this.versionNumber <= 0) {
            this.versionNumber = 1;
        }
        if (this.responseType == null || this.responseType.isBlank()) {
            this.responseType = "RATING_WITH_COMMENT";
        }
        if (this.scoringBehavior == null || this.scoringBehavior.isBlank()) {
            this.scoringBehavior = "SCORED";
        }
        if (this.active == null) {
            this.active = true;
        }
    }
}
