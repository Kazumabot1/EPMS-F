package com.epms.repository;

import com.epms.entity.OneOnOneMeeting;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface OneOnOneMeetingRepository extends JpaRepository<OneOnOneMeeting, Integer> {

    @Query("""
        SELECT m FROM OneOnOneMeeting m
        WHERE m.scheduledDate <= :now
        AND m.status = false
        AND m.isFinalized IS NULL
        ORDER BY m.scheduledDate ASC
    """)
    List<OneOnOneMeeting> findMeetingsToActivate(@Param("now") LocalDateTime now);

    @Query("""
        SELECT m FROM OneOnOneMeeting m
        WHERE m.status = true
        AND m.isFinalized IS NULL
        AND m.scheduledDate <= :limit
        ORDER BY m.scheduledDate ASC
    """)
    List<OneOnOneMeeting> findOngoingMeetingsToAutoClose(@Param("limit") LocalDateTime limit);

    @Query("""
        SELECT m FROM OneOnOneMeeting m
        WHERE m.status = false
        AND m.isFinalized IS NULL
        AND m.scheduledDate > :now
        ORDER BY m.scheduledDate ASC
    """)
    List<OneOnOneMeeting> findUpcoming(@Param("now") LocalDateTime now);

    @Query("""
        SELECT m FROM OneOnOneMeeting m
        WHERE m.status = true
        AND m.isFinalized IS NULL
        ORDER BY m.scheduledDate ASC
    """)
    List<OneOnOneMeeting> findOngoing();

    @Query("""
        SELECT m FROM OneOnOneMeeting m
        WHERE m.isFinalized IS NOT NULL
        ORDER BY m.isFinalized DESC
    """)
    List<OneOnOneMeeting> findPast();

    @Query("""
        SELECT m FROM OneOnOneMeeting m
        WHERE m.employee.id = :employeeId
        AND m.status = false
        AND m.isFinalized IS NULL
        AND m.scheduledDate > :now
        ORDER BY m.scheduledDate ASC
    """)
    List<OneOnOneMeeting> findUpcomingByEmployee(
            @Param("employeeId") Integer employeeId,
            @Param("now") LocalDateTime now
    );

    @Query("""
        SELECT m FROM OneOnOneMeeting m
        WHERE (m.manager.id = :employeeId OR m.employee.id = :employeeId)
        AND m.status = false
        AND m.isFinalized IS NULL
        AND m.scheduledDate > :now
        ORDER BY m.scheduledDate ASC
    """)
    List<OneOnOneMeeting> findUpcomingForUser(
            @Param("employeeId") Integer employeeId,
            @Param("now") LocalDateTime now
    );

    @Query("""
        SELECT m FROM OneOnOneMeeting m
        WHERE (m.manager.id = :employeeId OR m.employee.id = :employeeId)
        AND m.status = true
        AND m.isFinalized IS NULL
        ORDER BY m.scheduledDate ASC
    """)
    List<OneOnOneMeeting> findOngoingForUser(@Param("employeeId") Integer employeeId);

    /*
      Past should show only the parent/normal meeting.
      Follow-up child details are attached to the parent DTO.
    */
    @Query("""
        SELECT m FROM OneOnOneMeeting m
        WHERE (m.manager.id = :employeeId OR m.employee.id = :employeeId)
        AND m.parentMeetingId IS NULL
        AND m.isFinalized IS NOT NULL
        ORDER BY m.isFinalized DESC
    """)
    List<OneOnOneMeeting> findPastForUser(@Param("employeeId") Integer employeeId);

    @Query("""
        SELECT m FROM OneOnOneMeeting m
        WHERE m.parentMeetingId = :parentMeetingId
        ORDER BY m.scheduledDate ASC
    """)
    Optional<OneOnOneMeeting> findFollowUpByParentMeetingId(
            @Param("parentMeetingId") Integer parentMeetingId
    );

    @Query("""
        SELECT m FROM OneOnOneMeeting m
        WHERE m.status = false
        AND m.isFinalized IS NULL
        AND m.reminder24hSent = false
        AND m.scheduledDate BETWEEN :now AND :limit
        ORDER BY m.scheduledDate ASC
    """)
    List<OneOnOneMeeting> findMeetingsForReminder(
            @Param("now") LocalDateTime now,
            @Param("limit") LocalDateTime limit
    );
}