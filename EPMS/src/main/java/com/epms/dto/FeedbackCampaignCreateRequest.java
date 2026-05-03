package com.epms.dto;

import com.epms.entity.enums.FeedbackCampaignRound;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
public class FeedbackCampaignCreateRequest {

    @NotBlank(message = "Campaign name is required.")
    private String name;

    @Min(value = 2000, message = "Review year is invalid.")
    @Max(value = 2100, message = "Review year is invalid.")
    private Integer reviewYear;

    private FeedbackCampaignRound reviewRound;

    /**
     * Preferred precise submission window used by the HR dashboard.
     * startDate/endDate are kept as a backwards-compatible fallback for older screens.
     */
    private LocalDateTime startAt;

    private LocalDateTime endAt;

    private LocalDate startDate;

    private LocalDate endDate;

    @NotNull(message = "Feedback form ID is required.")
    private Long formId;

    private String description;

    private String instructions;
}
