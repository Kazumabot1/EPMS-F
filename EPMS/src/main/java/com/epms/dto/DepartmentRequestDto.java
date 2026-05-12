/*
package com.epms.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class DepartmentRequestDto {

    @NotBlank(message = "Department name is required")
    private String departmentName;

    private String departmentCode;

    private String headEmployee;

    private Boolean status;
}
*/










package com.epms.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class DepartmentRequestDto {

    @NotBlank(message = "Department name is required")
    private String departmentName;

    private String departmentCode;

    private String headEmployee;

    private Boolean status;

    @Size(max = 150, message = "Reason must not exceed 150 characters")
    private String reason;
}