package com.epms.dto;

import lombok.Data;

import java.util.ArrayList;
import java.util.Date;
import java.util.List;

public final class AssessmentFormDtos {

    private AssessmentFormDtos() {
    }

    @Data
    public static class AssessmentQuestionPayload {
        private Integer id;
        private String questionText;
        private String responseType;
        private Boolean isRequired;
        private Double weight;
    }

    @Data
    public static class AssessmentSectionPayload {
        private Integer id;
        private String title;
        private Integer orderNo;
        private List<AssessmentQuestionPayload> questions = new ArrayList<>();
    }

    @Data
    public static class AssessmentFormPayload {
        private String formName;
        private String description;
        private List<String> targetRoles = new ArrayList<>();
        private List<AssessmentSectionPayload> sections = new ArrayList<>();
    }

    @Data
    public static class AssessmentQuestionResponse {
        private Integer id;
        private String questionText;
        private String responseType;
        private Boolean isRequired;
        private Double weight;
    }

    @Data
    public static class AssessmentSectionResponse {
        private Integer id;
        private String title;
        private Integer orderNo;
        private List<AssessmentQuestionResponse> questions = new ArrayList<>();
    }

    @Data
    public static class AssessmentFormResponse {
        private Integer id;
        private String formName;
        private String description;
        private Boolean isActive;
        private List<String> targetRoles = new ArrayList<>();
        private Date createdAt;
        private Date updatedAt;
        private List<AssessmentSectionResponse> sections = new ArrayList<>();
    }
}