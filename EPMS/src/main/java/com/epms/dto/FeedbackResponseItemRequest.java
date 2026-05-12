package com.epms.dto;

import jakarta.validation.constraints.AssertTrue;
import lombok.Data;

@Data
public class FeedbackResponseItemRequest {

    /**
     * Preferred ID for the frozen assignment-specific question snapshot.
     */
    private Long assignmentQuestionId;

    /**
     * Legacy form question ID. Accepted as a fallback during migration.
     */
    private Long questionId;

    /**
     * Rating is validated against the assignment question's configured rating scale in the service layer.
     * It is nullable here because the same request DTO is used for drafts and final submissions.
     */
    private Double ratingValue;

    private String comment;

    @AssertTrue(message = "Assignment Question ID or legacy Question ID is required")
    public boolean isQuestionReferenceProvided() {
        return assignmentQuestionId != null || questionId != null;
    }
}
