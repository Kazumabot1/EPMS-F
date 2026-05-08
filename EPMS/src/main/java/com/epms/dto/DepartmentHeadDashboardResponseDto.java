/*
package com.epms.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DepartmentHeadDashboardResponseDto {
    private Integer departmentId;
    private String departmentName;
    private Long employeeCount;
    private Integer teamCount;
    private List<EmployeeResponseDto> employees;
    private List<TeamResponseDto> teams;
}*/









package com.epms.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Date;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DepartmentHeadDashboardResponseDto {
    private Integer departmentId;
    private String departmentName;
    private String departmentCode;
    private String headEmployee;
    private Boolean status;
    private String createdBy;
    private Date createdAt;

    private Long employeeCount;
    private Long currentDepartmentEmployeeCount;
    private Long parentDepartmentEmployeeCount;

    private Integer teamCount;
    private Integer activeTeamCount;
    private Integer inactiveTeamCount;

    private List<EmployeeResponseDto> employees;
    private List<TeamResponseDto> teams;
}