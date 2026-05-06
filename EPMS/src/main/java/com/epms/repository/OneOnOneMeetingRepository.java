package com.epms.repository;

import com.epms.entity.OneOnOneMeeting;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * Why this file is updated:
 * - Follow-up meetings should behave like normal meetings.
 * - A follow-up meeting is only connected by parentMeetingId.
 * - It must not instantly become past/ended just because the parent meeting is finalized.
 */
public interface OneOnOneMeetingRepository extends JpaRepository<OneOnOneMeeting, Integer> {

    @Query("""
        SELECT m
        FROM OneOnOneMeeting m
        WHERE (m.employee.id = :employeeId OR m.manager.id = :employeeId)
          AND m.scheduledDate > :now
          AND m.isFinalized IS NULL
        ORDER BY m.scheduledDate ASC
        """)
    List<OneOnOneMeeting> findUpcomingForUser(
            @Param("employeeId") Integer employeeId,
            @Param("now") LocalDateTime now
    );

    @Query("""
        SELECT m
        FROM OneOnOneMeeting m
        WHERE (m.employee.id = :employeeId OR m.manager.id = :employeeId)
          AND m.status = true
          AND m.isFinalized IS NULL
        ORDER BY m.scheduledDate ASC
        """)
    List<OneOnOneMeeting> findOngoingForUser(@Param("employeeId") Integer employeeId);

    @Query("""
        SELECT m
        FROM OneOnOneMeeting m
        WHERE (m.employee.id = :employeeId OR m.manager.id = :employeeId)
          AND m.isFinalized IS NOT NULL
        ORDER BY m.isFinalized DESC
        """)
    List<OneOnOneMeeting> findPastForUser(@Param("employeeId") Integer employeeId);

    @Query("""
        SELECT m
        FROM OneOnOneMeeting m
        WHERE m.scheduledDate <= :now
          AND m.status = false
          AND m.isFinalized IS NULL
        """)
    List<OneOnOneMeeting> findMeetingsToActivate(@Param("now") LocalDateTime now);

    /**
     * Important fix:
     * - Only auto-close meetings that were already ongoing for 8 hours.
     * - Follow-up meetings are not treated differently.
     * - This prevents follow-up meetings from becoming ended immediately when their time arrives.
     */
    @Query("""
        SELECT m
        FROM OneOnOneMeeting m
        WHERE m.status = true
          AND m.isFinalized IS NULL
          AND m.scheduledDate <= :eightHoursAgo
        """)
    List<OneOnOneMeeting> findOngoingMeetingsToAutoClose(
            @Param("eightHoursAgo") LocalDateTime eightHoursAgo
    );

    @Query("""
        SELECT m
        FROM OneOnOneMeeting m
        WHERE m.scheduledDate BETWEEN :now AND :limit
          AND m.isFinalized IS NULL
          AND (m.reminder24hSent = false OR m.reminder24hSent IS NULL)
        """)
    List<OneOnOneMeeting> findMeetingsForReminder(
            @Param("now") LocalDateTime now,
            @Param("limit") LocalDateTime limit
    );

    @Query("""
        SELECT m
        FROM OneOnOneMeeting m
        WHERE m.parentMeetingId = :parentMeetingId
        ORDER BY m.createdAt DESC
        """)
    Optional<OneOnOneMeeting> findFollowUpByParentMeetingId(
            @Param("parentMeetingId") Integer parentMeetingId
    );
}