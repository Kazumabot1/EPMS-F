package com.epms.dto;

import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class FeedbackCampaignEarlyCloseReviewRequest {
    @Size(max = 1000, message = "Review note cannot exceed 1,000 characters.")
    private String reviewNote;
}
