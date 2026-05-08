package com.epms.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class DepartmentComparisonEmployeeDto {
    private Integer userId;
    private Integer employeeId;
    private String employeeName;
    private String email;
    private String positionTitle;
}