package com.epms.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Why this file exists:
 * - Used for the employee dropdown in PIP creation.
 * - Active employees are shown.
 * - If an employee already has an active PIP, frontend disables that option.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class PipEligibleEmployeeDto {
    private Integer userId;
    private String employeeName;
    private Integer departmentId;
    private String departmentName;
    private Boolean alreadyHasActivePip;
    private String disabledReason;
}