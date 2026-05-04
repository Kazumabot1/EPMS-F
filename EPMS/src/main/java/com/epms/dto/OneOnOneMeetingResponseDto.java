package com.epms.dto;

import lombok.Data;

import java.time.LocalDateTime;

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
    private String notes;

    private Boolean status;

    private LocalDateTime followUpDate;
    private LocalDateTime isFinalized;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    private Integer parentMeetingId;
    private boolean followUp;

    private String followUpNotes;

    private OneOnOneActionItemResponseDto actionItem;

    // Combined parent + follow-up history fields for Past modal
    private Integer followUpMeetingId;
    private LocalDateTime followUpStartDate;
    private LocalDateTime followUpEndDate;
    private String followUpMeetingNotes;
}