package com.epms.dto;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class FeedbackRatingOptionResponse {
    Integer value;
    String label;
}
