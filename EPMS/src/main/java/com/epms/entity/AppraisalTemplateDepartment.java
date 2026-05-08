package com.epms.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(
    name = "appraisal_template_department",
    uniqueConstraints = @UniqueConstraint(
        name = "uk_appraisal_template_department",
        columnNames = {"template_id", "department_id"}
    )
)
@Data
@NoArgsConstructor
@AllArgsConstructor
public class AppraisalTemplateDepartment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "template_id", nullable = false)
    private AppraisalFormTemplate template;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "department_id", nullable = false)
    private Department department;
}
