package com.epms.dto;

import lombok.Builder;
import lombok.Value;

import java.time.LocalDateTime;

@Value
@Builder
public class FeedbackFormOptionResponse {
    Long id;
    String formName;
    Boolean anonymousAllowed;
    Long rootFormId;
    Integer versionNumber;
    String status;
    Long createdByUserId;
    LocalDateTime createdAt;
}
