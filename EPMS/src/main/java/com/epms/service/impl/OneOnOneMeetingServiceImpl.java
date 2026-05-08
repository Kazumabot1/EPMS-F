/*
package com.epms.service.impl;

import com.epms.dto.FollowUpRequestDto;
import com.epms.dto.OneOnOneActionItemResponseDto;
import com.epms.dto.OneOnOneMeetingRequestDto;
import com.epms.dto.OneOnOneMeetingResponseDto;
import com.epms.entity.Employee;
import com.epms.entity.OneOnOneMeeting;
import com.epms.entity.Role;
import com.epms.entity.User;
import com.epms.entity.UserRole;
import com.epms.repository.EmployeeDepartmentRepository;
import com.epms.repository.EmployeeRepository;
import com.epms.repository.OneOnOneMeetingRepository;
import com.epms.repository.RoleRepository;
import com.epms.repository.UserRepository;
import com.epms.repository.UserRoleRepository;
import com.epms.security.SecurityUtils;
import com.epms.service.NotificationService;
import com.epms.service.OneOnOneMeetingService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.Optional;
import java.util.stream.Collectors;

*/
/**
 * Why this file is updated:
 * - Added location to normal and follow-up meetings.
 * - Fixed follow-up meeting flow so follow-up does not instantly become ended.
 * - Department Head can create 1:1 meetings only with employees in their own working department.
 * - Department Head detection now uses user_roles, because User entity has no dashboard field.
 * - Meeting notifications still go to both creator and selected employee.
 *//*

@Service
@RequiredArgsConstructor
public class OneOnOneMeetingServiceImpl implements OneOnOneMeetingService {

    private final OneOnOneMeetingRepository meetingRepo;
    private final EmployeeRepository employeeRepo;
    private final UserRepository userRepo;
    private final UserRoleRepository userRoleRepository;
    private final RoleRepository roleRepository;
    private final EmployeeDepartmentRepository employeeDepartmentRepository;
    private final NotificationService notificationService;

    private static final DateTimeFormatter FORMATTER =
            DateTimeFormatter.ofPattern("MMM dd, yyyy, hh:mm a");

    @Override
    @Transactional
    public OneOnOneMeetingResponseDto createMeeting(OneOnOneMeetingRequestDto request) {
        User currentUser = getCurrentUser();

        validateCreateRequest(request);

        Employee manager = employeeRepo.findById(currentUser.getEmployeeId())
                .orElseThrow(() -> new RuntimeException("Manager employee record not found."));

        Employee employee = employeeRepo.findById(request.getEmployeeId())
                .orElseThrow(() -> new RuntimeException("Employee not found."));

*/
/*
        validateMeetingScope(currentUser, employee);
*//*


        OneOnOneMeeting meeting = new OneOnOneMeeting();

        meeting.setEmployee(employee);
        meeting.setManager(manager);
        meeting.setScheduledDate(request.getScheduledDate());
        meeting.setLocation(cleanNullable(request.getLocation()));
        meeting.setNotes(cleanNullable(request.getNotes()));
        meeting.setStatus(false);
        meeting.setIsFinalized(null);
        meeting.setCreatedAt(LocalDateTime.now());
        meeting.setUpdatedAt(null);
        meeting.setParentMeetingId(request.getParentMeetingId());
        meeting.setFollowUpNotes(cleanNullable(request.getFollowUpNotes()));
        meeting.setReminder24hSent(false);

        OneOnOneMeeting saved = meetingRepo.save(meeting);

        sendCreationNotifications(saved);

        if (isWithinNext24Hours(saved.getScheduledDate())) {
            sendReminderNotifications(saved);
            saved.setReminder24hSent(true);
            saved = meetingRepo.save(saved);
        }

        return toDto(saved);
    }

    @Override
    @Transactional
    public OneOnOneMeetingResponseDto updateMeeting(Integer id, OneOnOneMeetingRequestDto request) {
        OneOnOneMeeting meeting = meetingRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Meeting not found: " + id));

        if (request.getScheduledDate() == null) {
            throw new RuntimeException("Scheduled date is required.");
        }

        boolean scheduledDateChanged = !Objects.equals(meeting.getScheduledDate(), request.getScheduledDate());

        if (scheduledDateChanged && request.getScheduledDate().isBefore(LocalDateTime.now())) {
            throw new RuntimeException("Cannot update a meeting to a past time.");
        }

        validateTextLimit(request.getNotes(), "Notes");
        validateTextLimit(request.getFollowUpNotes(), "Follow-up notes");
        validateTextLimit(request.getLocation(), "Location");

        meeting.setScheduledDate(request.getScheduledDate());

        if (request.getLocation() != null) {
            meeting.setLocation(cleanNullable(request.getLocation()));
        }

        if (request.getNotes() != null) {
            meeting.setNotes(cleanNullable(request.getNotes()));
        }

        if (request.getFollowUpNotes() != null) {
            meeting.setFollowUpNotes(cleanNullable(request.getFollowUpNotes()));
        }

        meeting.setUpdatedAt(LocalDateTime.now());

        if (scheduledDateChanged) {
            meeting.setReminder24hSent(false);
        }

        OneOnOneMeeting saved = meetingRepo.save(meeting);

        if (scheduledDateChanged) {
            sendUpdatedNotifications(saved);

            if (isWithinNext24Hours(saved.getScheduledDate())) {
                sendReminderNotifications(saved);
                saved.setReminder24hSent(true);
                saved = meetingRepo.save(saved);
            }
        }

        return toDto(saved);
    }

    @Override
    @Transactional
    public void deleteMeeting(Integer id) {
        OneOnOneMeeting meeting = meetingRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Meeting not found: " + id));

        String meetingTime = formatDateTime(meeting.getScheduledDate());

        findUserByEmployee(meeting.getEmployee()).ifPresent(employeeUser ->
                notificationService.send(
                        employeeUser.getId(),
                        "One-on-One Meeting Cancelled",
                        "Your one-on-one meeting at " + meetingTime + " was cancelled.",
                        "MEETING"
                )
        );

        findUserByEmployee(meeting.getManager()).ifPresent(managerUser ->
                notificationService.send(
                        managerUser.getId(),
                        "One-on-One Meeting Cancelled",
                        "The one-on-one meeting with "
                                + employeeName(meeting.getEmployee())
                                + " at " + meetingTime + " was cancelled.",
                        "MEETING"
                )
        );

        meetingRepo.delete(meeting);
    }

    @Override
    public List<OneOnOneMeetingResponseDto> getUpcomingMeetings() {
        User user = getCurrentUser();

        return meetingRepo.findUpcomingForUser(user.getEmployeeId(), LocalDateTime.now())
                .stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Override
    public List<OneOnOneMeetingResponseDto> getOngoingMeetings() {
        User user = getCurrentUser();

        return meetingRepo.findOngoingForUser(user.getEmployeeId())
                .stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Override
    public List<OneOnOneMeetingResponseDto> getPastMeetings() {
        User user = getCurrentUser();

        return meetingRepo.findPastForUser(user.getEmployeeId())
                .stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Override
    public OneOnOneMeetingResponseDto getMeetingById(Integer id) {
        OneOnOneMeeting meeting = meetingRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Meeting not found: " + id));

        return toDto(meeting);
    }

    @Override
    @Transactional
    public OneOnOneMeetingResponseDto finishMeeting(Integer id) {
        OneOnOneMeeting meeting = meetingRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Meeting not found: " + id));

        meeting.setStatus(true);
        meeting.setIsFinalized(LocalDateTime.now());
        meeting.setUpdatedAt(LocalDateTime.now());

        return toDto(meetingRepo.save(meeting));
    }

    @Override
    @Transactional
    public OneOnOneMeetingResponseDto setFollowUp(Integer id, FollowUpRequestDto request) {
        OneOnOneMeeting parentMeeting = meetingRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Meeting not found: " + id));

        if (request.getFollowUpDate() == null) {
            throw new RuntimeException("Follow-up date is required.");
        }

        if (request.getFollowUpDate().isBefore(LocalDateTime.now())) {
            throw new RuntimeException("Cannot create a follow-up meeting for a past time.");
        }

        validateTextLimit(request.getFollowUpNotes(), "Follow-up notes");
        validateTextLimit(request.getLocation(), "Location");

        */
