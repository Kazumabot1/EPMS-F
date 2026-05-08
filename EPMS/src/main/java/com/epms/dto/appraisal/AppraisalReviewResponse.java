package com.epms.dto.appraisal;

import com.epms.entity.enums.AppraisalDecision;
import com.epms.entity.enums.AppraisalReviewStage;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Date;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AppraisalReviewResponse {
    private Integer id;
    private AppraisalReviewStage reviewStage;
    private Integer reviewerUserId;
    private String reviewerName;
    private String recommendation;
    private String comment;
    private AppraisalDecision decision;
    private Date submittedAt;
}
