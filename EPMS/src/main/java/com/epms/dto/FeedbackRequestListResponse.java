package com.epms.dto;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class FeedbackRequestListResponse {
    Long id;
    Long campaignId;
    String campaignName;
    Long targetEmployeeId;
    long totalAssignments;
    long submittedAssignments;
}