/*
         * This finalizes only the original parent meeting.
         * The new follow-up meeting remains unfinalized.
         *//*

        parentMeeting.setFollowUpDate(request.getFollowUpDate());
        parentMeeting.setIsFinalized(LocalDateTime.now());
        parentMeeting.setUpdatedAt(LocalDateTime.now());

        OneOnOneMeeting followUpMeeting = meetingRepo
                .findFollowUpByParentMeetingId(parentMeeting.getId())
                .orElse(new OneOnOneMeeting());

        if (followUpMeeting.getId() == null) {
            followUpMeeting.setCreatedAt(LocalDateTime.now());
        }

        followUpMeeting.setEmployee(parentMeeting.getEmployee());
        followUpMeeting.setManager(parentMeeting.getManager());
        followUpMeeting.setScheduledDate(request.getFollowUpDate());
        followUpMeeting.setLocation(cleanNullable(request.getLocation()));
        followUpMeeting.setNotes(null);
        followUpMeeting.setFollowUpNotes(cleanNullable(request.getFollowUpNotes()));
        followUpMeeting.setStatus(false);
        followUpMeeting.setIsFinalized(null);
        followUpMeeting.setUpdatedAt(null);
        followUpMeeting.setParentMeetingId(parentMeeting.getId());
        followUpMeeting.setReminder24hSent(false);

        meetingRepo.save(parentMeeting);
        OneOnOneMeeting savedFollowUp = meetingRepo.save(followUpMeeting);

        sendCreationNotifications(savedFollowUp);

        if (isWithinNext24Hours(savedFollowUp.getScheduledDate())) {
            sendReminderNotifications(savedFollowUp);
            savedFollowUp.setReminder24hSent(true);
            meetingRepo.save(savedFollowUp);
        }

        return toDto(parentMeeting);
    }

    @Override
    @Transactional
    public void autoActivateDueMeetings() {
        LocalDateTime now = LocalDateTime.now();

        List<OneOnOneMeeting> due = meetingRepo.findMeetingsToActivate(now);

        for (OneOnOneMeeting meeting : due) {
            meeting.setStatus(true);
            meeting.setUpdatedAt(now);
        }

        meetingRepo.saveAll(due);

        */
/*
         * Only close meetings that have already been ongoing for 8 hours.
         * This prevents follow-up meetings from immediately becoming past/ended.
         *//*

        LocalDateTime eightHoursAgo = now.minusHours(8);

        List<OneOnOneMeeting> oldOngoing = meetingRepo.findOngoingMeetingsToAutoClose(eightHoursAgo);

        for (OneOnOneMeeting meeting : oldOngoing) {
            meeting.setIsFinalized(now);
            meeting.setUpdatedAt(now);
        }

        meetingRepo.saveAll(oldOngoing);
    }

    */
