package com.epms.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ManagerKpiTemplateSummaryDto {
    private Integer kpiFormId;
    private String title;
    /** Number of assignments in this department that are not yet finalized */
    private Long openAssignments;
    /** KPI template scoring window (for managers finalizing before period end) */
    private LocalDate periodStartDate;
    private LocalDate periodEndDate;
}
