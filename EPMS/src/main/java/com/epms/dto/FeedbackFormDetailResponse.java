package com.epms.dto;

import lombok.Builder;
import lombok.Value;

import java.time.LocalDateTime;
import java.util.List;

@Value
@Builder
public class FeedbackFormDetailResponse {
    Long id;
    String formName;
    Boolean anonymousAllowed;
    Long rootFormId;
    Integer versionNumber;
    String status;
    Long createdByUserId;
    LocalDateTime createdAt;
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