/*
    private void validateMeetingScope(User currentUser, Employee selectedEmployee) {
        if (currentUser == null || selectedEmployee == null) {
            throw new RuntimeException("Invalid meeting participants.");
        }

        *//*
*/
/*
         * Department Head must be limited to employees in their own working department.
         *//*
*/
/*
        if (isDepartmentHead(currentUser)) {
            if (currentUser.getDepartmentId() == null) {
                throw new RuntimeException("Current Department Head has no department assigned.");
            }

            User selectedEmployeeUser = userRepo.findByEmployeeId(selectedEmployee.getId())
                    .orElseThrow(() -> new RuntimeException("Selected employee has no linked user account."));

            boolean belongs = employeeDepartmentRepository.existsActiveUserInWorkingDepartment(
                    selectedEmployeeUser.getId(),
                    currentUser.getDepartmentId()
            );

            if (!belongs) {
                throw new RuntimeException("Department Head can create one-on-one meetings only with employees in their own department.");
            }
        }
    }

    private boolean isDepartmentHead(User user) {
        return hasRole(user, "DepartmentHead")
                || hasRole(user, "DEPARTMENT_HEAD")
                || hasRole(user, "ROLE_DEPARTMENT_HEAD")
                || hasRole(user, "Department Head");
    }

    private boolean hasRole(User user, String roleName) {
        if (user == null || user.getId() == null || roleName == null) {
            return false;
        }

        String expected = normalizeRole(roleName);

        return userRoleRepository.findByUserId(user.getId()).stream()
                .map(UserRole::getRoleId)
                .filter(Objects::nonNull)
                .map(roleRepository::findById)
                .flatMap(Optional::stream)
                .map(Role::getName)
                .filter(Objects::nonNull)
                .map(this::normalizeRole)
                .anyMatch(expected::equals);
    }

    private String normalizeRole(String role) {
        return role.trim()
                .replace("ROLE_", "")
                .replace(" ", "_")
                .replace("-", "_")
                .toUpperCase(Locale.ROOT);
    }*//*


    private void sendCreationNotifications(OneOnOneMeeting meeting) {
        String meetingTime = formatDateTime(meeting.getScheduledDate());
        String managerName = employeeName(meeting.getManager());
        String employeeName = employeeName(meeting.getEmployee());

        findUserByEmployee(meeting.getEmployee()).ifPresent(employeeUser ->
                notificationService.send(
                        employeeUser.getId(),
                        "New One-on-One Meeting",
                        managerName + " scheduled a one-on-one meeting with you at "
                                + meetingTime
                                + buildLocationPreview(meeting.getLocation())
                                + buildNotesPreview(meeting.getNotes()),
                        "MEETING"
                )
        );

        findUserByEmployee(meeting.getManager()).ifPresent(managerUser ->
                notificationService.send(
                        managerUser.getId(),
                        "One-on-One Meeting Created",
                        "You scheduled a one-on-one meeting with "
                                + employeeName
                                + " at " + meetingTime
                                + buildLocationPreview(meeting.getLocation())
                                + buildNotesPreview(meeting.getNotes()),
                        "MEETING"
                )
        );
    }

    private void sendUpdatedNotifications(OneOnOneMeeting meeting) {
        String meetingTime = formatDateTime(meeting.getScheduledDate());
        String managerName = employeeName(meeting.getManager());
        String employeeName = employeeName(meeting.getEmployee());

        findUserByEmployee(meeting.getEmployee()).ifPresent(employeeUser ->
                notificationService.send(
                        employeeUser.getId(),
                        "One-on-One Meeting Updated",
                        "Your one-on-one meeting with " + managerName
                                + " was updated to " + meetingTime
                                + buildLocationPreview(meeting.getLocation())
                                + buildNotesPreview(meeting.getNotes()),
                        "MEETING"
                )
        );

        findUserByEmployee(meeting.getManager()).ifPresent(managerUser ->
                notificationService.send(
                        managerUser.getId(),
                        "One-on-One Meeting Updated",
                        "Your one-on-one meeting with " + employeeName
                                + " was updated to " + meetingTime
                                + buildLocationPreview(meeting.getLocation())
                                + buildNotesPreview(meeting.getNotes()),
                        "MEETING"
                )
        );
    }

    private void sendReminderNotifications(OneOnOneMeeting meeting) {
        String meetingTime = formatDateTime(meeting.getScheduledDate());

        findUserByEmployee(meeting.getEmployee()).ifPresent(employeeUser ->
                notificationService.send(
                        employeeUser.getId(),
                        "Meeting Reminder",
                        "Reminder: your one-on-one meeting with "
                                + employeeName(meeting.getManager())
                                + " will start at " + meetingTime
                                + buildLocationPreview(meeting.getLocation())
                                + ".",
                        "MEETING"
                )
        );

        findUserByEmployee(meeting.getManager()).ifPresent(managerUser ->
                notificationService.send(
                        managerUser.getId(),
                        "Meeting Reminder",
                        "Reminder: your one-on-one meeting with "
                                + employeeName(meeting.getEmployee())
                                + " will start at " + meetingTime
                                + buildLocationPreview(meeting.getLocation())
                                + ".",
                        "MEETING"
                )
        );
    }

    private Optional<User> findUserByEmployee(Employee employee) {
        if (employee == null) {
            return Optional.empty();
        }

        if (employee.getId() != null) {
            Optional<User> byEmployeeId = userRepo.findActiveByEmployeeId(employee.getId())
                    .or(() -> userRepo.findByEmployeeId(employee.getId()));

            if (byEmployeeId.isPresent()) {
                return byEmployeeId;
            }
        }

        if (employee.getEmail() != null && !employee.getEmail().trim().isEmpty()) {
            return userRepo.findActiveByEmail(employee.getEmail().trim())
                    .or(() -> userRepo.findByEmail(employee.getEmail().trim()));
        }

        return Optional.empty();
    }

    private boolean isWithinNext24Hours(LocalDateTime scheduledDate) {
        if (scheduledDate == null) {
            return false;
        }

        LocalDateTime now = LocalDateTime.now();
        return !scheduledDate.isBefore(now) && !scheduledDate.isAfter(now.plusHours(24));
    }

    private void validateCreateRequest(OneOnOneMeetingRequestDto request) {
        if (request.getEmployeeId() == null) {
            throw new RuntimeException("Employee is required.");
        }

        if (request.getScheduledDate() == null) {
            throw new RuntimeException("Scheduled date is required.");
        }

        if (request.getScheduledDate().isBefore(LocalDateTime.now())) {
            throw new RuntimeException("Cannot create a meeting for a past time.");
        }

        validateTextLimit(request.getNotes(), "Notes");
        validateTextLimit(request.getFollowUpNotes(), "Follow-up notes");
        validateTextLimit(request.getLocation(), "Location");
    }

    private void validateTextLimit(String value, String fieldName) {
        if (value != null && value.length() > 1000) {
            throw new RuntimeException(fieldName + " cannot exceed 1000 characters.");
        }
    }

    private User getCurrentUser() {
        Integer currentUserId = SecurityUtils.currentUserId();

        User user = userRepo.findById(currentUserId)
                .orElseThrow(() -> new RuntimeException("Current user not found."));

        if (user.getEmployeeId() == null) {
            throw new RuntimeException("Current logged-in user is not linked to an employee record.");
        }

        return user;
    }

    private OneOnOneMeetingResponseDto toDto(OneOnOneMeeting m) {
        OneOnOneMeetingResponseDto dto = new OneOnOneMeetingResponseDto();

        dto.setId(m.getId());

        if (m.getEmployee() != null) {
            dto.setEmployeeId(m.getEmployee().getId());
            dto.setEmployeeFirstName(m.getEmployee().getFirstName());
            dto.setEmployeeLastName(m.getEmployee().getLastName());
        }

        if (m.getManager() != null) {
            dto.setManagerId(m.getManager().getId());
            dto.setManagerFirstName(m.getManager().getFirstName());
            dto.setManagerLastName(m.getManager().getLastName());
        }

        dto.setScheduledDate(m.getScheduledDate());
        dto.setLocation(m.getLocation());
        dto.setNotes(m.getNotes());
        dto.setFollowUpNotes(m.getFollowUpNotes());
        dto.setStatus(m.getStatus());
        dto.setFollowUpDate(m.getFollowUpDate());
        dto.setIsFinalized(m.getIsFinalized());
        dto.setCreatedAt(m.getCreatedAt());
        dto.setUpdatedAt(m.getUpdatedAt());
        dto.setParentMeetingId(m.getParentMeetingId());
        dto.setFollowUp(m.getParentMeetingId() != null);

        if (m.getActionItem() != null) {
            dto.setActionItem(toActionItemDto(m.getActionItem()));
        }

        if (m.getParentMeetingId() == null) {
            meetingRepo.findFollowUpByParentMeetingId(m.getId()).ifPresent(followUp -> {
                dto.setFollowUpMeetingId(followUp.getId());
                dto.setFollowUpStartDate(followUp.getScheduledDate());
                dto.setFollowUpEndDate(followUp.getIsFinalized());
                dto.setFollowUpMeetingNotes(followUp.getFollowUpNotes());
                dto.setFollowUpLocation(followUp.getLocation());
            });
        }

        return dto;
    }

    private OneOnOneActionItemResponseDto toActionItemDto(com.epms.entity.OneOnOneActionItem item) {
        OneOnOneActionItemResponseDto dto = new OneOnOneActionItemResponseDto();

        dto.setId(item.getId());
        dto.setMeetingId(item.getMeeting() != null ? item.getMeeting().getId() : null);
        dto.setDescription(item.getDescription());
        dto.setCreatedAt(item.getCreatedAt());
        dto.setUpdatedAt(item.getUpdatedAt());
        dto.setDueDate(item.getDueDate());
        dto.setOwner(item.getOwner());
        dto.setStatus(item.getStatus());

        return dto;
    }

    private String employeeName(Employee employee) {
        if (employee == null) {
            return "Unknown";
        }

        String firstName = employee.getFirstName() == null ? "" : employee.getFirstName().trim();
        String lastName = employee.getLastName() == null ? "" : employee.getLastName().trim();
        String fullName = (firstName + " " + lastName).trim();

        if (!fullName.isEmpty()) {
            return fullName;
        }

        if (employee.getEmail() != null && !employee.getEmail().trim().isEmpty()) {
            return employee.getEmail().trim();
        }

        return "Employee #" + employee.getId();
    }

    private String formatDateTime(LocalDateTime dateTime) {
        if (dateTime == null) {
            return "";
        }

        return dateTime.format(FORMATTER);
    }

    private String buildNotesPreview(String notes) {
        if (notes == null || notes.trim().isEmpty()) {
            return "";
        }

        String clean = notes.trim();

        if (clean.length() <= 25) {
            return ". Notes: " + clean;
        }

        return ". Notes: " + clean.substring(0, 25) + "... see more";
    }

    private String buildLocationPreview(String location) {
        if (location == null || location.trim().isEmpty()) {
            return "";
        }

        return " at " + location.trim();
    }

    private String cleanNullable(String value) {
        if (value == null || value.trim().isEmpty()) {
            return null;
        }

        return value.trim();
    }
}*/









