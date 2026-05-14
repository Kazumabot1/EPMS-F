package com.epms.dto.appraisal;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PmAppraisalSubmitRequest {
    private LocalDate assessmentDate;
    private LocalDate effectiveDate;
    private List<AppraisalRatingInput> ratings = new ArrayList<>();
    private String recommendation;
    private String comment;
    private Long managerSignatureId;
    private String managerSignatureImageData;
    private String managerSignatureImageType;
}
