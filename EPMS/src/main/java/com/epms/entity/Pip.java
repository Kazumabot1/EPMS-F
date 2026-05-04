//package com.epms.entity;
//
//import jakarta.persistence.*;
//import lombok.Data;
//import lombok.NoArgsConstructor;
//import lombok.AllArgsConstructor;
//import java.util.Date;
//
//@Entity
//@Table(name = "pips")
//@Data
//@NoArgsConstructor
//@AllArgsConstructor
//public class Pip {
//    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
//    private Integer id;
//    private Integer employeeId;
//    private Integer createdBy;
//    private String title;
//    private String objectives;
//    private String expectedOutcomes;
//    @Temporal(TemporalType.DATE)
//    private Date reviewDate;
//    private String status; // DRAFT, ACTIVE, COMPLETED, FAILED, CANCELLED
//    @Temporal(TemporalType.DATE)
//    private Date startDate;
//    @Temporal(TemporalType.DATE)
//    private Date endDate;
//    private Boolean isAcknowledged = false;
//    @Temporal(TemporalType.TIMESTAMP)
//    private Date createdAt = new Date();
//    @Temporal(TemporalType.TIMESTAMP)
//    private Date updatedAt;
//}

package com.epms.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Performance Improvement Plan header table.
 *
 * Why this file exists:
 * - Stores the main PIP information.
 * - One PIP belongs to one employee user.
 * - One PIP is created by one authorized creator.
 * - status=true means active / ongoing.
 * - status=false means finished / past / view-only.
 * - Phases are stored in pip_phases and connected with @OneToMany.
 */
@Entity
@Table(name = "pips")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Pip {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "employee_user_id", nullable = false)
    private Integer employeeUserId;

    @Column(name = "created_by_user_id", nullable = false)
    private Integer createdByUserId;

    @Column(name = "goal", nullable = false, length = 4000)
    private String goal;

    @Column(name = "expected_outcomes", nullable = false, length = 4000)
    private String expectedOutcomes;

    @Column(name = "comments", length = 4000)
    private String comments;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date", nullable = false)
    private LocalDate endDate;

    @Column(name = "status", nullable = false)
    private Boolean status = true;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "finished_at")
    private LocalDateTime finishedAt;

    @Column(name = "finished_by_user_id")
    private Integer finishedByUserId;

    @OneToMany(mappedBy = "pip", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @OrderBy("phaseNumber ASC")
    private List<PipPhase> phases = new ArrayList<>();

    public void addPhase(PipPhase phase) {
        phases.add(phase);
        phase.setPip(this);
    }
}