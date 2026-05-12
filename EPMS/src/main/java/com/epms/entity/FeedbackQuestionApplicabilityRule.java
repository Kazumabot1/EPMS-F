package com.epms.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "feedback_question_applicability_rules")
@Getter
@Setter
@NoArgsConstructor
public class FeedbackQuestionApplicabilityRule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "question_version_id", nullable = false)
    private FeedbackQuestionVersion questionVersion;

    @Column(name = "target_level_min_rank", nullable = false)
    private Integer targetLevelMinRank;

    @Column(name = "target_level_max_rank", nullable = false)
    private Integer targetLevelMaxRank;

    @Column(name = "target_position_id")
    private Long targetPositionId;

    @Column(name = "target_department_id")
    private Long targetDepartmentId;

    @Column(name = "evaluator_relationship_type", nullable = false, length = 40)
    private String evaluatorRelationshipType;

    @Column(name = "section_code", nullable = false, length = 80)
    private String sectionCode;

    @Column(name = "section_title", nullable = false, length = 150)
    private String sectionTitle;

    @Column(name = "section_order", nullable = false)
    private Integer sectionOrder = 1;

    @Column(name = "display_order", nullable = false)
    private Integer displayOrder = 1;

    @Column(name = "required_override")
    private Boolean requiredOverride;

    @Column(name = "weight_override")
    private Double weightOverride;

    @Column(name = "rule_priority", nullable = false)
    private Integer rulePriority = 100;

    @Column(name = "active", nullable = false)
    private Boolean active = true;

    @Column(name = "valid_from")
    private LocalDate validFrom;

    @Column(name = "valid_to")
    private LocalDate validTo;

    @Column(name = "condition_json", columnDefinition = "JSON")
    private String conditionJson;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
        if (this.sectionOrder == null) {
            this.sectionOrder = 1;
        }
        if (this.displayOrder == null) {
            this.displayOrder = 1;
        }
        if (this.rulePriority == null) {
            this.rulePriority = 100;
        }
        if (this.active == null) {
            this.active = true;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
