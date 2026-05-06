package com.epms.entity;

import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * Why this file is updated:
 * - Added location for normal and follow-up one-on-one meetings.
 * - Follow-up meetings are still normal rows in one_on_one_meetings.
 * - parentMeetingId only connects the follow-up to the original meeting.
 */
@Entity
@Table(name = "one_on_one_meetings")
@Data
public class OneOnOneMeeting {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    /**
     * The selected employee for the meeting.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_id")
    private Employee employee;

    /**
     * The creator/manager/department head employee record.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "manager_id")
    private Employee manager;

    @Column(name = "scheduled_date")
    private LocalDateTime scheduledDate;

    /**
     * New simple text location.
     * Example: ACE 3rd Building, 4th floor
     */
    @Column(name = "location", length = 500)
    private String location;

    @Column(length = 1000)
    private String notes;

    /**
     * false = upcoming
     * true = ongoing/activated
     */
    private Boolean status;

    /**
     * Meeting finished time.
     * null means not finalized yet.
     */
    @Column(name = "is_finalized")
    private LocalDateTime isFinalized;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @Column(name = "follow_up_date")
    private LocalDateTime followUpDate;

    @Column(name = "follow_up_notes", length = 1000)
    private String followUpNotes;

    @Column(name = "parent_meeting_id")
    private Integer parentMeetingId;

    @Column(name = "reminder_24h_sent")
    private Boolean reminder24hSent = false;

    @OneToOne(mappedBy = "meeting", fetch = FetchType.LAZY)
    private OneOnOneActionItem actionItem;
}