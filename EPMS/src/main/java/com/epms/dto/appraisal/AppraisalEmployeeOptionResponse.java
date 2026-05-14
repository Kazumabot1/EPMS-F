package com.epms.dto.appraisal;

import com.epms.entity.enums.EmployeeAppraisalStatus;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AppraisalEmployeeOptionResponse {
    private Integer employeeId;
    private String employeeName;
    private String employeeCode;
    private Integer departmentId;
    private String departmentName;
    private String positionName;
    private Integer existingFormId;
    private EmployeeAppraisalStatus existingStatus;
}
