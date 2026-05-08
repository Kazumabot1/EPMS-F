package com.epms.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "appraisal_form_criteria")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class AppraisalFormCriteria {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "section_id", nullable = false)
    private AppraisalSection section;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String criteriaText;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false)
    private Integer sortOrder = 0;

    /**
     * The template only stores the rating scale UI range.
     * PM-selected values are stored in EmployeeAppraisalCriteriaRating.ratingValue.
     */
    @Column(nullable = false)
    private Integer maxRating = 5;

    @Column(nullable = false)
    private Boolean ratingRequired = true;

    @Column(nullable = false)
    private Boolean active = true;

    @OneToMany(mappedBy = "criteria", fetch = FetchType.LAZY)
    private List<EmployeeAppraisalCriteriaRating> employeeRatings = new ArrayList<>();

    @PrePersist
    public void prePersist() {
        if (this.sortOrder == null) {
            this.sortOrder = 0;
        }
        if (this.maxRating == null) {
            this.maxRating = 5;
        }
        if (this.ratingRequired == null) {
            this.ratingRequired = true;
        }
        if (this.active == null) {
            this.active = true;
        }
    }
}
