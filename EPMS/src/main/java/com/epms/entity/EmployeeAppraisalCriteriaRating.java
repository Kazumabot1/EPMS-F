package com.epms.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Date;

@Entity
@Table(
    name = "employee_appraisal_criteria_rating",
    uniqueConstraints = @UniqueConstraint(
        name = "uk_employee_appraisal_criteria_rating",
        columnNames = {"employee_appraisal_form_id", "criteria_id"}
    )
)
@Data
@NoArgsConstructor
@AllArgsConstructor
public class EmployeeAppraisalCriteriaRating {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "employee_appraisal_form_id", nullable = false)
    private EmployeeAppraisalForm employeeAppraisalForm;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "criteria_id", nullable = false)
    private AppraisalFormCriteria criteria;

    /** PM selected rating value. Valid range is 1..criteria.maxRating. */
    @Column(nullable = false)
    private Integer ratingValue;

    @Column(columnDefinition = "TEXT")
    private String comment;

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
    }

    @PreUpdate
    public void preUpdate() {
        this.updatedAt = new Date();
    }
}
