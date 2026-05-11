package com.epms.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UseKpiTemplateResultDto {
    private int assignmentsCreated;
    private int assignmentsSkippedExisting;
    private int managersNotified;

    /** Number of departments where at least one employee matched (present when applying to all departments). */
    private Integer departmentsWithMatches;
}
