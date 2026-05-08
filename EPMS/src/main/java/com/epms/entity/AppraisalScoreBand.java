package com.epms.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "appraisal_score_band")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class AppraisalScoreBand {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(nullable = false)
    private Integer minScore;

    @Column(nullable = false)
    private Integer maxScore;

    @Column(nullable = false, length = 100)
    private String label;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false)
    private Integer sortOrder = 0;

    @Column(nullable = false)
    private Boolean active = true;

    @PrePersist
    public void prePersist() {
        if (this.sortOrder == null) {
            this.sortOrder = 0;
        }
        if (this.active == null) {
            this.active = true;
        }
    }
}
