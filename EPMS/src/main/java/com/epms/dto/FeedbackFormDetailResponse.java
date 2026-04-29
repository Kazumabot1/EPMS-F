package com.epms.dto;

import lombok.Builder;
import lombok.Value;

import java.util.List;

@Value
@Builder
public class FeedbackFormDetailResponse {
    Long id;
    String formName;
    Boolean anonymousAllowed;
    Integer versionNumber;
    String status;
    List<SectionDetail> sections;

    @Value
    @Builder
    public static class SectionDetail {
        Long id;
        String title;
        Integer orderNo;
        List<QuestionDetail> questions;
    }

    @Value
    @Builder
    public static class QuestionDetail {
        Long id;
        String questionText;
        Integer questionOrder;
        Long ratingScaleId;
        Double weight;
        Boolean isRequired;
    }
}
