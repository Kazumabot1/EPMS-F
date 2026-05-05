package com.epms.dto;

import jakarta.validation.constraints.NotEmpty;
import lombok.Data;

import java.util.List;

@Data
public class FeedbackCampaignTargetsRequest {

    @NotEmpty(message = "At least one target employee is required.")
    private List<Long> employeeIds;
}
