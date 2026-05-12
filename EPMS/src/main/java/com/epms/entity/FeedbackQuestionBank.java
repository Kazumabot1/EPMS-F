package com.epms.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "feedback_question_bank", uniqueConstraints = {
        @UniqueConstraint(name = "uk_feedback_question_bank_code", columnNames = "question_code")
})
@Getter
@Setter
@NoArgsConstructor
public class FeedbackQuestionBank {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "question_code", nullable = false, length = 80)
    private String questionCode;

    @Column(name = "competency_code", nullable = false, length = 80)
    private String competencyCode;

    @Column(name = "default_text", nullable = false, columnDefinition = "TEXT")
    private String defaultText;

    @Column(name = "default_response_type", nullable = false, length = 40)
    private String defaultResponseType = "RATING_WITH_COMMENT";

    @Column(name = "default_scoring_behavior", nullable = false, length = 30)
    private String defaultScoringBehavior = "SCORED";

    @Column(name = "default_rating_scale_id")
    private Integer defaultRatingScaleId;

    @Column(name = "default_weight", nullable = false)
    private Double defaultWeight = 1.0;

    @Column(name = "default_required", nullable = false)
    private Boolean defaultRequired = true;

    @Column(name = "status", nullable = false, length = 30)
    private String status = "ACTIVE";

    @Column(name = "created_by_user_id", nullable = false)
    private Long createdByUserId = 0L;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @OneToMany(mappedBy = "questionBank", fetch = FetchType.LAZY)
    private List<FeedbackQuestionVersion> versions = new ArrayList<>();

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
        if (this.defaultResponseType == null || this.defaultResponseType.isBlank()) {
            this.defaultResponseType = "RATING_WITH_COMMENT";
        }
        if (this.defaultScoringBehavior == null || this.defaultScoringBehavior.isBlank()) {
            this.defaultScoringBehavior = "SCORED";
        }
        if (this.defaultWeight == null || this.defaultWeight <= 0) {
            this.defaultWeight = 1.0;
        }
        if (this.defaultRequired == null) {
            this.defaultRequired = true;
        }
        if (this.status == null || this.status.isBlank()) {
            this.status = "ACTIVE";
        }
        if (this.createdByUserId == null) {
            this.createdByUserId = 0L;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
