/*
package com.epms.service.impl;

import com.epms.dto.CandidateResponseDto;
import com.epms.dto.TeamRequestDto;
import com.epms.dto.TeamResponseDto;
import com.epms.entity.Department;
import com.epms.entity.Team;
import com.epms.entity.TeamMember;
import com.epms.entity.User;
import com.epms.exception.BusinessValidationException;
import com.epms.repository.DepartmentRepository;
import com.epms.repository.EmployeeDepartmentRepository;
import com.epms.repository.TeamMemberRepository;
import com.epms.repository.TeamRepository;
import com.epms.repository.UserRepository;
import com.epms.security.SecurityUtils;
import com.epms.security.UserPrincipal;
import com.epms.service.TeamService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

*/
/**
 * Why this file is changed:
 * - Team Creation must use working department.
 *
 * Working department rule:
 *   parentdepartment if not null
 *   otherwise currentdepartment
 *
 * Both currentdepartment and parentdepartment are now FK ids to department.id.
 *//*

@Service
@RequiredArgsConstructor
public class TeamServiceImpl implements TeamService {

    private final TeamRepository teamRepository;
    private final TeamMemberRepository teamMemberRepository;
    private final UserRepository userRepository;
    private final DepartmentRepository departmentRepository;
    private final EmployeeDepartmentRepository employeeDepartmentRepository;

    @Override
    @Transactional
    public TeamResponseDto createTeam(TeamRequestDto dto) {
        validateCreateRequest(dto);

        Department department = departmentRepository.findById(dto.getDepartmentId())
                .orElseThrow(() -> new RuntimeException("Department not found: " + dto.getDepartmentId()));

        User leader = userRepository.findById(dto.getTeamLeaderId())
                .orElseThrow(() -> new RuntimeException("Team Leader not found: " + dto.getTeamLeaderId()));

        User creator = userRepository.findById(dto.getCreatedById())
                .orElseThrow(() -> new RuntimeException("Creator not found: " + dto.getCreatedById()));

        validateUserBelongsToWorkingDepartment(
                leader,
                department,
                "Selected Team Leader must belong to the selected working department"
        );

        validateLeaderIsAvailableForActiveTeam(leader.getId(), null);

        Team team = new Team();
        team.setTeamName(dto.getTeamName());
        team.setDepartment(department);
        team.setTeamLeader(leader);
        team.setCreatedByUser(creator);
        team.setTeamGoal(dto.getTeamGoal());
        team.setStatus(normalizeStatus(dto.getStatus()));
        team.setCreatedDate(new Date());

        Team savedTeam = teamRepository.save(team);
        syncMembers(savedTeam, dto.getEffectiveMemberUserIds(), creator);

        return mapToResponseDto(savedTeam);
    }

    @Override
    @Transactional(readOnly = true)
    public List<TeamResponseDto> getAllTeams() {
        return teamRepository.findAll().stream()
                .map(this::mapToResponseDto)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<TeamResponseDto> getTeamsByDepartment(Integer departmentId) {
        return teamRepository.findByDepartmentId(departmentId).stream()
                .map(this::mapToResponseDto)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public TeamResponseDto getTeamById(Integer id) {
        Team team = teamRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Team not found: " + id));
        return mapToResponseDto(team);
    }

    @Override
    @Transactional
    public TeamResponseDto updateTeam(Integer id, TeamRequestDto dto) {
        Team team = teamRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Team not found: " + id));

        if (dto.getTeamName() != null && !dto.getTeamName().trim().isEmpty()) {
            team.setTeamName(dto.getTeamName().trim());
        }

        if (dto.getTeamGoal() != null) {
            team.setTeamGoal(dto.getTeamGoal());
        }

        if (dto.getTeamLeaderId() != null && !Objects.equals(dto.getTeamLeaderId(), team.getTeamLeader().getId())) {
            User newLeader = userRepository.findById(dto.getTeamLeaderId())
                    .orElseThrow(() -> new RuntimeException("New Team Leader not found: " + dto.getTeamLeaderId()));

            validateUserBelongsToWorkingDepartment(
                    newLeader,
                    team.getDepartment(),
                    "New Team Leader must belong to the selected working department"
            );

            if (isActive(team.getStatus())) {
                validateLeaderIsAvailableForActiveTeam(newLeader.getId(), team.getId());
            }

            team.setTeamLeader(newLeader);
        }

        if (dto.getStatus() != null && !dto.getStatus().equalsIgnoreCase(team.getStatus())) {
            String newStatus = normalizeStatus(dto.getStatus());

            if (isActive(newStatus)) {
                validateLeaderIsAvailableForActiveTeam(team.getTeamLeader().getId(), team.getId());
                validateCurrentMembersAreAvailableForActiveTeam(team);
            }

            team.setStatus(newStatus);
        }

        User editor = null;

        if (dto.getCreatedById() != null) {
            editor = userRepository.findById(dto.getCreatedById())
                    .orElseThrow(() -> new RuntimeException("Editor not found: " + dto.getCreatedById()));
        }

        Team updatedTeam = teamRepository.save(team);

        if (dto.getEffectiveMemberUserIds() != null) {
            if (editor == null) {
                editor = updatedTeam.getCreatedByUser();
            }

            syncMembers(updatedTeam, dto.getEffectiveMemberUserIds(), editor);
        }

        return mapToResponseDto(updatedTeam);
    }

    @Override
    @Transactional(readOnly = true)
    public List<CandidateResponseDto> getCandidateUsers(Integer departmentId) {
        Department department = getDepartment(departmentId);

        List<User> users = employeeDepartmentRepository
                .findActiveUsersByWorkingDepartmentId(department.getId());

        List<CandidateResponseDto> candidates = new ArrayList<>();

        for (User user : users) {
            if (user.getPosition() == null || user.getPosition().getPositionTitle() == null) {
                continue;
            }

            String positionTitle = user.getPosition().getPositionTitle().toLowerCase().replace(" ", "");

            if (!positionTitle.contains("teamleader")) {
                continue;
            }

            Team activeTeam = getFirstActiveLeaderTeam(user.getId());
            candidates.add(toCandidate(user, activeTeam, department.getId()));
        }

        return candidates;
    }

    @Override
    @Transactional(readOnly = true)
    public List<CandidateResponseDto> getCandidateMembers(Integer departmentId) {
        Department department = getDepartment(departmentId);

        List<User> users = employeeDepartmentRepository
                .findActiveUsersByWorkingDepartmentId(department.getId());

        List<CandidateResponseDto> candidates = new ArrayList<>();

        for (User user : users) {
            Team activeTeam = getFirstActiveMemberTeam(user.getId());

            if (activeTeam == null) {
                activeTeam = getFirstActiveLeaderTeam(user.getId());
            }

            candidates.add(toCandidate(user, activeTeam, department.getId()));
        }

        return candidates;
    }

    private void validateCreateRequest(TeamRequestDto dto) {
        if (dto.getTeamName() == null || dto.getTeamName().trim().isEmpty()) {
            throw new RuntimeException("Team name is required");
        }

        if (dto.getDepartmentId() == null) {
            throw new RuntimeException("Department is required");
        }

        if (dto.getTeamLeaderId() == null) {
            throw new RuntimeException("Team Leader is required");
        }

        if (dto.getCreatedById() == null) {
            throw new RuntimeException("Created by user is required");
        }
    }

    private void syncMembers(Team team, List<Integer> memberUserIds, User editor) {
        team.clearTeamMembers();

        if (memberUserIds == null || memberUserIds.isEmpty()) {
            return;
        }

        for (Integer userId : memberUserIds) {
            if (userId == null) {
                continue;
            }

            if (Objects.equals(userId, team.getTeamLeader().getId())) {
                throw new RuntimeException("Team Leader cannot also be added as a team member");
            }

            User memberUser = userRepository.findById(userId)
                    .orElseThrow(() -> new RuntimeException("User not found: " + userId));

            validateUserBelongsToWorkingDepartment(
                    memberUser,
                    team.getDepartment(),
                    "Team member " + memberUser.getFullName() + " must belong to the selected working department"
            );

            if (isActive(team.getStatus())) {
                validateMemberIsAvailableForActiveTeam(userId, team.getId(), memberUser.getFullName());
                validateLeaderIsAvailableForActiveTeam(
                        userId,
                        team.getId(),
                        "User " + memberUser.getFullName() + " is already leading an Active team"
                );
            }

            TeamMember member = new TeamMember();
            member.setMemberUser(memberUser);
            member.setStartedDate(new Date());
            member.setEditedByUser(editor);

            team.addTeamMember(member);
        }

        teamRepository.save(team);
    }

    private void validateCurrentMembersAreAvailableForActiveTeam(Team team) {
        List<TeamMember> members = teamMemberRepository.findByTeamId(team.getId());

        for (TeamMember member : members) {
            validateMemberIsAvailableForActiveTeam(
                    member.getMemberUser().getId(),
                    team.getId(),
                    member.getMemberUser().getFullName()
            );
        }
    }

    private void validateMemberIsAvailableForActiveTeam(Integer userId, Integer currentTeamId, String fullName) {
        List<TeamMember> memberships = teamMemberRepository.findByMemberUserId(userId);

        for (TeamMember membership : memberships) {
            Team otherTeam = membership.getTeam();

            if (otherTeam != null && isActive(otherTeam.getStatus()) && !Objects.equals(otherTeam.getId(), currentTeamId)) {
                throw new RuntimeException("User " + fullName + " is already in an Active team: " + otherTeam.getTeamName());
            }
        }
    }

    private void validateLeaderIsAvailableForActiveTeam(Integer leaderId, Integer currentTeamId) {
        validateLeaderIsAvailableForActiveTeam(
                leaderId,
                currentTeamId,
                "Selected Team Leader is already leading an Active team"
        );
    }

    private void validateLeaderIsAvailableForActiveTeam(Integer leaderId, Integer currentTeamId, String message) {
        List<Team> activeLeaderTeams = teamRepository.findByTeamLeaderIdAndStatusIgnoreCase(leaderId, "Active");

        for (Team activeTeam : activeLeaderTeams) {
            if (!Objects.equals(activeTeam.getId(), currentTeamId)) {
                throw new RuntimeException(message + ": " + activeTeam.getTeamName());
            }
        }
    }

    private void validateUserBelongsToWorkingDepartment(User user, Department department, String message) {
        if (user == null || user.getId() == null || department == null || department.getId() == null) {
            throw new RuntimeException(message);
        }

        boolean belongs = employeeDepartmentRepository.existsActiveUserInWorkingDepartment(
                user.getId(),
                department.getId()
        );

        if (!belongs) {
            throw new RuntimeException(message);
        }
    }

    private Team getFirstActiveLeaderTeam(Integer userId) {
        List<Team> teams = teamRepository.findByTeamLeaderIdAndStatusIgnoreCase(userId, "Active");
        return teams.isEmpty() ? null : teams.get(0);
    }

    private Team getFirstActiveMemberTeam(Integer userId) {
        List<TeamMember> memberships = teamMemberRepository.findByMemberUserId(userId);

        for (TeamMember membership : memberships) {
            if (membership.getTeam() != null && isActive(membership.getTeam().getStatus())) {
                return membership.getTeam();
            }
        }

        return null;
    }

    private CandidateResponseDto toCandidate(User user, Team activeTeam, Integer selectedDepartmentId) {
        return new CandidateResponseDto(
                user.getId(),
                user.getFullName(),
                "USER",
                selectedDepartmentId,
                null,
                activeTeam == null,
                activeTeam != null ? activeTeam.getId() : null,
                activeTeam != null ? activeTeam.getTeamName() : null
        );
    }

    private TeamResponseDto mapToResponseDto(Team team) {
        TeamResponseDto dto = new TeamResponseDto();

        dto.setId(team.getId());
        dto.setTeamName(team.getTeamName());
        dto.setDepartmentId(team.getDepartment() != null ? team.getDepartment().getId() : null);
        dto.setDepartmentName(team.getDepartment() != null ? team.getDepartment().getDepartmentName() : null);
        dto.setTeamLeaderId(team.getTeamLeader() != null ? team.getTeamLeader().getId() : null);
        dto.setTeamLeaderName(team.getTeamLeader() != null ? team.getTeamLeader().getFullName() : null);
        dto.setCreatedById(team.getCreatedByUser() != null ? team.getCreatedByUser().getId() : null);
        dto.setCreatedByName(team.getCreatedByUser() != null ? team.getCreatedByUser().getFullName() : null);
        dto.setCreatedDate(team.getCreatedDate());
        dto.setStatus(team.getStatus());
        dto.setTeamGoal(team.getTeamGoal());

        List<TeamMember> teamMembers = team.getTeamMembers();

        if (teamMembers == null) {
            teamMembers = teamMemberRepository.findByTeamId(team.getId());
        }

        List<TeamResponseDto.MemberInfo> members = teamMembers.stream()
                .filter(member -> member.getMemberUser() != null)
                .map(member -> new TeamResponseDto.MemberInfo(
                        member.getMemberUser().getId(),
                        member.getMemberUser().getFullName(),
                        member.getStartedDate()
                ))
                .collect(Collectors.toList());

        dto.setMembers(members);

        return dto;
    }

    private String normalizeStatus(String status) {
        if (status == null || status.trim().isEmpty()) {
            return "Active";
        }

        String trimmed = status.trim();

        if (trimmed.equalsIgnoreCase("Active")) {
            return "Active";
        }

        if (trimmed.equalsIgnoreCase("Inactive")) {
            return "Inactive";
        }

        return trimmed;
    }

    private boolean isActive(String status) {
        return "Active".equalsIgnoreCase(status);
    }

    @Override
    @Transactional(readOnly = true)
    public List<TeamResponseDto> getMyDepartmentTeams() {
        Integer departmentId = requireCurrentDepartmentId();
        return getTeamsByDepartment(departmentId);
    }

    @Override
    @Transactional(readOnly = true)
    public TeamResponseDto getMyDepartmentTeamById(Integer id) {
        Team team = teamRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Team not found: " + id));

        assertSameDepartment(team.getDepartment() != null ? team.getDepartment().getId() : null);

        return mapToResponseDto(team);
    }

    @Override
    @Transactional
    public TeamResponseDto createMyDepartmentTeam(TeamRequestDto dto) {
        Integer departmentId = requireCurrentDepartmentId();
        Integer currentUserId = SecurityUtils.currentUserId();

        dto.setDepartmentId(departmentId);
        dto.setCreatedById(currentUserId);

        return createTeam(dto);
    }

    @Override
    @Transactional
    public TeamResponseDto updateMyDepartmentTeam(Integer id, TeamRequestDto dto) {
        Team team = teamRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Team not found: " + id));

        assertSameDepartment(team.getDepartment() != null ? team.getDepartment().getId() : null);

        dto.setDepartmentId(team.getDepartment().getId());
        dto.setCreatedById(SecurityUtils.currentUserId());

        return updateTeam(id, dto);
    }

    @Override
    @Transactional(readOnly = true)
    public List<CandidateResponseDto> getMyDepartmentCandidateUsers() {
        return getCandidateUsers(requireCurrentDepartmentId());
    }

    @Override
    @Transactional(readOnly = true)
    public List<CandidateResponseDto> getMyDepartmentCandidateMembers() {
        return getCandidateMembers(requireCurrentDepartmentId());
    }

    private Integer requireCurrentDepartmentId() {
        UserPrincipal currentUser = SecurityUtils.currentUser();

        if (currentUser.getDepartmentId() == null) {
            throw new BusinessValidationException("Current department head has no assigned department.");
        }

        return currentUser.getDepartmentId();
    }

    private void assertSameDepartment(Integer requestedDepartmentId) {
        Integer currentDepartmentId = requireCurrentDepartmentId();

        if (requestedDepartmentId == null || !requestedDepartmentId.equals(currentDepartmentId)) {
            throw new BusinessValidationException("You can only access teams from your own department.");
        }
    }

    private Department getDepartment(Integer departmentId) {
        if (departmentId == null) {
            throw new RuntimeException("Department is required.");
        }

        return departmentRepository.findById(departmentId)
                .orElseThrow(() -> new RuntimeException("Department not found: " + departmentId));
    }
}*/




