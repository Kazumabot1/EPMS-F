package com.epms.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class EmployeeDepartmentTransferPreviewDto {
    private Boolean workingDepartmentChanged = false;
    private Boolean blocked = false;
    private String blockingReason;

    private Boolean requiresConfirmation = false;
    private Boolean requiresTeamSelection = false;

    private Integer employeeId;
    private String employeeName;

    private Integer oldWorkingDepartmentId;
    private String oldWorkingDepartmentName;
    private Integer newWorkingDepartmentId;
    private String newWorkingDepartmentName;

    private Integer oldTeamId;
    private String oldTeamName;

    private String message;

    private List<TeamOptionDto> teams = new ArrayList<>();

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TeamOptionDto {
        private Integer id;
        private String teamName;
        private String status;
        private Boolean active;
    }
}