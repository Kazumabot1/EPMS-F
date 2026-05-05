package com.epms.dto;

import lombok.Builder;
import lombok.Value;

import java.util.List;

@Value
@Builder
public class FeedbackAssignmentSectionDetailResponse {
    Long id;
    String title;
    Integer orderNo;
    List<FeedbackAssignmentQuestionDetailResponse> questions;
}
