package com.epms.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class FeedbackReceivedQuestionItemResponse {
    private Long questionId;
    private String questionText;
    private Integer questionOrder;
    private String sectionTitle;
    private Integer sectionOrder;
    private Boolean required;
    private Double ratingValue;
    private String comment;
}
