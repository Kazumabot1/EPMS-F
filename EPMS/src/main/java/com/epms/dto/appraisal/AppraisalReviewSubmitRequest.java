package com.epms.dto.appraisal;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AppraisalReviewSubmitRequest {
    private String recommendation;
    private String comment;
}
