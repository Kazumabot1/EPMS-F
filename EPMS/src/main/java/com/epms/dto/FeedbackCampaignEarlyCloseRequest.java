package com.epms.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class FeedbackCampaignEarlyCloseRequest {
    @NotBlank(message = "Early close reason is required.")
    @Size(max = 1000, message = "Early close reason cannot exceed 1,000 characters.")
    private String reason;
}