package com.epms.service.impl;

import com.epms.dto.FollowUpRequestDto;
import com.epms.dto.OneOnOneActionItemResponseDto;
import com.epms.dto.OneOnOneMeetingRequestDto;
import com.epms.dto.OneOnOneMeetingResponseDto;
import com.epms.entity.Employee;
import com.epms.entity.OneOnOneMeeting;
import com.epms.entity.User;
import com.epms.repository.EmployeeRepository;
import com.epms.repository.OneOnOneMeetingRepository;
import com.epms.repository.UserRepository;
import com.epms.security.SecurityUtils;
import com.epms.service.NotificationService;
import com.epms.service.OneOnOneMeetingService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class OneOnOneMeetingServiceImpl implements OneOnOneMeetingService {

    private final OneOnOneMeetingRepository meetingRepo;
    private final EmployeeRepository employeeRepo;
    private final UserRepository userRepo;
    private final NotificationService notificationService;

    private static final DateTimeFormatter FORMATTER =
            DateTimeFormatter.ofPattern("MMM dd, yyyy, hh:mm a");

    @Override
    @Transactional
    public OneOnOneMeetingResponseDto createMeeting(OneOnOneMeetingRequestDto request) {
        User currentUser = getCurrentUser();

        validateCreateRequest(request);

        Employee manager = employeeRepo.findById(currentUser.getEmployeeId())
                .orElseThrow(() -> new RuntimeException("Manager employee record not found."));

        Employee employee = employeeRepo.findById(request.getEmployeeId())
                .orElseThrow(() -> new RuntimeException("Employee not found."));

        OneOnOneMeeting meeting = new OneOnOneMeeting();
        meeting.setEmployee(employee);
        meeting.setManager(manager);
        meeting.setScheduledDate(request.getScheduledDate());
        meeting.setLocation(cleanNullable(request.getLocation()));
        meeting.setNotes(cleanNullable(request.getNotes()));
        meeting.setStatus(false);
        meeting.setFirstMeetingEndDate(null);
        meeting.setFollowUpDate(null);
        meeting.setFollowUpGoal(null);
        meeting.setFollowUpNotes(null);
        meeting.setFollowUpLocation(null);
        meeting.setFollowUpStatus(false);
        meeting.setFollowUpEndDate(null);
        meeting.setIsFinalized(null);
        meeting.setCreatedAt(LocalDateTime.now());
        meeting.setUpdatedAt(null);
        meeting.setParentMeetingId(null);
        meeting.setReminder24hSent(false);
        meeting.setFollowUpReminder24hSent(false);

        OneOnOneMeeting saved = meetingRepo.save(meeting);

        sendCreationNotifications(saved, false);

        if (isWithinNext24Hours(saved.getScheduledDate())) {
            sendReminderNotifications(saved, false);
            saved.setReminder24hSent(true);
            saved = meetingRepo.save(saved);
        }

        return toDto(saved);
    }

    @Override
    @Transactional
    public OneOnOneMeetingResponseDto updateMeeting(Integer id, OneOnOneMeetingRequestDto request) {
        OneOnOneMeeting meeting = meetingRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Meeting not found: " + id));

        if (request.getScheduledDate() == null) {
            throw new RuntimeException("Scheduled date is required.");
        }

        boolean scheduledDateChanged = !Objects.equals(meeting.getScheduledDate(), request.getScheduledDate());

        if (scheduledDateChanged && request.getScheduledDate().isBefore(LocalDateTime.now())) {
            throw new RuntimeException("Cannot update a meeting to a past time.");
        }

        validateTextLimit(request.getNotes(), "Notes", 1000);
        validateTextLimit(request.getFollowUpNotes(), "Follow-up notes", 1000);
        validateTextLimit(request.getLocation(), "Location", 500);

        meeting.setScheduledDate(request.getScheduledDate());

        if (request.getLocation() != null) {
            meeting.setLocation(cleanNullable(request.getLocation()));
        }

        if (request.getNotes() != null) {
            meeting.setNotes(cleanNullable(request.getNotes()));
        }

        if (request.getFollowUpNotes() != null) {
            meeting.setFollowUpNotes(cleanNullable(request.getFollowUpNotes()));
        }

        meeting.setUpdatedAt(LocalDateTime.now());

        if (scheduledDateChanged) {
            meeting.setReminder24hSent(false);
        }

        OneOnOneMeeting saved = meetingRepo.save(meeting);

        if (scheduledDateChanged) {
            sendUpdatedNotifications(saved, false);

            if (isWithinNext24Hours(saved.getScheduledDate())) {
                sendReminderNotifications(saved, false);
                saved.setReminder24hSent(true);
                saved = meetingRepo.save(saved);
            }
        }

        return toDto(saved);
    }

    @Override
    @Transactional
    public void deleteMeeting(Integer id) {
        OneOnOneMeeting meeting = meetingRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Meeting not found: " + id));

        String meetingTime = formatDateTime(stageStartDate(meeting));

        findUserByEmployee(meeting.getEmployee()).ifPresent(employeeUser ->
                notificationService.send(
                        employeeUser.getId(),
                        "One-on-One Meeting Cancelled",
                        "Your one-on-one meeting at " + meetingTime + " was cancelled.",
                        "MEETING"
                )
        );

        findUserByEmployee(meeting.getManager()).ifPresent(managerUser ->
                notificationService.send(
                        managerUser.getId(),
                        "One-on-One Meeting Cancelled",
                        "The one-on-one meeting with "
                                + employeeName(meeting.getEmployee())
                                + " at " + meetingTime + " was cancelled.",
                        "MEETING"
                )
        );

        meetingRepo.delete(meeting);
    }

    @Override
    public List<OneOnOneMeetingResponseDto> getUpcomingMeetings() {
        User user = getCurrentUser();

        return meetingRepo.findUpcomingForUser(user.getEmployeeId(), LocalDateTime.now())
                .stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Override
    public List<OneOnOneMeetingResponseDto> getOngoingMeetings() {
        User user = getCurrentUser();

        return meetingRepo.findOngoingForUser(user.getEmployeeId())
                .stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Override
    public List<OneOnOneMeetingResponseDto> getPastMeetings() {
        User user = getCurrentUser();

        return meetingRepo.findPastForUser(user.getEmployeeId())
                .stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Override
    public OneOnOneMeetingResponseDto getMeetingById(Integer id) {
        OneOnOneMeeting meeting = meetingRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Meeting not found: " + id));

        return toDto(meeting);
    }

    @Override
    @Transactional
    public OneOnOneMeetingResponseDto finishMeeting(Integer id) {
        OneOnOneMeeting meeting = meetingRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Meeting not found: " + id));

        LocalDateTime now = LocalDateTime.now();

        if (isInFollowUpStage(meeting)) {
            meeting.setFollowUpStatus(true);
            meeting.setFollowUpEndDate(now);
            meeting.setIsFinalized(now);
        } else {
            meeting.setStatus(true);
            meeting.setFirstMeetingEndDate(now);
            meeting.setIsFinalized(now);
        }

        meeting.setUpdatedAt(now);

        return toDto(meetingRepo.save(meeting));
    }

    @Override
    @Transactional
    public OneOnOneMeetingResponseDto setFollowUp(Integer id, FollowUpRequestDto request) {
        OneOnOneMeeting meeting = meetingRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Meeting not found: " + id));

        if (request.getFollowUpDate() == null) {
            throw new RuntimeException("Follow-up date is required.");
        }

        if (request.getFollowUpDate().isBefore(LocalDateTime.now())) {
            throw new RuntimeException("Cannot create a follow-up meeting for a past time.");
        }

        validateTextLimit(request.getFollowUpGoal(), "Follow-up goal", 1000);
        validateTextLimit(request.getFollowUpNotes(), "Follow-up notes", 1000);
        validateTextLimit(request.getLocation(), "Follow-up location", 500);

        LocalDateTime now = LocalDateTime.now();

        meeting.setFirstMeetingEndDate(now);
        meeting.setStatus(false);
        meeting.setFollowUpDate(request.getFollowUpDate());
        meeting.setFollowUpGoal(cleanNullable(request.getFollowUpGoal()));
        meeting.setFollowUpLocation(cleanNullable(request.getLocation()));

        if (request.getFollowUpNotes() != null) {
            meeting.setFollowUpNotes(cleanNullable(request.getFollowUpNotes()));
        }

        meeting.setFollowUpStatus(false);
        meeting.setFollowUpEndDate(null);
        meeting.setFollowUpReminder24hSent(false);
        meeting.setIsFinalized(null);
        meeting.setUpdatedAt(now);
        meeting.setParentMeetingId(null);

        OneOnOneMeeting saved = meetingRepo.save(meeting);

        sendCreationNotifications(saved, true);

        if (isWithinNext24Hours(saved.getFollowUpDate())) {
            sendReminderNotifications(saved, true);
            saved.setFollowUpReminder24hSent(true);
            saved = meetingRepo.save(saved);
        }

        return toDto(saved);
    }

    @Override
    @Transactional
    public void autoActivateDueMeetings() {
        LocalDateTime now = LocalDateTime.now();

        List<OneOnOneMeeting> firstMeetings = meetingRepo.findFirstMeetingsToActivate(now);

        for (OneOnOneMeeting meeting : firstMeetings) {
            meeting.setStatus(true);
            meeting.setUpdatedAt(now);
        }

        meetingRepo.saveAll(firstMeetings);

        List<OneOnOneMeeting> followUpMeetings = meetingRepo.findFollowUpMeetingsToActivate(now);

        for (OneOnOneMeeting meeting : followUpMeetings) {
            meeting.setFollowUpStatus(true);
            meeting.setUpdatedAt(now);
        }

        meetingRepo.saveAll(followUpMeetings);

        LocalDateTime eightHoursAgo = now.minusHours(8);

        List<OneOnOneMeeting> oldFirstMeetings = meetingRepo.findFirstOngoingMeetingsToAutoClose(eightHoursAgo);

        for (OneOnOneMeeting meeting : oldFirstMeetings) {
            meeting.setFirstMeetingEndDate(now);
            meeting.setIsFinalized(now);
            meeting.setUpdatedAt(now);
        }

        meetingRepo.saveAll(oldFirstMeetings);

        List<OneOnOneMeeting> oldFollowUpMeetings = meetingRepo.findFollowUpOngoingMeetingsToAutoClose(eightHoursAgo);

        for (OneOnOneMeeting meeting : oldFollowUpMeetings) {
            meeting.setFollowUpEndDate(now);
            meeting.setIsFinalized(now);
            meeting.setUpdatedAt(now);
        }

        meetingRepo.saveAll(oldFollowUpMeetings);
    }

    private void sendCreationNotifications(OneOnOneMeeting meeting, boolean followUpStage) {
        LocalDateTime startDate = followUpStage ? meeting.getFollowUpDate() : meeting.getScheduledDate();
        String meetingTime = formatDateTime(startDate);
        String location = followUpStage ? meeting.getFollowUpLocation() : meeting.getLocation();
        String notes = followUpStage ? meeting.getFollowUpGoal() : meeting.getNotes();
        String managerName = employeeName(meeting.getManager());
        String employeeName = employeeName(meeting.getEmployee());
        String title = followUpStage ? "New One-on-One Follow-Up Meeting" : "New One-on-One Meeting";
        String managerTitle = followUpStage ? "One-on-One Follow-Up Created" : "One-on-One Meeting Created";

        findUserByEmployee(meeting.getEmployee()).ifPresent(employeeUser ->
                notificationService.send(
                        employeeUser.getId(),
                        title,
                        managerName + " scheduled a one-on-one "
                                + (followUpStage ? "follow-up " : "")
                                + "meeting with you at "
                                + meetingTime
                                + buildLocationPreview(location)
                                + buildNotesPreview(notes),
                        "MEETING"
                )
        );

        findUserByEmployee(meeting.getManager()).ifPresent(managerUser ->
                notificationService.send(
                        managerUser.getId(),
                        managerTitle,
                        "You scheduled a one-on-one "
                                + (followUpStage ? "follow-up " : "")
                                + "meeting with "
                                + employeeName
                                + " at " + meetingTime
                                + buildLocationPreview(location)
                                + buildNotesPreview(notes),
                        "MEETING"
                )
        );
    }

    private void sendUpdatedNotifications(OneOnOneMeeting meeting, boolean followUpStage) {
        LocalDateTime startDate = followUpStage ? meeting.getFollowUpDate() : meeting.getScheduledDate();
        String meetingTime = formatDateTime(startDate);
        String location = followUpStage ? meeting.getFollowUpLocation() : meeting.getLocation();
        String notes = followUpStage ? meeting.getFollowUpGoal() : meeting.getNotes();
        String managerName = employeeName(meeting.getManager());
        String employeeName = employeeName(meeting.getEmployee());

        findUserByEmployee(meeting.getEmployee()).ifPresent(employeeUser ->
                notificationService.send(
                        employeeUser.getId(),
                        "One-on-One Meeting Updated",
                        "Your one-on-one meeting with " + managerName
                                + " was updated to " + meetingTime
                                + buildLocationPreview(location)
                                + buildNotesPreview(notes),
                        "MEETING"
                )
        );

        findUserByEmployee(meeting.getManager()).ifPresent(managerUser ->
                notificationService.send(
                        managerUser.getId(),
                        "One-on-One Meeting Updated",
                        "Your one-on-one meeting with " + employeeName
                                + " was updated to " + meetingTime
                                + buildLocationPreview(location)
                                + buildNotesPreview(notes),
                        "MEETING"
                )
        );
    }

    private void sendReminderNotifications(OneOnOneMeeting meeting, boolean followUpStage) {
        LocalDateTime startDate = followUpStage ? meeting.getFollowUpDate() : meeting.getScheduledDate();
        String meetingTime = formatDateTime(startDate);
        String location = followUpStage ? meeting.getFollowUpLocation() : meeting.getLocation();
        String label = followUpStage ? "follow-up meeting" : "meeting";

        findUserByEmployee(meeting.getEmployee()).ifPresent(employeeUser ->
                notificationService.send(
                        employeeUser.getId(),
                        "Meeting Reminder",
                        "Reminder: your one-on-one "
                                + label
                                + " with "
                                + employeeName(meeting.getManager())
                                + " will start at " + meetingTime
                                + buildLocationPreview(location)
                                + ".",
                        "MEETING"
                )
        );

        findUserByEmployee(meeting.getManager()).ifPresent(managerUser ->
                notificationService.send(
                        managerUser.getId(),
                        "Meeting Reminder",
                        "Reminder: your one-on-one "
                                + label
                                + " with "
                                + employeeName(meeting.getEmployee())
                                + " will start at " + meetingTime
                                + buildLocationPreview(location)
                                + ".",
                        "MEETING"
                )
        );
    }

    private Optional<User> findUserByEmployee(Employee employee) {
        if (employee == null) {
            return Optional.empty();
        }

        if (employee.getId() != null) {
            Optional<User> byEmployeeId = userRepo.findActiveByEmployeeId(employee.getId())
                    .or(() -> userRepo.findByEmployeeId(employee.getId()));

            if (byEmployeeId.isPresent()) {
                return byEmployeeId;
            }
        }

        if (employee.getEmail() != null && !employee.getEmail().trim().isEmpty()) {
            return userRepo.findActiveByEmail(employee.getEmail().trim())
                    .or(() -> userRepo.findByEmail(employee.getEmail().trim()));
        }

        return Optional.empty();
    }

    private boolean isWithinNext24Hours(LocalDateTime scheduledDate) {
        if (scheduledDate == null) {
            return false;
        }

        LocalDateTime now = LocalDateTime.now();
        return !scheduledDate.isBefore(now) && !scheduledDate.isAfter(now.plusHours(24));
    }

    private void validateCreateRequest(OneOnOneMeetingRequestDto request) {
        if (request.getEmployeeId() == null) {
            throw new RuntimeException("Employee is required.");
        }

        if (request.getScheduledDate() == null) {
            throw new RuntimeException("Scheduled date is required.");
        }

        if (request.getScheduledDate().isBefore(LocalDateTime.now())) {
            throw new RuntimeException("Cannot create a meeting for a past time.");
        }

        validateTextLimit(request.getNotes(), "Notes", 1000);
        validateTextLimit(request.getLocation(), "Location", 500);
    }

    private void validateTextLimit(String value, String fieldName, int maxLength) {
        if (value != null && value.length() > maxLength) {
            throw new RuntimeException(fieldName + " cannot exceed " + maxLength + " characters.");
        }
    }

    private User getCurrentUser() {
        Integer currentUserId = SecurityUtils.currentUserId();

        User user = userRepo.findById(currentUserId)
                .orElseThrow(() -> new RuntimeException("Current user not found."));

        if (user.getEmployeeId() == null) {
            throw new RuntimeException("Current logged-in user is not linked to an employee record.");
        }

        return user;
    }

    private OneOnOneMeetingResponseDto toDto(OneOnOneMeeting m) {
        OneOnOneMeetingResponseDto dto = new OneOnOneMeetingResponseDto();

        dto.setId(m.getId());

        if (m.getEmployee() != null) {
            dto.setEmployeeId(m.getEmployee().getId());
            dto.setEmployeeFirstName(m.getEmployee().getFirstName());
            dto.setEmployeeLastName(m.getEmployee().getLastName());
        }

        if (m.getManager() != null) {
            dto.setManagerId(m.getManager().getId());
            dto.setManagerFirstName(m.getManager().getFirstName());
            dto.setManagerLastName(m.getManager().getLastName());
        }

        dto.setScheduledDate(m.getScheduledDate());
        dto.setLocation(m.getLocation());
        dto.setNotes(m.getNotes());
        dto.setStatus(m.getStatus());
        dto.setFirstMeetingEndDate(m.getFirstMeetingEndDate());

        dto.setFollowUpDate(m.getFollowUpDate());
        dto.setFollowUpGoal(m.getFollowUpGoal());
        dto.setFollowUpNotes(m.getFollowUpNotes());
        dto.setFollowUpLocation(m.getFollowUpLocation());
        dto.setFollowUpStatus(m.getFollowUpStatus());
        dto.setFollowUpEndDate(m.getFollowUpEndDate());
        dto.setFollowUpReminder24hSent(m.getFollowUpReminder24hSent());

        dto.setIsFinalized(m.getIsFinalized());
        dto.setCreatedAt(m.getCreatedAt());
        dto.setUpdatedAt(m.getUpdatedAt());
        dto.setParentMeetingId(m.getParentMeetingId());

        boolean followUpStage = m.getFirstMeetingEndDate() != null
                && m.getFollowUpDate() != null
                && m.getIsFinalized() == null;
        dto.setFollowUp(followUpStage);

        dto.setFollowUpMeetingId(m.getFollowUpDate() != null ? m.getId() : null);
        dto.setFollowUpStartDate(m.getFollowUpDate());
        dto.setFollowUpMeetingNotes(m.getFollowUpNotes());

        if (m.getActionItem() != null) {
            dto.setActionItem(toActionItemDto(m.getActionItem()));
        }

        return dto;
    }

    private OneOnOneActionItemResponseDto toActionItemDto(com.epms.entity.OneOnOneActionItem item) {
        OneOnOneActionItemResponseDto dto = new OneOnOneActionItemResponseDto();

        dto.setId(item.getId());
        dto.setMeetingId(item.getMeeting() != null ? item.getMeeting().getId() : null);
        dto.setDescription(item.getDescription());
        dto.setCreatedAt(item.getCreatedAt());
        dto.setUpdatedAt(item.getUpdatedAt());
        dto.setDueDate(item.getDueDate());
        dto.setOwner(item.getOwner());
        dto.setStatus(item.getStatus());

        return dto;
    }

    private boolean isInFollowUpStage(OneOnOneMeeting meeting) {
        return meeting.getFirstMeetingEndDate() != null && meeting.getFollowUpDate() != null;
    }

    private LocalDateTime stageStartDate(OneOnOneMeeting meeting) {
        if (isInFollowUpStage(meeting) && meeting.getFollowUpDate() != null) {
            return meeting.getFollowUpDate();
        }
        return meeting.getScheduledDate();
    }

    private String employeeName(Employee employee) {
        if (employee == null) {
            return "Unknown";
        }

        String firstName = employee.getFirstName() == null ? "" : employee.getFirstName().trim();
        String lastName = employee.getLastName() == null ? "" : employee.getLastName().trim();
        String fullName = (firstName + " " + lastName).trim();

        if (!fullName.isEmpty()) {
            return fullName;
        }

        if (employee.getEmail() != null && !employee.getEmail().trim().isEmpty()) {
            return employee.getEmail().trim();
        }

        return "Employee #" + employee.getId();
    }

    private String formatDateTime(LocalDateTime dateTime) {
        if (dateTime == null) {
            return "";
        }

        return dateTime.format(FORMATTER);
    }

    private String buildNotesPreview(String notes) {
        if (notes == null || notes.trim().isEmpty()) {
            return "";
        }

        String clean = notes.trim();

        if (clean.length() <= 25) {
            return ". Notes: " + clean;
        }

        return ". Notes: " + clean.substring(0, 25) + "... see more";
    }

    private String buildLocationPreview(String location) {
        if (location == null || location.trim().isEmpty()) {
            return "";
        }

        return " at " + location.trim();
    }

    private String cleanNullable(String value) {
        if (value == null || value.trim().isEmpty()) {
            return null;
        }

        return value.trim();
    }
}