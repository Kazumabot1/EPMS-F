package com.epms.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.Date;
import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class DepartmentComparisonTeamDto {
    private Integer id;
    private String teamName;
    private String status;
    private String teamGoal;

    private Integer teamLeaderId;
    private String teamLeaderName;
    private String teamLeaderPositionTitle;

    private Date createdDate;

    private Integer createdById;
    private String createdByName;

    private Integer employeeCount;

    private List<DepartmentComparisonEmployeeDto> members = new ArrayList<>();
}