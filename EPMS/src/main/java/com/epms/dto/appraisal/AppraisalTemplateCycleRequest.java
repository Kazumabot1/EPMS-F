package com.epms.dto.appraisal;

import jakarta.validation.Valid;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AppraisalTemplateCycleRequest {
    @Valid
    private AppraisalTemplateRequest template;

    @Valid
    private AppraisalCycleRequest cycle;
}
