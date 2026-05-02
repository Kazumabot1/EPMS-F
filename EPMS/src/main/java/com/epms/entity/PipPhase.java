package com.epms.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Why this file exists:
 * - Stores each phase inside a PIP.
 * - A PIP can have Phase 1, Phase 2, Phase 3, etc.
 * - Phase status is text because each phase has 3 possible states:
 *   HASNT_STARTED_YET, ONGOING, COMPLETED.
 * - reasonNote stores the creator's progress note/reason for the phase.
 */
@Entity
@Table(name = "pip_phases")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class PipPhase {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "pip_id", nullable = false)
    private Pip pip;

    @Column(name = "phase_number", nullable = false)
    private Integer phaseNumber;

    @Column(name = "phase_goal", nullable = false, length = 4000)
    private String phaseGoal;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date", nullable = false)
    private LocalDate endDate;

    @Column(name = "status", nullable = false, length = 40)
    private String status = "HASNT_STARTED_YET";

    @Column(name = "reason_note", length = 4000)
    private String reasonNote;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "updated_by_user_id")
    private Integer updatedByUserId;
}