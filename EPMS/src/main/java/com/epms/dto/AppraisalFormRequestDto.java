package com.epms.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AppraisalFormRequestDto {

    @NotBlank(message = "Form name must not be blank")
    private String formName;

    private String description;

    /** Roles this form targets, e.g. ["Employee","Manager","DepartmentHead","ProjectManager"] */
    private List<String> targetRoles;

    private List<SectionRequest> sections;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SectionRequest {
        private Long id;
        private String title;
        private Integer orderNo;
        private List<QuestionRequest> questions;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class QuestionRequest {
        private Long id;
        private String questionText;
        private String responseType; // RATING, TEXT, YES_NO
        private Boolean isRequired;
        private Double weight;
    }
}
