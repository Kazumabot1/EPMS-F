package com.epms.dto.appraisal;

import com.epms.entity.enums.AppraisalCycleType;
import com.epms.entity.enums.AppraisalTemplateStatus;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.Date;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AppraisalTemplateResponse {
    private Integer id;
    private String templateName;
    private String description;
    private AppraisalCycleType formType;
    private Boolean targetAllDepartments;
    private List<Integer> departmentIds = new ArrayList<>();
    private List<String> departmentNames = new ArrayList<>();
    private AppraisalTemplateStatus status;
    private Integer versionNo;
    private Date createdAt;
    private Date updatedAt;
    private List<AppraisalSectionResponse> sections = new ArrayList<>();
}
