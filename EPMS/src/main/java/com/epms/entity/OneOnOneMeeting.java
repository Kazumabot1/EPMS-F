package com.epms.entity;

import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDateTime;

@Entity
@Table(name = "one_on_one_meetings")
@Data
public class OneOnOneMeeting {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_id")
    private Employee employee;

    /**
     * Optional employee record for the scheduler/manager.
     * HR accounts may not be linked to Employee, so this can be null.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "manager_id")
    private Employee manager;

    /**
     * Actual logged-in user who created the meeting.
     * This fixes HR-created meetings showing the selected employee as creator.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by_user_id")
    private User createdByUser;

    @Column(name = "scheduled_date")
    private LocalDateTime scheduledDate;

    @Column(name = "location", length = 500)
    private String location;

    @Column(length = 1000)
    private String notes;

    /**
     * First meeting status.
     * false/null = upcoming, true = ongoing.
     */
    private Boolean status;

    /**
     * Whole 1:1 process finalized time.
     * This is set only when there is no follow-up, or when the follow-up is fully ended.
     */
    @Column(name = "is_finalized")
    private LocalDateTime isFinalized;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    /**
     * First/normal meeting end time.
     */
    @Column(name = "first_meeting_end_date")
    private LocalDateTime firstMeetingEndDate;

    /**
     * Follow-up meeting start date/time.
     */
    @Column(name = "follow_up_date")
    private LocalDateTime followUpDate;

    /**
     * Goal/agenda for the follow-up meeting.
     */
    @Column(name = "follow_up_goal", length = 1000)
    private String followUpGoal;

    /**
     * Notes/result written during the follow-up meeting.
     */
    @Column(name = "follow_up_notes", length = 1000)
    private String followUpNotes;

    @Column(name = "follow_up_location", length = 500)
    private String followUpLocation;

    /**
     * Follow-up meeting status.
     * false/null = upcoming, true = ongoing.
     */
    @Column(name = "follow_up_status")
    private Boolean followUpStatus = false;

    @Column(name = "follow_up_end_date")
    private LocalDateTime followUpEndDate;

    @Column(name = "follow_up_reminder_24h_sent")
    private Boolean followUpReminder24hSent = false;

    /**
     * Legacy column.
     * Keep this temporarily so old database data does not break.
     * New follow-up meetings are stored in the same row and should not use this field.
     */
    @Column(name = "parent_meeting_id")
    private Integer parentMeetingId;

    @Column(name = "reminder_24h_sent")
    private Boolean reminder24hSent = false;

    @OneToOne(mappedBy = "meeting", fetch = FetchType.LAZY)
    private OneOnOneActionItem actionItem;
}
