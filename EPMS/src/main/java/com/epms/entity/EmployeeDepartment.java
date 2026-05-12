package com.epms.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.util.Date;

/**
 * Why this file is changed:
 * - currentdepartment and parentdepartment are now foreign keys to department.id.
 * - This is better than storing department names as text.
 *
 * New department rule:
 *   working department = parentDepartment if not null
 *   otherwise currentDepartment
 *
 * Column meaning:
 * - currentdepartment = employee's original/current department id
 * - parentdepartment = employee's working/assigned department id
 */
@Entity
@Table(name = "employee_department")
@Data
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(callSuper = false)
public class EmployeeDepartment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    /**
     * employee_department.employee_id -> employee.id
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_id", referencedColumnName = "id", nullable = false)
    private Employee employee;

    /**
     * employee_department.currentdepartment -> department.id
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "currentdepartment", referencedColumnName = "id")
    private Department currentDepartment;

    /**
     * employee_department.parentdepartment -> department.id
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parentdepartment", referencedColumnName = "id")
    private Department parentDepartment;

    @Column(name = "assign_by")
    private String assignBy;

    @Temporal(TemporalType.DATE)
    private Date startdate;

    @Temporal(TemporalType.DATE)
    private Date enddate;
}