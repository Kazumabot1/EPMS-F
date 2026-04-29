package com.epms.dto;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class FeedbackAssignmentPreviewItemResponse {
    Long requestId;
    Long targetEmployeeId;
    int managerAssignments;
    int peerAssignments;
    int totalAssignments;
}
