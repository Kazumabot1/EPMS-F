package com.epms.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.util.Date;

@Entity
@Table(name = "one_on_one_meetings")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class OneOnOneMeeting {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;
    private Integer managerId;
    private Integer employeeId;
    @Temporal(TemporalType.TIMESTAMP)
    private Date scheduledDate;
    private String notes;
    private String status; // SCHEDULED, COMPLETED, CANCELLED
    @Temporal(TemporalType.DATE)
    private Date followUpDate;
    private Boolean isFinalized = false;
    @Temporal(TemporalType.TIMESTAMP)
    private Date createdAt = new Date();
    @Temporal(TemporalType.TIMESTAMP)
    private Date updatedAt;
}