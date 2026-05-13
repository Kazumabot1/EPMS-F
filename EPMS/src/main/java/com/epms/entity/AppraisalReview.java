package com.epms.entity;

import com.epms.entity.enums.AppraisalDecision;
import com.epms.entity.enums.AppraisalReviewStage;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Date;

@Entity
@Table(
    name = "appraisal_review",
    uniqueConstraints = @UniqueConstraint(
        name = "uk_appraisal_review_form_stage",
        columnNames = {"employee_appraisal_form_id", "review_stage"}
    )
)
@Data
@NoArgsConstructor
@AllArgsConstructor
public class AppraisalReview {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "employee_appraisal_form_id", nullable = false)
    private EmployeeAppraisalForm employeeAppraisalForm;

    @Enumerated(EnumType.STRING)
    @Column(name = "review_stage", nullable = false, length = 30)
    private AppraisalReviewStage reviewStage;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "reviewer_user_id", nullable = false)
    private User reviewerUser;

    @Column(columnDefinition = "TEXT")
    private String recommendation;

    @Column(columnDefinition = "TEXT")
    private String comment;

    @Lob
    @Column(name = "signature_image_data", columnDefinition = "LONGTEXT")
    private String signatureImageData;

    @Column(name = "signature_image_type", length = 80)
    private String signatureImageType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private AppraisalDecision decision = AppraisalDecision.SUBMITTED;

    @Temporal(TemporalType.TIMESTAMP)
    private Date submittedAt;

    @Temporal(TemporalType.TIMESTAMP)
    @Column(nullable = false, updatable = false)
    private Date createdAt;

    @Temporal(TemporalType.TIMESTAMP)
    private Date updatedAt;

    @PrePersist
    public void prePersist() {
        Date now = new Date();
        this.createdAt = now;
        this.updatedAt = now;
        if (this.decision == null) {
            this.decision = AppraisalDecision.SUBMITTED;
        }
    }

    @PreUpdate
    public void preUpdate() {
        this.updatedAt = new Date();
    }
}
