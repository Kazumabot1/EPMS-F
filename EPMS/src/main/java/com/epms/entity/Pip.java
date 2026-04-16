package com.epms.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.util.Date;

@Entity
@Table(name = "pips")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Pip {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;
    private Integer employeeId;
    private Integer createdBy;
    private String title;
    private String objectives;
    private String expectedOutcomes;
    @Temporal(TemporalType.DATE)
    private Date reviewDate;
    private String status; // DRAFT, ACTIVE, COMPLETED, FAILED, CANCELLED
    @Temporal(TemporalType.DATE)
    private Date startDate;
    @Temporal(TemporalType.DATE)
    private Date endDate;
    private Boolean isAcknowledged = false;
    @Temporal(TemporalType.TIMESTAMP)
    private Date createdAt = new Date();
    @Temporal(TemporalType.TIMESTAMP)
    private Date updatedAt;
}