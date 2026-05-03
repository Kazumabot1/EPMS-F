package com.epms.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class FeedbackResponseItemRequest {

    @NotNull(message = "Question ID is required")
    private Long questionId;

    /**
     * Rating is validated against the question's configured rating scale in the service layer.
     * It is nullable here because the same request DTO is used for drafts and final submissions.
     */
    private Double ratingValue;

    private String comment;
}
