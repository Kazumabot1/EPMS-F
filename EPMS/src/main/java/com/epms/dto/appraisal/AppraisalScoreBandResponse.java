package com.epms.dto.appraisal;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AppraisalScoreBandResponse {
    private Integer id;
    private Integer minScore;
    private Integer maxScore;
    private String label;
    private String description;
    private Integer sortOrder;
    private Boolean active;
}
