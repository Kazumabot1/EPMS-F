package com.epms.dto;

import lombok.Builder;
import lombok.Value;

import java.time.LocalDateTime;

@Value
@Builder
public class FeedbackQuestionBankResponse {
    Long id;
    String questionCode;
    String competencyCode;
    String questionText;
    String responseType;
    String scoringBehavior;
    Integer ratingScaleId;
    Double weight;
    Boolean required;
    String helpText;
    String status;
    Long activeVersionId;
    Integer activeVersionNumber;
    LocalDateTime createdAt;
    LocalDateTime updatedAt;
}
