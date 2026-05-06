package com.epms.dto;

import lombok.Data;

import java.time.LocalDateTime;

/**
 * Why this file is updated:
 * - Added location field.
 * - Used by both normal meeting creation and follow-up meeting creation.
 */
@Data
public class OneOnOneMeetingRequestDto {
    private Integer employeeId;
    private LocalDateTime scheduledDate;
    private String location;
    private String notes;
    private Integer parentMeetingId;
    private String followUpNotes;
}