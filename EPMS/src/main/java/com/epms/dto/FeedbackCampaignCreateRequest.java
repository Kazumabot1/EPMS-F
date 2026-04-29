package com.epms.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;

@Data
public class FeedbackCampaignCreateRequest {

    @NotBlank(message = "Campaign name is required.")
    private String name;

    @NotNull(message = "Campaign start date is required.")
    private LocalDate startDate;

    @NotNull(message = "Campaign end date is required.")
    private LocalDate endDate;

    @NotNull(message = "Feedback form ID is required.")
    private Long formId;
}
