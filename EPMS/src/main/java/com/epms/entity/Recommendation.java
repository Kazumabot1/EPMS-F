package com.epms.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Entity
@Table(name = "recommendations")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Recommendation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer Id;

    @ManyToOne
    @JoinColumn(name = "appraisal_id")
    private Appraisal appraisal;

    @ManyToOne
    @JoinColumn(name = "recommended_by")
    private Employee recommendedBy;

    private String recommendationType; // promotion, increment
    private String recommendedValue;
    private String approvalStatus;

    @ManyToOne
    @JoinColumn(name = "approved_by")
    private Employee approvedBy;
}