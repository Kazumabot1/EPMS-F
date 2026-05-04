package com.epms.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Why this file exists:
 * - This DTO sends phase information to the frontend.
 * - It is used in the PIP Plan detail modal.
 * - It includes phase status, reason/note, and who last updated the phase.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class PipPhaseResponseDto {
    private Integer id;
    private Integer phaseNumber;
    private String phaseGoal;
    private LocalDate startDate;
    private LocalDate endDate;
    private String status;
    private String reasonNote;
    private LocalDateTime updatedAt;
    private Integer updatedByUserId;
    private String updatedByName;
}