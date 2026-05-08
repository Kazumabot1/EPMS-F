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
    Boolean autoSubmitCompletedDraftsOnClose;
    String earlyCloseRequestStatus;
    LocalDateTime earlyCloseRequestedAt;
    Long earlyCloseRequestedByUserId;
    String earlyCloseRequestReason;
    LocalDateTime earlyCloseReviewedAt;
    Long earlyCloseReviewedByUserId;
    String earlyCloseReviewReason;
    LocalDateTime closedAt;
    Long closedByUserId;
    String closeReason;
    Boolean closedEarly;
    Long createdBy;
    LocalDateTime createdAt;
    int targetCount;
    int assignmentCount;
    List<Long> targetEmployeeIds;
}
