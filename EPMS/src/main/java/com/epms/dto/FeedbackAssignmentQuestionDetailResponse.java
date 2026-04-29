package com.epms.dto;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class FeedbackAssignmentQuestionDetailResponse {
    Long id;
    String questionText;
    Integer questionOrder;
    Integer ratingScaleId;
    Double weight;
    Boolean required;
    Double existingRatingValue;
    String existingComment;
}
