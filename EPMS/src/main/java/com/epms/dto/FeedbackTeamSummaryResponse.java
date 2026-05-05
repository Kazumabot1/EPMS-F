package com.epms.dto;

import lombok.Builder;
import lombok.Value;

import java.util.List;

@Value
@Builder
public class FeedbackTeamSummaryResponse {
    Long managerUserId;
    Integer totalDirectReports;
    Integer totalClosedResults;
    List<FeedbackResultItemResponse> items;
}
