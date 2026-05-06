package com.epms.dto;

import lombok.Data;

import java.time.LocalDateTime;

/**
 * Why this file is updated:
 * - Added location for displaying normal and follow-up meetings.
 * - Added followUpLocation so parent meeting detail can show follow-up location too.
 */
@Data
public class OneOnOneMeetingResponseDto {
    private Integer id;

    private Integer employeeId;
    private String employeeFirstName;
    private String employeeLastName;

    private Integer managerId;
    private String managerFirstName;
    private String managerLastName;

    private LocalDateTime scheduledDate;
    private String location;
    private String notes;

    private Boolean status;
    private LocalDateTime followUpDate;
    private LocalDateTime isFinalized;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    private Integer parentMeetingId;
    private Boolean followUp;

    private String followUpNotes;

    private Integer followUpMeetingId;
    private LocalDateTime followUpStartDate;
    private LocalDateTime followUpEndDate;
    private String followUpMeetingNotes;
    private String followUpLocation;

    private OneOnOneActionItemResponseDto actionItem;
}