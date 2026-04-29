package com.epms.dto;

import lombok.Builder;
import lombok.Value;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Value
@Builder
public class FeedbackCampaignResponse {
    Long id;
    String name;
    LocalDate startDate;
    LocalDate endDate;
    String status;
    Long formId;
    Long createdBy;
    LocalDateTime createdAt;
    int targetCount;
    int assignmentCount;
    List<Long> targetEmployeeIds;
}
