package com.epms.dto;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class FeedbackFormOptionResponse {
    Long id;
    String formName;
    Boolean anonymousAllowed;
    Integer versionNumber;
    String status;
}
