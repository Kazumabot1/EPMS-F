package com.epms.dto.appraisal;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AppraisalRatingInput {
    private Integer criteriaId;
    private Integer ratingValue;
    private String comment;
}
