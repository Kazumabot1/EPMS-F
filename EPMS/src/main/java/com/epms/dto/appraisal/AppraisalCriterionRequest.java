package com.epms.dto.appraisal;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AppraisalCriterionRequest {
    private Integer id;
    private String criteriaText;
    private String description;
    private Integer sortOrder;
    private Integer maxRating = 5;
    private Boolean ratingRequired = true;
    private Boolean active = true;
}
