package com.epms.service;

import com.epms.dto.OneOnOneAccessContextResponseDto;
import com.epms.dto.OneOnOneMeetingRequestDto;
import com.epms.dto.TeamEmployeeOptionResponseDto;
import com.epms.dto.TeamOptionResponseDto;
import com.epms.entity.Department;
import com.epms.entity.Employee;
import com.epms.entity.Team;
import com.epms.entity.TeamMember;
import com.epms.entity.User;
import com.epms.exception.UnauthorizedActionException;
import com.epms.repository.DepartmentRepository;
import com.epms.repository.EmployeeRepository;
import com.epms.repository.TeamRepository;
import com.epms.repository.UserRepository;
import com.epms.security.SecurityUtils;
import com.epms.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@Service
@RequiredArgsConstructor
public class TeamAccessService {

    private final TeamRepository teamRepository;
    private final EmployeeRepository employeeRepository;
    private final UserRepository userRepository;
    private final DepartmentRepository departmentRepository;

    @Transactional(readOnly = true)
    public OneOnOneAccessContextResponseDto getOneOnOneContext() {
        UserPrincipal current = SecurityUtils.currentUser();

        if (isHr(current)) {
            return OneOnOneAccessContextResponseDto.builder()
                    .accessMode("HR")
                    .canSelectDepartment(true)
                    .canSelectTeam(false)
                    .build();
        }

        if (isDepartmentHead(current)) {
            Department department = current.getDepartmentId() == null
                    ? null
                    : departmentRepository.findById(current.getDepartmentId()).orElse(null);

            return OneOnOneAccessContextResponseDto.builder()
                    .accessMode("DEPARTMENT_HEAD")
                    .departmentId(current.getDepartmentId())
                    .departmentName(department == null ? null : department.getDepartmentName())
                    .canSelectDepartment(false)
                    .canSelectTeam(false)
                    .build();
        }

        if (!getManagedTeams(SecurityUtils.currentUserId()).isEmpty()) {
            return OneOnOneAccessContextResponseDto.builder()
                    .accessMode("TEAM_MANAGER")
                    .canSelectDepartment(false)
                    .canSelectTeam(true)
                    .build();
        }

        return OneOnOneAccessContextResponseDto.builder()
                .accessMode("EMPLOYEE")
                .canSelectDepartment(false)
                .canSelectTeam(false)
                .build();
    }

    @Transactional(readOnly = true)
    public List<TeamOptionResponseDto> getManagedTeamOptionsForCurrentUser() {
        return getManagedTeams(SecurityUtils.currentUserId()).stream()
                .map(this::toTeamOption)
                .sorted(Comparator.comparing(TeamOptionResponseDto::getTeamName, String.CASE_INSENSITIVE_ORDER))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<TeamEmployeeOptionResponseDto> getActiveEmployeesForManagedTeam(Integer teamId) {
        Team team = requireManagedTeam(teamId, SecurityUtils.currentUserId());
        return getActiveEmployeeOptions(team);
    }

    @Transactional(readOnly = true)
    public void validateOneOnOneCreateRequest(OneOnOneMeetingRequestDto request) {
        if (request == null || request.getEmployeeId() == null) {
            throw new RuntimeException("Employee is required.");
        }

        UserPrincipal current = SecurityUtils.currentUser();

        if (request.getTeamId() != null) {
            requireActiveEmployeeInManagedTeam(
                    request.getTeamId(),
                    request.getEmployeeId(),
                    SecurityUtils.currentUserId()
            );
            return;
        }

        if (isHr(current)) {
            Employee employee = employeeRepository.findById(request.getEmployeeId())
                    .orElseThrow(() -> new RuntimeException("Employee not found."));

            if (!isActiveEmployee(employee)) {
                throw new RuntimeException("Only active employees can be selected.");
            }

            return;
        }

        if (isDepartmentHead(current)) {
            if (current.getDepartmentId() == null) {
                throw new RuntimeException("Department Head account has no department assigned.");
            }

            boolean exists = employeeRepository
                    .findActiveDropdownEmployeesByDepartmentId(current.getDepartmentId())
                    .stream()
                    .anyMatch(employee -> Objects.equals(employee.getId(), request.getEmployeeId()));

            if (!exists) {
                throw new UnauthorizedActionException("Department Head can create one-on-one meetings only with active employees from their department.");
            }

            return;
        }

        if (!getManagedTeams(SecurityUtils.currentUserId()).isEmpty()) {
            throw new RuntimeException("Please select a team before selecting an employee.");
        }

        throw new UnauthorizedActionException("You are not allowed to create one-on-one meetings.");
    }

    @Transactional(readOnly = true)
    public Team requireManagedTeam(Integer teamId, Integer currentUserId) {
        if (teamId == null) {
            throw new RuntimeException("Team is required.");
        }

        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new RuntimeException("Team not found."));

        if (!isActiveTeam(team)) {
            throw new RuntimeException("Selected team is not active.");
        }

        boolean canManage =
                team.getTeamLeader() != null && Objects.equals(team.getTeamLeader().getId(), currentUserId)
                        || team.getProjectManager() != null && Objects.equals(team.getProjectManager().getId(), currentUserId);

        if (!canManage) {
            throw new UnauthorizedActionException("You can access only your own teams.");
        }

        return team;
    }

