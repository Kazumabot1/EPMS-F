package com.epms.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "kpi_items")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class KpiItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "kpi_name", nullable = false)
    private String name;

    // Many KPI Items belong to one Category
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "kpi_category_id", nullable = false)
    private KpiCategory kpiCategory;

}