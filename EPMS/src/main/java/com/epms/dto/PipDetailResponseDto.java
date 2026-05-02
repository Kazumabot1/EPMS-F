package com.epms.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Why this file exists:
 * - This is the full PIP response sent to the frontend.
 * - It is used for Ongoing/Past PIP list cards and the detail modal.
 * - It includes creator info, employee info, phases, comments, and update history.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class PipDetailResponseDto {
    private Integer id;
    private Integer employeeUserId;
    private String employeeName;

    private Integer createdByUserId;
    private String createdByName;
    private String createdByPosition;

    private String goal;
    private String expectedOutcomes;
    private String comments;

    private LocalDate startDate;
    private LocalDate endDate;

    /**
     * true = active / ongoing
     * false = finished / past
     */
    private Boolean status;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private LocalDateTime finishedAt;

    private Integer finishedByUserId;
    private String finishedByName;

    /**
     * Frontend uses this to decide whether to show editable phase controls.
     */
    private Boolean canEdit;

    /**
     * Frontend uses this to enable/disable the red FINISH button.
     */
    private Boolean canFinish;

    private List<PipPhaseResponseDto> phases;
    private List<PipUpdateHistoryDto> updates;
}