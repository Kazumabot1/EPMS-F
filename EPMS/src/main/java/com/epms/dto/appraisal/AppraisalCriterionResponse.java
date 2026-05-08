package com.epms.dto.appraisal;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AppraisalCriterionResponse {
    private Integer id;
    private String criteriaText;
    private String description;
    private Integer sortOrder;
    private Integer maxRating;
    private Boolean ratingRequired;
    private Boolean active;
    private Integer ratingValue;
    private String ratingComment;
}
