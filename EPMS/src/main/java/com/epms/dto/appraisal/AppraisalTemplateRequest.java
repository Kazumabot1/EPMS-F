package com.epms.dto.appraisal;

import com.epms.entity.enums.AppraisalCycleType;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AppraisalTemplateRequest {
    private String templateName;
    private String description;
    private AppraisalCycleType formType;
    private Boolean targetAllDepartments = false;
    private List<Integer> departmentIds = new ArrayList<>();
    private List<AppraisalSectionRequest> sections = new ArrayList<>();
}
