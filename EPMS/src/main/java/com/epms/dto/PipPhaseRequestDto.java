package com.epms.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;

/**
 * Why this file exists:
 * - This represents one phase box from the PIP creation form.
 * - Status and reason are not included because they should only be edited after creation.
 */
@Data
public class PipPhaseRequestDto {
    @NotNull(message = "Phase number is required.")
    private Integer phaseNumber;

    @NotBlank(message = "Phase goal is required.")
    private String phaseGoal;

    @NotNull(message = "Phase start date is required.")
    private LocalDate startDate;

    @NotNull(message = "Phase end date is required.")
    private LocalDate endDate;
}