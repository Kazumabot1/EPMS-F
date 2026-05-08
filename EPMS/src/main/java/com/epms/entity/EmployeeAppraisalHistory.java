package com.epms.entity;

import com.epms.entity.enums.EmployeeAppraisalStatus;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Date;

@Entity
@Table(name = "employee_appraisal_history")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class EmployeeAppraisalHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "employee_appraisal_form_id", nullable = false)
    private EmployeeAppraisalForm employeeAppraisalForm;

    @Enumerated(EnumType.STRING)
    @Column(length = 40)
    private EmployeeAppraisalStatus fromStatus;

    @Enumerated(EnumType.STRING)
    @Column(length = 40)
    private EmployeeAppraisalStatus toStatus;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "action_by_user_id")
    private User actionByUser;

    @Column(nullable = false, length = 80)
    private String actionName;

    @Column(columnDefinition = "TEXT")
    private String note;

    @Temporal(TemporalType.TIMESTAMP)
    @Column(nullable = false, updatable = false)
    private Date createdAt;

    @PrePersist
    public void prePersist() {
        this.createdAt = new Date();
    }
}
