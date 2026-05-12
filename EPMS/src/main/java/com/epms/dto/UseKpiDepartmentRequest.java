package com.epms.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UseKpiDepartmentRequest {

    /**
     * When true, applies the KPI template to every active department (status not false).
     * Other department fields are ignored.
     */
    private Boolean applyToAllDepartments;

    /**
     * Apply to several departments at once (distinct ids). Ignored when {@link #applyToAllDepartments} is true.
     */
    private List<Integer> departmentIds;

    /**
     * Single department (legacy). Ignored when {@link #applyToAllDepartments} is true or {@link #departmentIds} is non-empty.
     */
    private Integer departmentId;
}
