package com.epms.service.impl;

import com.epms.dto.ContinuousFeedbackRequestDto;
import com.epms.dto.ContinuousFeedbackResponseDto;
import com.epms.dto.TeamEmployeeOptionResponseDto;
import com.epms.dto.TeamOptionResponseDto;
import com.epms.entity.ContinuousFeedback;
import com.epms.entity.Employee;
import com.epms.entity.Team;
import com.epms.entity.User;
import com.epms.repository.ContinuousFeedbackRepository;
import com.epms.repository.EmployeeRepository;
import com.epms.repository.UserRepository;
import com.epms.security.SecurityUtils;
import com.epms.service.ContinuousFeedbackService;
import com.epms.service.NotificationService;
import com.epms.service.TeamAccessService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ContinuousFeedbackServiceImpl implements ContinuousFeedbackService {

    private final ContinuousFeedbackRepository continuousFeedbackRepository;
    private final UserRepository userRepository;
    private final EmployeeRepository employeeRepository;
    private final TeamAccessService teamAccessService;
    private final NotificationService notificationService;

    @Override
    @Transactional(readOnly = true)
    public List<TeamOptionResponseDto> getMyTeams() {
        return teamAccessService.getManagedTeamOptionsForCurrentUser();
    }

    @Override
    @Transactional(readOnly = true)
    public List<TeamEmployeeOptionResponseDto> getActiveEmployeesByTeam(Integer teamId) {
        return teamAccessService.getActiveEmployeesForManagedTeam(teamId);
    }

    @Override
    @Transactional
    public ContinuousFeedbackResponseDto create(ContinuousFeedbackRequestDto request) {
        validateRequest(request);

        Integer currentUserId = SecurityUtils.currentUserId();

        Team team = teamAccessService.requireManagedTeam(request.getTeamId(), currentUserId);
        Employee employee = teamAccessService.requireActiveEmployeeInManagedTeam(
                request.getTeamId(),
                request.getEmployeeId(),
                currentUserId
        );

        User giver = userRepository.findById(currentUserId)
                .orElseThrow(() -> new RuntimeException("Current user not found."));

        ContinuousFeedback feedback = new ContinuousFeedback();
        feedback.setTeam(team);
        feedback.setEmployee(employee);
        feedback.setGiverUser(giver);
        feedback.setFeedbackText(request.getFeedbackText().trim());
        feedback.setCategory(request.getCategory().trim());
        feedback.setRating(request.getRating());

        ContinuousFeedback saved = continuousFeedbackRepository.save(feedback);

        notifyEmployee(saved);

        return toResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ContinuousFeedbackResponseDto> getMyGivenFeedback() {
        return continuousFeedbackRepository
                .findByGiverUserIdOrderByCreatedAtDesc(SecurityUtils.currentUserId())
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<ContinuousFeedbackResponseDto> getMyReceivedFeedback() {
        Integer employeeId = resolveCurrentEmployeeId();

        if (employeeId == null) {
            return List.of();
        }

        return continuousFeedbackRepository
                .findByEmployeeIdOrderByCreatedAtDesc(employeeId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    private void validateRequest(ContinuousFeedbackRequestDto request) {
        if (request == null) {
            throw new RuntimeException("Feedback request is required.");
        }

        if (request.getTeamId() == null) {
            throw new RuntimeException("Team is required.");
        }

        if (request.getEmployeeId() == null) {
            throw new RuntimeException("Employee is required.");
        }

        if (request.getFeedbackText() == null || request.getFeedbackText().trim().isEmpty()) {
            throw new RuntimeException("Feedback message is required.");
        }

        if (request.getFeedbackText().length() > 3000) {
            throw new RuntimeException("Feedback message cannot exceed 3000 characters.");
        }

        if (request.getCategory() == null || request.getCategory().trim().isEmpty()) {
            throw new RuntimeException("Category is required.");
        }

        if (request.getCategory().length() > 50) {
            throw new RuntimeException("Category cannot exceed 50 characters.");
        }

        if (request.getRating() != null && (request.getRating() < 1 || request.getRating() > 5)) {
            throw new RuntimeException("Rating must be between 1 and 5.");
        }
    }

    private void notifyEmployee(ContinuousFeedback feedback) {
        userRepository.findActiveByEmployeeId(feedback.getEmployee().getId())
                .or(() -> userRepository.findByEmployeeId(feedback.getEmployee().getId()))
                .ifPresent(employeeUser -> notificationService.send(
                        employeeUser.getId(),
                        "New Continuous Feedback",
                        displayUser(feedback.getGiverUser())
                                + " gave you continuous feedback"
                                + (feedback.getTeam() == null ? "." : " for team " + feedback.getTeam().getTeamName() + "."),
                        "FEEDBACK"
                ));
    }

    private Integer resolveCurrentEmployeeId() {
        User currentUser = userRepository.findById(SecurityUtils.currentUserId())
                .orElseThrow(() -> new RuntimeException("Current user not found."));

        if (currentUser.getEmployeeId() != null) {
            return currentUser.getEmployeeId();
        }

        if (currentUser.getEmail() != null && !currentUser.getEmail().isBlank()) {
            return employeeRepository.findByEmail(currentUser.getEmail().trim())
                    .map(Employee::getId)
                    .orElse(null);
        }

        return null;
    }

    private ContinuousFeedbackResponseDto toResponse(ContinuousFeedback feedback) {
        return ContinuousFeedbackResponseDto.builder()
                .id(feedback.getId())
                .teamId(feedback.getTeam() == null ? null : feedback.getTeam().getId())
                .teamName(feedback.getTeam() == null ? null : feedback.getTeam().getTeamName())
                .employeeId(feedback.getEmployee() == null ? null : feedback.getEmployee().getId())
                .employeeName(displayEmployee(feedback.getEmployee()))
                .employeeEmail(feedback.getEmployee() == null ? null : feedback.getEmployee().getEmail())
                .giverUserId(feedback.getGiverUser() == null ? null : feedback.getGiverUser().getId())
                .giverName(displayUser(feedback.getGiverUser()))
                .giverEmail(feedback.getGiverUser() == null ? null : feedback.getGiverUser().getEmail())
                .feedbackText(feedback.getFeedbackText())
                .category(feedback.getCategory())
                .rating(feedback.getRating())
                .createdAt(feedback.getCreatedAt())
                .updatedAt(feedback.getUpdatedAt())
                .build();
    }

    private String displayEmployee(Employee employee) {
        if (employee == null) {
            return null;
        }

        String firstName = employee.getFirstName() == null ? "" : employee.getFirstName().trim();
        String lastName = employee.getLastName() == null ? "" : employee.getLastName().trim();
        String fullName = (firstName + " " + lastName).trim();

        if (!fullName.isEmpty()) {
            return fullName;
        }

        if (employee.getEmail() != null && !employee.getEmail().isBlank()) {
            return employee.getEmail();
        }

        return "Employee #" + employee.getId();
    }

    private String displayUser(User user) {
        if (user == null) {
            return "Someone";
        }

        if (user.getFullName() != null && !user.getFullName().isBlank()) {
            return user.getFullName();
        }

        if (user.getEmail() != null && !user.getEmail().isBlank()) {
            return user.getEmail();
        }

        return "User #" + user.getId();
    }
}