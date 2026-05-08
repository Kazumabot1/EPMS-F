package com.epms.entity;

import com.epms.entity.enums.EmployeeAppraisalStatus;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;

@Entity
@Table(
    name = "employee_appraisal_form",
    uniqueConstraints = @UniqueConstraint(
        name = "uk_employee_appraisal_cycle_employee",
        columnNames = {"cycle_id", "employee_id"}
    )
)
@Data
@NoArgsConstructor
@AllArgsConstructor
public class EmployeeAppraisalForm {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "cycle_id", nullable = false)
    private AppraisalCycle cycle;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "employee_id", nullable = false)
    private Employee employee;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "department_id", nullable = false)
    private Department department;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_manager_user_id")
    private User projectManager;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "department_head_user_id")
    private User departmentHead;

    @Column(length = 180)
    private String employeeNameSnapshot;

    @Column(length = 80)
    private String employeeCodeSnapshot;

    @Column(length = 180)
    private String positionSnapshot;

    @Column(length = 180)
    private String departmentNameSnapshot;

    private LocalDate assessmentDate;

    private LocalDate effectiveDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 40)
    private EmployeeAppraisalStatus status = EmployeeAppraisalStatus.PM_DRAFT;

    @Temporal(TemporalType.TIMESTAMP)
    private Date pmSubmittedAt;

    @Temporal(TemporalType.TIMESTAMP)
    private Date deptHeadSubmittedAt;

    @Temporal(TemporalType.TIMESTAMP)
    private Date hrApprovedAt;

    private Integer totalPoints = 0;

    private Integer answeredCriteriaCount = 0;

    private Double scorePercent = 0.0;

    @Column(length = 80)
    private String performanceLabel;

    @Column(nullable = false)
    private Boolean visibleToEmployee = false;

    @Column(nullable = false)
    private Boolean locked = false;

    @Temporal(TemporalType.TIMESTAMP)
    @Column(nullable = false, updatable = false)
    private Date createdAt;

    @Temporal(TemporalType.TIMESTAMP)
    private Date updatedAt;

    @OneToMany(mappedBy = "employeeAppraisalForm", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private List<EmployeeAppraisalCriteriaRating> criteriaRatings = new ArrayList<>();

    @OneToMany(mappedBy = "employeeAppraisalForm", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private List<AppraisalReview> reviews = new ArrayList<>();

    @OneToMany(mappedBy = "employeeAppraisalForm", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @OrderBy("createdAt ASC")
    private List<EmployeeAppraisalHistory> histories = new ArrayList<>();

    @PrePersist
    public void prePersist() {
        Date now = new Date();
        this.createdAt = now;
        this.updatedAt = now;
        if (this.status == null) {
            this.status = EmployeeAppraisalStatus.PM_DRAFT;
        }
        if (this.totalPoints == null) {
            this.totalPoints = 0;
        }
        if (this.answeredCriteriaCount == null) {
            this.answeredCriteriaCount = 0;
        }
        if (this.scorePercent == null) {
            this.scorePercent = 0.0;
        }
        if (this.visibleToEmployee == null) {
            this.visibleToEmployee = false;
        }
        if (this.locked == null) {
            this.locked = false;
        }
    }

    @PreUpdate
    public void preUpdate() {
        this.updatedAt = new Date();
    }
}
