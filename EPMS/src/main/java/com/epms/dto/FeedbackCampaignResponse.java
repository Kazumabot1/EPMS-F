package com.epms.dto;

import com.epms.entity.enums.FeedbackCampaignRound;
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
    Integer reviewYear;
    FeedbackCampaignRound reviewRound;
    LocalDate startDate;
    LocalDate endDate;
    LocalDateTime startAt;
    LocalDateTime endAt;
    String description;
    String instructions;
    String status;
    Long formId;
    Long createdBy;
    LocalDateTime createdAt;
    int targetCount;
    int assignmentCount;
    List<Long> targetEmployeeIds;
}
