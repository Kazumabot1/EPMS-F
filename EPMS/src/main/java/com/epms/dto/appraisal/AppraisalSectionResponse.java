package com.epms.dto.appraisal;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AppraisalSectionResponse {
    private Integer id;
    private String sectionName;
    private String description;
    private Integer sortOrder;
    private Boolean active;
    private List<AppraisalCriterionResponse> criteria = new ArrayList<>();
}
