package com.epms.dto;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class OneOnOneMeetingResponseDto {
    private Integer id;

    private Integer employeeId;
    private String employeeFirstName;
    private String employeeLastName;

    /**
     * Optional scheduler/manager employee record.
     * This can be null for HR-created meetings.
     */
    private Integer managerId;
    private String managerFirstName;
    private String managerLastName;

    /**
     * Actual logged-in user who created the meeting.
     */
    private Integer creatorUserId;
    private String creatorName;
    private String creatorEmail;

    private LocalDateTime scheduledDate;
    private String location;
    private String notes;

    private Boolean status;
    private LocalDateTime firstMeetingEndDate;

    private LocalDateTime followUpDate;
    private String followUpGoal;
    private String followUpNotes;
    private String followUpLocation;
    private Boolean followUpStatus;
    private LocalDateTime followUpEndDate;
    private Boolean followUpReminder24hSent;

    private LocalDateTime isFinalized;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    private Integer parentMeetingId;

    /**
     * True when the meeting is currently in follow-up stage.
     */
    private Boolean followUp;

    /**
     * Compatibility fields used by the current frontend.
     */
    private Integer followUpMeetingId;
    private LocalDateTime followUpStartDate;
    private String followUpMeetingNotes;

    private OneOnOneActionItemResponseDto actionItem;
}
