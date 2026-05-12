package com.epms.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;

@Data
public class FeedbackQuestionRuleUpsertRequest {

    @NotNull(message = "Question version is required")
    private Long questionVersionId;

    @Min(value = 1, message = "Minimum level rank must be between 1 and 9")
    @Max(value = 9, message = "Minimum level rank must be between 1 and 9")
    private Integer targetLevelMinRank = 1;

    @Min(value = 1, message = "Maximum level rank must be between 1 and 9")
    @Max(value = 9, message = "Maximum level rank must be between 1 and 9")
    private Integer targetLevelMaxRank = 9;

    private Long targetPositionId;

    private Long targetDepartmentId;

    /** Backward-compatible single-role field. */
    private String evaluatorRelationshipType;

    /** Preferred multi-role field. Backend creates one rule per selected evaluator role. */
    private List<String> evaluatorRelationshipTypes;

    @NotBlank(message = "Section code is required")
    private String sectionCode;

    @NotBlank(message = "Section title is required")
    private String sectionTitle;

    private Integer sectionOrder = 1;

    private Integer displayOrder = 1;

    private Boolean requiredOverride;

    private Double weightOverride;

    private Integer rulePriority = 100;

    private Boolean active = true;
}
