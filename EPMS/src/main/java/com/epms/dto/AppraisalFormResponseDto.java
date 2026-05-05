package com.epms.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AppraisalFormResponseDto {

    private Long id;
    private String formName;
    private String description;
    private Boolean isActive;
    private List<String> targetRoles;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private List<SectionResponse> sections;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SectionResponse {
        private Long id;
        private String title;
        private Integer orderNo;
        private List<QuestionResponse> questions;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class QuestionResponse {
        private Long id;
        private String questionText;
        private String responseType;
        private Boolean isRequired;
        private Double weight;
    }
}