    @Transactional(readOnly = true)
    public Employee requireActiveEmployeeInManagedTeam(Integer teamId, Integer employeeId, Integer currentUserId) {
        Team team = requireManagedTeam(teamId, currentUserId);

        return getActiveEmployeesFromTeam(team).stream()
                .filter(employee -> Objects.equals(employee.getId(), employeeId))
                .findFirst()
                .orElseThrow(() -> new UnauthorizedActionException("You can select only active employees from your own team."));
    }

    private List<Team> getManagedTeams(Integer currentUserId) {
        Map<Integer, Team> teams = new LinkedHashMap<>();

        teamRepository.findByTeamLeaderIdAndStatusIgnoreCase(currentUserId, "Active")
                .forEach(team -> teams.put(team.getId(), team));

        teamRepository.findByProjectManagerIdAndStatusIgnoreCase(currentUserId, "Active")
                .forEach(team -> teams.put(team.getId(), team));

        return teams.values().stream().toList();
    }

    private List<TeamEmployeeOptionResponseDto> getActiveEmployeeOptions(Team team) {
        return getActiveEmployeesFromTeam(team).stream()
                .map(employee -> {
                    User user = findUserByEmployeeId(team, employee.getId());

                    return TeamEmployeeOptionResponseDto.builder()
                            .id(employee.getId())
                            .employeeId(employee.getId())
                            .userId(user == null ? null : user.getId())
                            .firstName(employee.getFirstName())
                            .lastName(employee.getLastName())
                            .email(employee.getEmail())
                            .positionTitle(employee.getPosition() == null ? null : employee.getPosition().getPositionTitle())
                            .build();
                })
                .sorted(Comparator
                        .comparing(TeamEmployeeOptionResponseDto::getFirstName, Comparator.nullsLast(String.CASE_INSENSITIVE_ORDER))
                        .thenComparing(TeamEmployeeOptionResponseDto::getLastName, Comparator.nullsLast(String.CASE_INSENSITIVE_ORDER)))
                .toList();
    }

    private List<Employee> getActiveEmployeesFromTeam(Team team) {
        List<Integer> employeeIds = team.getTeamMembers().stream()
                .filter(member -> member.getEndedDate() == null)
                .map(TeamMember::getMemberUser)
                .filter(Objects::nonNull)
                .filter(user -> user.getActive() == null || Boolean.TRUE.equals(user.getActive()))
                .map(User::getEmployeeId)
                .filter(Objects::nonNull)
                .distinct()
                .toList();

        if (employeeIds.isEmpty()) {
            return List.of();
        }

        return employeeRepository.findAllById(employeeIds).stream()
                .filter(this::isActiveEmployee)
                .toList();
    }

    private User findUserByEmployeeId(Team team, Integer employeeId) {
        return team.getTeamMembers().stream()
                .map(TeamMember::getMemberUser)
                .filter(Objects::nonNull)
                .filter(user -> Objects.equals(user.getEmployeeId(), employeeId))
                .findFirst()
                .orElseGet(() -> userRepository.findActiveByEmployeeId(employeeId).orElse(null));
    }

    private TeamOptionResponseDto toTeamOption(Team team) {
        return TeamOptionResponseDto.builder()
                .id(team.getId())
                .teamName(team.getTeamName())
                .departmentId(team.getDepartment() == null ? null : team.getDepartment().getId())
                .departmentName(team.getDepartment() == null ? null : team.getDepartment().getDepartmentName())
                .teamLeaderId(team.getTeamLeader() == null ? null : team.getTeamLeader().getId())
                .teamLeaderName(displayUser(team.getTeamLeader()))
                .projectManagerId(team.getProjectManager() == null ? null : team.getProjectManager().getId())
                .projectManagerName(displayUser(team.getProjectManager()))
                .build();
    }

    private boolean isActiveTeam(Team team) {
        return team.getStatus() != null && team.getStatus().equalsIgnoreCase("Active");
    }

    private boolean isActiveEmployee(Employee employee) {
        return employee != null && (employee.getActive() == null || Boolean.TRUE.equals(employee.getActive()));
    }

    private boolean isHr(UserPrincipal user) {
        return user.getRoles().stream()
                .map(this::normalizeRole)
                .anyMatch(role -> role.equals("HR")
                        || role.equals("HUMAN_RESOURCE")
                        || role.equals("HUMAN_RESOURCES")
                        || role.equals("HR_MANAGER")
                        || role.equals("HR_ADMIN"));
    }

    private boolean isDepartmentHead(UserPrincipal user) {
        return user.getRoles().stream()
                .map(this::normalizeRole)
                .anyMatch(role -> role.equals("DEPARTMENT_HEAD") || role.equals("DEPARTMENTHEAD"));
    }

    private String normalizeRole(String role) {
        if (role == null) {
            return "";
        }

        return role.replaceFirst("(?i)^ROLE_", "")
                .trim()
                .replaceAll("[^A-Za-z0-9]+", "_")
                .replaceAll("^_+|_+$", "")
                .toUpperCase();
    }

    private String displayUser(User user) {
        if (user == null) {
            return null;
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