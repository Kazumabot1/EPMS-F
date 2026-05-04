package com.epms.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;
import java.util.List;

/**
 * Why this file exists:
 * - This is the request body for creating a PIP.
 * - createdBy is not accepted from frontend for security.
 * - Backend gets the creator from the currently logged-in user.
 */
@Data
public class PipCreateRequestDto {
    @NotNull(message = "Employee is required.")
    private Integer employeeUserId;

    @NotBlank(message = "PIP goal is required.")
    private String goal;

    @NotBlank(message = "Expected outcomes are required.")
    private String expectedOutcomes;

    @NotNull(message = "Start date is required.")
    private LocalDate startDate;

    @NotNull(message = "End date is required.")
    private LocalDate endDate;

    @Valid
    @NotEmpty(message = "At least one phase is required.")
    private List<PipPhaseRequestDto> phases;
}