package com.epms.dto;

import com.epms.entity.enums.EmployeeKpiStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ManagerKpiAssignmentDto {
    private Integer employeeKpiFormId;
    private Integer employeeId;
    private String employeeName;
    private EmployeeKpiStatus status;
    private Double totalScore;
    private Double totalWeightedScore;

    @Builder.Default
    private List<ManagerKpiScoreLineDto> lines = new ArrayList<>();
}
