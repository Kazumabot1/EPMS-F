package com.epms.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(
    name = "appraisal_cycle_department",
    uniqueConstraints = @UniqueConstraint(
        name = "uk_appraisal_cycle_department",
        columnNames = {"cycle_id", "department_id"}
    )
)
@Data
@NoArgsConstructor
@AllArgsConstructor
public class AppraisalCycleDepartment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "cycle_id", nullable = false)
    private AppraisalCycle cycle;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "department_id", nullable = false)
    private Department department;
}