package com.epms.service.impl;

import com.epms.dto.CandidateResponseDto;
import com.epms.dto.TeamHistoryResponseDto;
import com.epms.dto.TeamRequestDto;
import com.epms.dto.TeamResponseDto;
import com.epms.entity.Department;
import com.epms.entity.Role;
import com.epms.entity.Team;
import com.epms.entity.TeamHistory;
import com.epms.entity.TeamMember;
import com.epms.entity.User;
import com.epms.entity.UserRole;
import com.epms.exception.BusinessValidationException;
import com.epms.exception.ResourceNotFoundException;
import com.epms.repository.DepartmentRepository;
import com.epms.repository.EmployeeDepartmentRepository;
import com.epms.repository.RoleRepository;
import com.epms.repository.TeamHistoryRepository;
import com.epms.repository.TeamMemberRepository;
import com.epms.repository.TeamRepository;
import com.epms.repository.UserRepository;
import com.epms.repository.UserRoleRepository;
import com.epms.security.SecurityUtils;
import com.epms.service.NotificationService;
import com.epms.service.TeamService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.Date;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TeamServiceImpl implements TeamService {

    private static final String DEFAULT_CREATE_REASON = "Initial team creation";
    private static final int REASON_WORD_LIMIT = 250;

    private final TeamRepository teamRepository;
    private final DepartmentRepository departmentRepository;
    private final UserRepository userRepository;
    private final TeamMemberRepository teamMemberRepository;
    private final EmployeeDepartmentRepository employeeDepartmentRepository;
    private final TeamHistoryRepository teamHistoryRepository;
    private final NotificationService notificationService;
    private final UserRoleRepository userRoleRepository;
    private final RoleRepository roleRepository;

    @Override
    @Transactional(readOnly = true)
    public List<TeamResponseDto> getAllTeams() {
        return teamRepository.findAll()
                .stream()
                .map(this::toDto)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public TeamResponseDto getTeamById(Integer id) {
        Team team = getTeamOrThrow(id);
        return toDto(team);
    }

    @Override
    @Transactional(readOnly = true)
    public List<TeamResponseDto> getTeamsByDepartment(Integer departmentId) {
        return teamRepository.findByDepartmentId(departmentId)
                .stream()
                .map(this::toDto)
                .toList();
    }

    @Override
    @Transactional
    public TeamResponseDto createTeam(TeamRequestDto request) {
        validateCreateRequest(request);

        Department department = getDepartmentOrThrow(request.getDepartmentId());
        User teamLeader = getActiveUserOrThrow(request.getTeamLeaderId(), "Team Leader");
        User projectManager = resolveProjectManager(request.getProjectManagerId(), department, teamLeader);

        validateUserInWorkingDepartment(teamLeader, department.getId(), "Team Leader");

        Team team = new Team();
        team.setTeamName(cleanRequired(request.getTeamName(), "Team name"));
        team.setDepartment(department);
        team.setTeamLeader(teamLeader);
        team.setProjectManager(projectManager);
        team.setCreatedByUser(resolveCreatedBy(request.getCreatedById()));
        team.setCreatedDate(new Date());
        team.setTeamGoal(cleanNullable(request.getTeamGoal()));
        team.setStatus(cleanStatus(request.getStatus()));

        List<Integer> memberIds = safeIds(request.getEffectiveMemberUserIds());
        validateMembers(memberIds, department, teamLeader, projectManager);

        for (Integer memberId : memberIds) {
            User memberUser = getActiveUserOrThrow(memberId, "Team member");

            TeamMember member = new TeamMember();
            member.setMemberUser(memberUser);
            member.setStartedDate(new Date());
            member.setEndedDate(null);

            team.addTeamMember(member);
        }

        Team saved = teamRepository.save(team);

        User editor = getCurrentUserOrNull();

        recordHistory(
                saved,
                "TEAM_CREATED",
                "team",
                null,
                saved.getTeamName(),
                DEFAULT_CREATE_REASON,
                editor
        );

        sendTeamNotification(
                saved,
                "Team Modified",
                "Team " + saved.getTeamName() + " was created. By " + displayUser(editor) + ".",
                Set.of()
        );

        return toDto(saved);
    }


    @Override
    @Transactional
    public TeamResponseDto updateTeam(Integer id, TeamRequestDto request) {
        Team team = getTeamOrThrow(id);
        validateUpdateRequest(request);

        User editor = getCurrentUserOrNull();
        String reason = cleanRequired(request.getReason(), "Reason");
        validateReason(reason);

        Department department = request.getDepartmentId() != null
                ? getDepartmentOrThrow(request.getDepartmentId())
                : team.getDepartment();

        User oldLeader = team.getTeamLeader();
        User oldProjectManager = team.getProjectManager();

        String oldName = team.getTeamName();
        String oldGoal = team.getTeamGoal();
        String oldStatus = team.getStatus();

        Set<Integer> oldMemberIds = activeMemberIds(team);
        Set<Integer> extraRecipients = new HashSet<>();

        if (oldLeader != null) {
            extraRecipients.add(oldLeader.getId());
        }

        if (oldProjectManager != null) {
            extraRecipients.add(oldProjectManager.getId());
        }

        User newLeader = request.getTeamLeaderId() != null
                ? getActiveUserOrThrow(request.getTeamLeaderId(), "Team Leader")
                : oldLeader;

        if (newLeader == null) {
            throw new BusinessValidationException("Team Leader is required.");
        }

        User newProjectManager = resolveProjectManager(
                request.getProjectManagerId(),
                department,
                newLeader
        );

        validateUserInWorkingDepartment(newLeader, department.getId(), "Team Leader");

        List<Integer> newMemberIdsList = safeIds(request.getEffectiveMemberUserIds());
        validateMembers(newMemberIdsList, department, newLeader, newProjectManager);
        Set<Integer> newMemberIds = new LinkedHashSet<>(newMemberIdsList);

        String newName = cleanRequired(request.getTeamName(), "Team name");
        String newGoal = cleanNullable(request.getTeamGoal());
        String newStatus = cleanStatus(request.getStatus());

        team.setTeamName(newName);
        team.setDepartment(department);
        team.setTeamLeader(newLeader);
        team.setProjectManager(newProjectManager);
        team.setTeamGoal(newGoal);
        team.setStatus(newStatus);

        applyMemberChanges(team, oldMemberIds, newMemberIds);

        Team saved = teamRepository.save(team);

        List<String> notificationParts = new ArrayList<>();

        if (!Objects.equals(oldName, newName)) {
            recordHistory(saved, "TEAM_NAME_CHANGED", "Team Name", oldName, newName, reason, editor);
            notificationParts.add("Team name changed from " + oldName + " to " + newName);
        }

        if (!Objects.equals(nullToEmpty(oldGoal), nullToEmpty(newGoal))) {
            recordHistory(saved, "TEAM_GOAL_CHANGED", "Team Goal", oldGoal, newGoal, reason, editor);
            notificationParts.add("Team goal was updated");
        }

        if (!sameUser(oldLeader, newLeader)) {
            recordHistory(
                    saved,
                    "TEAM_LEADER_CHANGED",
                    "Team Leader",
                    displayUser(oldLeader),
                    displayUser(newLeader),
                    reason,
                    editor
            );

            notificationParts.add(
                    "Team Leader changed from " + displayUser(oldLeader) + " to " + displayUser(newLeader)
            );
        }

        if (!sameUser(oldProjectManager, newProjectManager)) {
            recordHistory(
                    saved,
                    "PROJECT_MANAGER_CHANGED",
                    "Project Manager",
                    displayUser(oldProjectManager),
                    displayUser(newProjectManager),
                    reason,
                    editor
            );

            notificationParts.add(
                    "Project Manager changed from "
                            + displayUser(oldProjectManager)
                            + " to "
                            + displayUser(newProjectManager)
            );
        }

        if (!Objects.equals(normalizeStatus(oldStatus), normalizeStatus(newStatus))) {
            recordHistory(saved, "STATUS_CHANGED", "Status", oldStatus, newStatus, reason, editor);

            if ("inactive".equalsIgnoreCase(newStatus)) {
                notificationParts.add("Team " + saved.getTeamName() + " has gone Inactive");
            } else {
                notificationParts.add("Team " + saved.getTeamName() + " has gone Active");
            }
        }

        Set<Integer> addedMembers = new LinkedHashSet<>(newMemberIds);
        addedMembers.removeAll(oldMemberIds);

        for (Integer memberId : addedMembers) {
            User member = userRepository.findById(memberId).orElse(null);

            recordHistory(
                    saved,
                    "MEMBER_ADDED",
                    "Member",
                    null,
                    displayUser(member),
                    reason,
                    editor
            );

            notificationParts.add(displayUser(member) + " has been added to the team");

            if (member != null) {
                extraRecipients.add(member.getId());
            }
        }

        Set<Integer> removedMembers = new LinkedHashSet<>(oldMemberIds);
        removedMembers.removeAll(newMemberIds);

        for (Integer memberId : removedMembers) {
            User member = userRepository.findById(memberId).orElse(null);

            recordHistory(
                    saved,
                    "MEMBER_REMOVED",
                    "Member",
                    displayUser(member),
                    null,
                    reason,
                    editor
            );

            notificationParts.add(displayUser(member) + " has been removed from the team");

            if (member != null) {
                extraRecipients.add(member.getId());
            }
        }

        if (!notificationParts.isEmpty()) {
            String message = String.join(". ", notificationParts)
                    + ". Reason: "
                    + reason
                    + ". By "
                    + displayUser(editor)
                    + ".";

            sendTeamNotification(saved, "Team Modified", message, extraRecipients);
        }

        return toDto(saved);
    }

    @Override
    @Transactional
    public void deleteTeam(Integer id) {
        Team team = getTeamOrThrow(id);
        teamRepository.delete(team);
    }






    @Override
    @Transactional(readOnly = true)
    public List<CandidateResponseDto> getCandidateUsers(Integer departmentId) {
        return employeeDepartmentRepository.findActiveUsersByWorkingDepartmentId(departmentId)
                .stream()
                .filter(this::isTeamLeaderCandidate)
                .map(user -> toCandidate(user, "Team Leader", true))
                .sorted(candidateComparator())
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<CandidateResponseDto> getCandidateMembers(Integer departmentId) {
        return employeeDepartmentRepository.findActiveUsersByWorkingDepartmentId(departmentId)
                .stream()
                .map(user -> {
                    Team activeTeam = getFirstActiveMemberTeam(user.getId());
                    boolean available = activeTeam == null;

                    CandidateResponseDto dto = toCandidate(user, "Member", available);
                    dto.setCurrentTeamId(activeTeam != null ? activeTeam.getId() : null);
                    dto.setCurrentTeamName(activeTeam != null ? activeTeam.getTeamName() : null);
                    dto.setCurrentTeamNames(activeTeam != null ? activeTeam.getTeamName() : null);

                    return dto;
                })
                .sorted(candidateComparator())
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<CandidateResponseDto> getCandidateProjectManagers(Integer departmentId) {
        return employeeDepartmentRepository.findActiveUsersByWorkingDepartmentId(departmentId)
                .stream()
                .filter(this::isProjectManagerCandidate)
                .map(user -> {
                    CandidateResponseDto dto = toCandidate(user, "Project Manager", true);

                    List<Team> activePmTeams = teamRepository
                            .findByProjectManagerIdAndStatusIgnoreCase(user.getId(), "Active");

                    String teamNames = activePmTeams.stream()
                            .map(Team::getTeamName)
                            .filter(Objects::nonNull)
                            .collect(Collectors.joining(", "));

                    dto.setCurrentTeamNames(teamNames.isBlank() ? null : teamNames);

                    if (!activePmTeams.isEmpty()) {
                        Team first = activePmTeams.get(0);
                        dto.setCurrentTeamId(first.getId());
                        dto.setCurrentTeamName(first.getTeamName());
                    }

                    return dto;
                })
                .sorted(candidateComparator())
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<TeamHistoryResponseDto> getTeamHistory(Integer teamId) {
        Team team = getTeamOrThrow(teamId);

        return teamHistoryRepository.findByTeamIdOrderByChangedAtDesc(team.getId())
                .stream()
                .map(this::toHistoryDto)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<TeamResponseDto> getMyDepartmentTeams() {
        Integer departmentId = requireCurrentUserDepartmentId();

        return teamRepository.findByDepartmentId(departmentId)
                .stream()
                .map(this::toDto)
                .toList();
    }


    @Override
    @Transactional(readOnly = true)
    public TeamResponseDto getMyDepartmentTeamById(Integer id) {
        Integer departmentId = requireCurrentUserDepartmentId();
        Team team = getTeamOrThrow(id);

        if (team.getDepartment() == null || !Objects.equals(team.getDepartment().getId(), departmentId)) {
            throw new BusinessValidationException("You can only access teams from your own department.");
        }

        return toDto(team);
    }

    @Override
    @Transactional
    public TeamResponseDto createMyDepartmentTeam(TeamRequestDto request) {
        Integer departmentId = requireCurrentUserDepartmentId();
        request.setDepartmentId(departmentId);

        return createTeam(request);
    }

    @Override
    @Transactional
    public TeamResponseDto updateMyDepartmentTeam(Integer id, TeamRequestDto request) {
        Integer departmentId = requireCurrentUserDepartmentId();

        Team team = getTeamOrThrow(id);

        if (team.getDepartment() == null || !Objects.equals(team.getDepartment().getId(), departmentId)) {
            throw new BusinessValidationException("You can only update teams from your own department.");
        }

        request.setDepartmentId(departmentId);

        return updateTeam(id, request);
    }

    @Override
    @Transactional(readOnly = true)
    public List<CandidateResponseDto> getMyDepartmentCandidateUsers() {
        return getCandidateUsers(requireCurrentUserDepartmentId());
    }

    @Override
    @Transactional(readOnly = true)
    public List<CandidateResponseDto> getMyDepartmentCandidateMembers() {
        return getCandidateMembers(requireCurrentUserDepartmentId());
    }

    @Override
    @Transactional(readOnly = true)
    public List<CandidateResponseDto> getMyDepartmentCandidateProjectManagers() {
        return getCandidateProjectManagers(requireCurrentUserDepartmentId());
    }

    @Override
    @Transactional(readOnly = true)
    public List<TeamHistoryResponseDto> getMyDepartmentTeamHistory(Integer teamId) {
        Integer departmentId = requireCurrentUserDepartmentId();
        Team team = getTeamOrThrow(teamId);

        if (team.getDepartment() == null || !Objects.equals(team.getDepartment().getId(), departmentId)) {
            throw new BusinessValidationException("You can only view history for your own department teams.");
        }

        return getTeamHistory(teamId);
    }

    private void validateCreateRequest(TeamRequestDto request) {
        if (request == null) {
            throw new BusinessValidationException("Team request is required.");
        }

        cleanRequired(request.getTeamName(), "Team name");

        if (request.getDepartmentId() == null) {
            throw new BusinessValidationException("Department is required.");
        }

        if (request.getTeamLeaderId() == null) {
            throw new BusinessValidationException("Team Leader is required.");
        }
    }

    private void validateUpdateRequest(TeamRequestDto request) {
        validateCreateRequest(request);
        cleanRequired(request.getReason(), "Reason");
        validateReason(request.getReason());
    }

    private Team getTeamOrThrow(Integer id) {
        return teamRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Team not found with id: " + id));
    }

    private Department getDepartmentOrThrow(Integer id) {
        return departmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Department not found with id: " + id));
    }

    private User getActiveUserOrThrow(Integer userId, String label) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException(label + " not found with id: " + userId));

        if (!isActiveUser(user)) {
            throw new BusinessValidationException(label + " must be active.");
        }

        return user;
    }

    private User resolveCreatedBy(Integer createdById) {
        Integer currentUserId = SecurityUtils.currentUserId();
        Integer id = createdById != null ? createdById : currentUserId;

        return userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Created by user not found with id: " + id));
    }

    private User resolveProjectManager(Integer projectManagerId, Department department, User teamLeader) {
        if (projectManagerId == null) {
            return null;
        }

        User projectManager = getActiveUserOrThrow(projectManagerId, "Project Manager");

        if (sameUser(projectManager, teamLeader)) {
            throw new BusinessValidationException("Project Manager cannot be the same as Team Leader.");
        }

        if (!isProjectManagerCandidate(projectManager)) {
            throw new BusinessValidationException("Selected Project Manager must have Project Manager role or position.");
        }

        validateUserInWorkingDepartment(projectManager, department.getId(), "Project Manager");

        return projectManager;
    }

    private void validateMembers(
            List<Integer> memberIds,
            Department department,
            User teamLeader,
            User projectManager
    ) {
        if (memberIds == null) {
            return;
        }

        Set<Integer> unique = new HashSet<>();

        for (Integer memberId : memberIds) {
            if (memberId == null) {
                continue;
            }

            if (!unique.add(memberId)) {
                throw new BusinessValidationException("Duplicate team member selected.");
            }

            if (teamLeader != null && Objects.equals(teamLeader.getId(), memberId)) {
                throw new BusinessValidationException("Team Leader cannot be selected as a normal member.");
            }

            if (projectManager != null && Objects.equals(projectManager.getId(), memberId)) {
                throw new BusinessValidationException("Project Manager cannot be selected as a normal member.");
            }

            User member = getActiveUserOrThrow(memberId, "Team member");
            validateUserInWorkingDepartment(member, department.getId(), "Team member");
        }
    }

    private void applyMemberChanges(Team team, Set<Integer> oldMemberIds, Set<Integer> newMemberIds) {
        if (team.getTeamMembers() == null) {
            team.setTeamMembers(new ArrayList<>());
        }

        List<TeamMember> existing = new ArrayList<>(team.getTeamMembers());

        for (TeamMember member : existing) {
            Integer memberUserId = member.getMemberUser() != null ? member.getMemberUser().getId() : null;

            if (memberUserId == null || !newMemberIds.contains(memberUserId)) {
                team.removeTeamMember(member);
            }
        }

        Set<Integer> currentAfterRemoval = activeMemberIds(team);

        for (Integer userId : newMemberIds) {
            if (currentAfterRemoval.contains(userId)) {
                continue;
            }

            User user = getActiveUserOrThrow(userId, "Team member");

            TeamMember member = new TeamMember();
            member.setMemberUser(user);
            member.setStartedDate(new Date());
            member.setEndedDate(null);

            team.addTeamMember(member);
        }
    }

    private void validateUserInWorkingDepartment(User user, Integer departmentId, String label) {
        if (user == null || user.getId() == null) {
            throw new BusinessValidationException(label + " is invalid.");
        }

        boolean belongs = employeeDepartmentRepository.existsActiveUserInWorkingDepartment(
                user.getId(),
                departmentId
        );

        if (!belongs) {
            throw new BusinessValidationException(label + " must belong to the selected working department.");
        }
    }

    private boolean isTeamLeaderCandidate(User user) {
        if (!isActiveUser(user) || user.getPosition() == null || user.getPosition().getPositionTitle() == null) {
            return false;
        }

        String positionTitle = normalize(user.getPosition().getPositionTitle());
        return positionTitle.contains("teamleader");
    }

    private boolean isProjectManagerCandidate(User user) {
        if (!isActiveUser(user)) {
            return false;
        }

        if (user.getPosition() != null && user.getPosition().getPositionTitle() != null) {
            String positionTitle = normalize(user.getPosition().getPositionTitle());

            if (positionTitle.contains("projectmanager")) {
                return true;
            }
        }

        return hasRole(user, "ProjectManager")
                || hasRole(user, "PROJECT_MANAGER")
                || hasRole(user, "ROLE_PROJECT_MANAGER")
                || hasRole(user, "Project Manager");
    }

    private boolean hasRole(User user, String roleName) {
        if (user == null || user.getId() == null || roleName == null) {
            return false;
        }

        String expected = normalizeRole(roleName);
        List<UserRole> userRoles = userRoleRepository.findByUserId(user.getId());

        for (UserRole userRole : userRoles) {
            if (userRole.getRoleId() == null) {
                continue;
            }

            Optional<Role> roleOpt = roleRepository.findById(userRole.getRoleId());

            if (roleOpt.isEmpty() || roleOpt.get().getName() == null) {
                continue;
            }

            if (expected.equals(normalizeRole(roleOpt.get().getName()))) {
                return true;
            }
        }

        return false;
    }



    private void recordHistory(
            Team team,
            String actionType,
            String fieldName,
            String oldValue,
            String newValue,
            String reason,
            User changedBy
    ) {
        TeamHistory history = new TeamHistory();
        history.setTeam(team);
        history.setActionType(actionType);
        history.setFieldName(fieldName);
        history.setOldValue(oldValue);
        history.setNewValue(newValue);
        history.setReason(reason);
        history.setChangedBy(changedBy);
        history.setChangedByName(displayUser(changedBy));
        history.setChangedAt(new Date());

        teamHistoryRepository.save(history);
    }

    private void sendTeamNotification(
            Team team,
            String title,
            String message,
            Set<Integer> extraRecipients
    ) {
        Set<Integer> recipientIds = new HashSet<>();

        if (team.getDepartment() != null && team.getDepartment().getId() != null) {
            userRepository.findActiveDepartmentHeadsByDepartmentId(team.getDepartment().getId())
                    .forEach(user -> recipientIds.add(user.getId()));
        }

        if (team.getTeamLeader() != null && isActiveUser(team.getTeamLeader())) {
            recipientIds.add(team.getTeamLeader().getId());
        }

        if (team.getProjectManager() != null && isActiveUser(team.getProjectManager())) {
            recipientIds.add(team.getProjectManager().getId());
        }

        if (team.getTeamMembers() != null) {
            for (TeamMember member : team.getTeamMembers()) {
                if (member.getMemberUser() != null && isActiveUser(member.getMemberUser())) {
                    recipientIds.add(member.getMemberUser().getId());
                }
            }
        }

        if (extraRecipients != null) {
            recipientIds.addAll(extraRecipients);
        }

        recipientIds.stream()
                .filter(Objects::nonNull)
                .forEach(userId -> notificationService.send(userId, title, message, "GENERAL"));
    }

    private TeamResponseDto toDto(Team team) {
        TeamResponseDto dto = new TeamResponseDto();

        dto.setId(team.getId());
        dto.setTeamName(team.getTeamName());

        if (team.getDepartment() != null) {
            dto.setDepartmentId(team.getDepartment().getId());
            dto.setDepartmentName(team.getDepartment().getDepartmentName());
        }

        if (team.getTeamLeader() != null) {
            dto.setTeamLeaderId(team.getTeamLeader().getId());
            dto.setTeamLeaderName(displayUser(team.getTeamLeader()));
        }

        if (team.getProjectManager() != null) {
            dto.setProjectManagerId(team.getProjectManager().getId());
            dto.setProjectManagerName(displayUser(team.getProjectManager()));

            List<Team> pmTeams = teamRepository.findByProjectManagerIdAndStatusIgnoreCase(
                    team.getProjectManager().getId(),
                    "Active"
            );

            String pmTeamNames = pmTeams.stream()
                    .filter(t -> !Objects.equals(t.getId(), team.getId()))
                    .map(Team::getTeamName)
                    .filter(Objects::nonNull)
                    .collect(Collectors.joining(", "));

            dto.setProjectManagerTeams(pmTeamNames.isBlank() ? null : pmTeamNames);
        }

        if (team.getCreatedByUser() != null) {
            dto.setCreatedById(team.getCreatedByUser().getId());
            dto.setCreatedByName(displayUser(team.getCreatedByUser()));
        }

        dto.setCreatedDate(team.getCreatedDate());
        dto.setStatus(team.getStatus());
        dto.setTeamGoal(team.getTeamGoal());

        List<TeamResponseDto.MemberInfo> members = team.getTeamMembers() == null
                ? List.of()
                : team.getTeamMembers()
                .stream()
                .filter(Objects::nonNull)
                .filter(member -> member.getMemberUser() != null)
                .sorted(Comparator.comparing(
                        member -> displayUser(member.getMemberUser()),
                        String.CASE_INSENSITIVE_ORDER
                ))
                .map(member -> new TeamResponseDto.MemberInfo(
                        member.getMemberUser().getId(),
                        displayUser(member.getMemberUser()),
                        member.getStartedDate()
                ))
                .toList();

        dto.setMembers(members);

        return dto;
    }

    private TeamHistoryResponseDto toHistoryDto(TeamHistory history) {
        TeamHistoryResponseDto dto = new TeamHistoryResponseDto();

        dto.setId(history.getId());

        if (history.getTeam() != null) {
            dto.setTeamId(history.getTeam().getId());
            dto.setTeamName(history.getTeam().getTeamName());
        }

        dto.setActionType(history.getActionType());
        dto.setFieldName(history.getFieldName());
        dto.setOldValue(history.getOldValue());
        dto.setNewValue(history.getNewValue());
        dto.setReason(history.getReason());

        if (history.getChangedBy() != null) {
            dto.setChangedById(history.getChangedBy().getId());
        }

        dto.setChangedByName(history.getChangedByName());
        dto.setChangedAt(history.getChangedAt());

        return dto;
    }

    private CandidateResponseDto toCandidate(User user, String type, Boolean available) {
        CandidateResponseDto dto = new CandidateResponseDto();

        dto.setId(user.getId());
        dto.setName(displayUser(user));
        dto.setType(type);
        dto.setDepartmentId(user.getDepartmentId());
        dto.setDepartmentName(getWorkingDepartmentName(user));
        dto.setAvailable(available);

        return dto;
    }

    private String getWorkingDepartmentName(User user) {
        if (user == null || user.getId() == null) {
            return null;
        }

        List<String> names = employeeDepartmentRepository.findWorkingDepartmentNamesByUserId(user.getId());

        if (names == null || names.isEmpty()) {
            return null;
        }

        return names.get(0);
    }

    private Team getFirstActiveMemberTeam(Integer userId) {
        if (userId == null) {
            return null;
        }

        List<TeamMember> memberships = teamMemberRepository.findByMemberUserId(userId);

        for (TeamMember membership : memberships) {
            if (membership.getTeam() != null
                    && membership.getTeam().getStatus() != null
                    && membership.getTeam().getStatus().equalsIgnoreCase("Active")) {
                return membership.getTeam();
            }
        }

        return null;
    }

    private Set<Integer> activeMemberIds(Team team) {
        if (team == null || team.getTeamMembers() == null) {
            return new LinkedHashSet<>();
        }

        return team.getTeamMembers()
                .stream()
                .filter(Objects::nonNull)
                .filter(member -> member.getMemberUser() != null)
                .map(member -> member.getMemberUser().getId())
                .collect(Collectors.toCollection(LinkedHashSet::new));
    }

    private List<Integer> safeIds(List<Integer> ids) {
        if (ids == null) {
            return new ArrayList<>();
        }

        return ids.stream()
                .filter(Objects::nonNull)
                .distinct()
                .toList();
    }

    private Integer requireCurrentUserDepartmentId() {
        User currentUser = getCurrentUserOrThrow();

        if (currentUser.getDepartmentId() == null) {
            throw new BusinessValidationException("Current user has no assigned department.");
        }

        return currentUser.getDepartmentId();
    }

    private User getCurrentUserOrThrow() {
        Integer currentUserId = SecurityUtils.currentUserId();

        return userRepository.findById(currentUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Current user not found."));
    }

    private User getCurrentUserOrNull() {
        try {
            return getCurrentUserOrThrow();
        } catch (Exception ignored) {
            return null;
        }
    }

    private boolean isActiveUser(User user) {
        return user != null && (user.getActive() == null || Boolean.TRUE.equals(user.getActive()));
    }

    private boolean sameUser(User a, User b) {
        Integer aId = a != null ? a.getId() : null;
        Integer bId = b != null ? b.getId() : null;
        return Objects.equals(aId, bId);
    }

    private String displayUser(User user) {
        if (user == null) {
            return "—";
        }

        if (user.getFullName() != null && !user.getFullName().trim().isEmpty()) {
            return user.getFullName().trim();
        }

        if (user.getEmail() != null && !user.getEmail().trim().isEmpty()) {
            return user.getEmail().trim();
        }

        return "User #" + user.getId();
    }

    private String cleanRequired(String value, String label) {
        if (value == null || value.trim().isEmpty()) {
            throw new BusinessValidationException(label + " is required.");
        }

        return value.trim();
    }

    private String cleanNullable(String value) {
        if (value == null || value.trim().isEmpty()) {
            return null;
        }

        return value.trim();
    }

    private String cleanStatus(String status) {
        String clean = cleanNullable(status);

        if (clean == null) {
            return "Active";
        }

        if (!clean.equalsIgnoreCase("Active") && !clean.equalsIgnoreCase("Inactive")) {
            throw new BusinessValidationException("Status must be Active or Inactive.");
        }

        return clean.substring(0, 1).toUpperCase(Locale.ROOT)
                + clean.substring(1).toLowerCase(Locale.ROOT);
    }

    private void validateReason(String reason) {
        String clean = cleanRequired(reason, "Reason");
        String[] words = clean.trim().split("\\s+");

        if (words.length > REASON_WORD_LIMIT) {
            throw new BusinessValidationException("Cannot exceed more than 250 words.");
        }
    }

    private String normalize(String value) {
        if (value == null) {
            return "";
        }

        return value.trim()
                .replace(" ", "")
                .replace("_", "")
                .replace("-", "")
                .toLowerCase(Locale.ROOT);
    }

    private String normalizeRole(String role) {
        if (role == null) {
            return "";
        }

        return role.trim()
                .replace("ROLE_", "")
                .replace(" ", "")
                .replace("_", "")
                .replace("-", "")
                .toLowerCase(Locale.ROOT);
    }

    private String normalizeStatus(String status) {
        return status == null ? "" : status.trim().toLowerCase(Locale.ROOT);
    }

    private String nullToEmpty(String value) {
        return value == null ? "" : value;
    }

    private Comparator<CandidateResponseDto> candidateComparator() {
        return Comparator.comparing(
                candidate -> candidate.getName() == null ? "" : candidate.getName(),
                String.CASE_INSENSITIVE_ORDER
        );
    }
}