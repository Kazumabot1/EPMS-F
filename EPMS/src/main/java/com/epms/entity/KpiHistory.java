package com.epms.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.util.Date;

@Entity
@Table(name = "kpi_histories")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class KpiHistory {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;
    private Integer kpiId;
    private String title;
    private String description;
    private Double targetValue;
    private String unit;
    private Integer weight;
    private String measurementType;
    private Integer employeeId;
    private Integer departmentId;
    private Integer cycleId;
    private Date startDate;
    private Date endDate;
    private String status;
    private Double actualValue;
    @Temporal(TemporalType.TIMESTAMP)
    private Date changedAt = new Date();
    private String changedBy;
}