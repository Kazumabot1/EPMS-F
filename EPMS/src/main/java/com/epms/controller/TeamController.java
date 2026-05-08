/*
package com.epms.controller;

import com.epms.dto.CandidateResponseDto;
import com.epms.dto.GenericApiResponse;
import com.epms.dto.TeamRequestDto;
import com.epms.dto.TeamResponseDto;
import com.epms.service.TeamService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/teams")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class TeamController {

    private final TeamService teamService;

    @PostMapping
    public ResponseEntity<GenericApiResponse<TeamResponseDto>> createTeam(@RequestBody TeamRequestDto requestDto) {
        return ResponseEntity.ok(GenericApiResponse.success("Team created successfully", teamService.createTeam(requestDto)));
    }

    @GetMapping
    public ResponseEntity<GenericApiResponse<List<TeamResponseDto>>> getAllTeams() {
        return ResponseEntity.ok(GenericApiResponse.success("Teams fetched successfully", teamService.getAllTeams()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<GenericApiResponse<TeamResponseDto>> getTeamById(@PathVariable Integer id) {
        return ResponseEntity.ok(GenericApiResponse.success("Team fetched successfully", teamService.getTeamById(id)));
    }

    @GetMapping("/department/{deptId}")
    public ResponseEntity<GenericApiResponse<List<TeamResponseDto>>> getTeamsByDepartment(@PathVariable Integer deptId) {
        return ResponseEntity.ok(GenericApiResponse.success("Teams fetched successfully", teamService.getTeamsByDepartment(deptId)));
    }

    @PutMapping("/{id}")
    @PreAuthorize(
            "hasRole('HR') or hasRole('ADMIN') " +
            "or hasRole('DEPARTMENT_HEAD') or hasRole('DEPARTMENTHEAD') " +
            "or hasAuthority('ROLE_DEPARTMENT_HEAD') or hasAuthority('ROLE_DEPARTMENTHEAD') " +
            "or authentication.principal.dashboard == 'DEPARTMENT_HEAD_DASHBOARD' " +
            "or hasRole('PROJECT_MANAGER') or hasRole('PROJECTMANAGER') " +
            "or authentication.principal.dashboard == 'PROJECT_MANAGER_DASHBOARD'"
    )
    public ResponseEntity<GenericApiResponse<TeamResponseDto>> updateTeam(@PathVariable Integer id,
                                                                           @RequestBody TeamRequestDto requestDto) {
        return ResponseEntity.ok(GenericApiResponse.success("Team updated successfully", teamService.updateTeam(id, requestDto)));
    }

    @GetMapping("/candidates/users/{deptId}")
    public ResponseEntity<GenericApiResponse<List<CandidateResponseDto>>> getCandidateUsers(@PathVariable Integer deptId) {
        return ResponseEntity.ok(GenericApiResponse.success("Candidate users fetched", teamService.getCandidateUsers(deptId)));
    }

    @GetMapping("/candidates/members/{deptId}")
    public ResponseEntity<GenericApiResponse<List<CandidateResponseDto>>> getCandidateMembers(@PathVariable Integer deptId) {
        return ResponseEntity.ok(GenericApiResponse.success("Candidate members fetched", teamService.getCandidateMembers(deptId)));
    }
}
*/




package com.epms.controller;

import com.epms.dto.CandidateResponseDto;
import com.epms.dto.GenericApiResponse;
import com.epms.dto.TeamHistoryResponseDto;
import com.epms.dto.TeamRequestDto;
import com.epms.dto.TeamResponseDto;
import com.epms.service.TeamService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/teams")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class TeamController {

    private final TeamService teamService;

    @PostMapping
    @PreAuthorize("hasRole('HR') or hasRole('ADMIN')")
    public ResponseEntity<GenericApiResponse<TeamResponseDto>> createTeam(
            @RequestBody TeamRequestDto requestDto
    ) {
        return ResponseEntity.ok(
                GenericApiResponse.success(
                        "Team created successfully",
                        teamService.createTeam(requestDto)
                )
        );
    }

    @GetMapping
    @PreAuthorize(
            "hasRole('HR') or hasRole('ADMIN') " +
                    "or hasRole('DEPARTMENT_HEAD') or hasRole('DEPARTMENTHEAD') " +
                    "or hasAuthority('ROLE_DEPARTMENT_HEAD') or hasAuthority('ROLE_DEPARTMENTHEAD') " +
                    "or authentication.principal.dashboard == 'DEPARTMENT_HEAD_DASHBOARD'"
    )
    public ResponseEntity<GenericApiResponse<List<TeamResponseDto>>> getAllTeams() {
        return ResponseEntity.ok(
                GenericApiResponse.success(
                        "Teams fetched successfully",
                        teamService.getAllTeams()
                )
        );
    }

    @GetMapping("/{id}")
    @PreAuthorize(
            "hasRole('HR') or hasRole('ADMIN') " +
                    "or hasRole('DEPARTMENT_HEAD') or hasRole('DEPARTMENTHEAD') " +
                    "or hasAuthority('ROLE_DEPARTMENT_HEAD') or hasAuthority('ROLE_DEPARTMENTHEAD') " +
                    "or authentication.principal.dashboard == 'DEPARTMENT_HEAD_DASHBOARD'"
    )
    public ResponseEntity<GenericApiResponse<TeamResponseDto>> getTeamById(
            @PathVariable Integer id
    ) {
        return ResponseEntity.ok(
                GenericApiResponse.success(
                        "Team fetched successfully",
                        teamService.getTeamById(id)
                )
        );
    }

    @GetMapping("/department/{deptId}")
    @PreAuthorize(
            "hasRole('HR') or hasRole('ADMIN') " +
                    "or hasRole('DEPARTMENT_HEAD') or hasRole('DEPARTMENTHEAD') " +
                    "or hasAuthority('ROLE_DEPARTMENT_HEAD') or hasAuthority('ROLE_DEPARTMENTHEAD') " +
                    "or authentication.principal.dashboard == 'DEPARTMENT_HEAD_DASHBOARD'"
    )
    public ResponseEntity<GenericApiResponse<List<TeamResponseDto>>> getTeamsByDepartment(
            @PathVariable Integer deptId
    ) {
        return ResponseEntity.ok(
                GenericApiResponse.success(
                        "Teams fetched successfully",
                        teamService.getTeamsByDepartment(deptId)
                )
        );
    }

    @PutMapping("/{id}")
    @PreAuthorize(
            "hasRole('HR') or hasRole('ADMIN') " +
                    "or hasRole('DEPARTMENT_HEAD') or hasRole('DEPARTMENTHEAD') " +
                    "or hasAuthority('ROLE_DEPARTMENT_HEAD') or hasAuthority('ROLE_DEPARTMENTHEAD') " +
                    "or authentication.principal.dashboard == 'DEPARTMENT_HEAD_DASHBOARD'"
    )
    public ResponseEntity<GenericApiResponse<TeamResponseDto>> updateTeam(
            @PathVariable Integer id,
            @RequestBody TeamRequestDto requestDto
    ) {
        return ResponseEntity.ok(
                GenericApiResponse.success(
                        "Team updated successfully",
                        teamService.updateTeam(id, requestDto)
                )
        );
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('HR') or hasRole('ADMIN')")
    public ResponseEntity<GenericApiResponse<String>> deleteTeam(
            @PathVariable Integer id
    ) {
        teamService.deleteTeam(id);

        return ResponseEntity.ok(
                GenericApiResponse.success(
                        "Team deleted successfully",
                        "Deleted"
                )
        );
    }

    @GetMapping("/candidates/users/{deptId}")
    @PreAuthorize("hasRole('HR') or hasRole('ADMIN')")
    public ResponseEntity<GenericApiResponse<List<CandidateResponseDto>>> getCandidateUsers(
            @PathVariable Integer deptId
    ) {
        return ResponseEntity.ok(
                GenericApiResponse.success(
                        "Candidate users fetched",
                        teamService.getCandidateUsers(deptId)
                )
        );
    }

    @GetMapping("/candidates/members/{deptId}")
    @PreAuthorize("hasRole('HR') or hasRole('ADMIN')")
    public ResponseEntity<GenericApiResponse<List<CandidateResponseDto>>> getCandidateMembers(
            @PathVariable Integer deptId
    ) {
        return ResponseEntity.ok(
                GenericApiResponse.success(
                        "Candidate members fetched",
                        teamService.getCandidateMembers(deptId)
                )
        );
    }

    @GetMapping("/candidates/project-managers/{deptId}")
    @PreAuthorize("hasRole('HR') or hasRole('ADMIN')")
    public ResponseEntity<GenericApiResponse<List<CandidateResponseDto>>> getCandidateProjectManagers(
            @PathVariable Integer deptId
    ) {
        return ResponseEntity.ok(
                GenericApiResponse.success(
                        "Candidate project managers fetched",
                        teamService.getCandidateProjectManagers(deptId)
                )
        );
    }

    @GetMapping("/{teamId}/history")
    @PreAuthorize(
            "hasRole('HR') or hasRole('ADMIN') " +
                    "or hasRole('DEPARTMENT_HEAD') or hasRole('DEPARTMENTHEAD') " +
                    "or hasAuthority('ROLE_DEPARTMENT_HEAD') or hasAuthority('ROLE_DEPARTMENTHEAD') " +
                    "or authentication.principal.dashboard == 'DEPARTMENT_HEAD_DASHBOARD'"
    )
    public ResponseEntity<GenericApiResponse<List<TeamHistoryResponseDto>>> getTeamHistory(
            @PathVariable Integer teamId
    ) {
        return ResponseEntity.ok(
                GenericApiResponse.success(
                        "Team history fetched",
                        teamService.getTeamHistory(teamId)
                )
        );
    }

    @GetMapping("/my-department")
    @PreAuthorize(
            "hasRole('DEPARTMENT_HEAD') or hasRole('DEPARTMENTHEAD') " +
                    "or hasAuthority('ROLE_DEPARTMENT_HEAD') or hasAuthority('ROLE_DEPARTMENTHEAD') " +
                    "or authentication.principal.dashboard == 'DEPARTMENT_HEAD_DASHBOARD'"
    )
    public ResponseEntity<GenericApiResponse<List<TeamResponseDto>>> getMyDepartmentTeams() {
        return ResponseEntity.ok(
                GenericApiResponse.success(
                        "My department teams fetched successfully",
                        teamService.getMyDepartmentTeams()
                )
        );
    }

    @PostMapping("/my-department")
    @PreAuthorize(
            "hasRole('DEPARTMENT_HEAD') or hasRole('DEPARTMENTHEAD') " +
                    "or hasAuthority('ROLE_DEPARTMENT_HEAD') or hasAuthority('ROLE_DEPARTMENTHEAD') " +
                    "or authentication.principal.dashboard == 'DEPARTMENT_HEAD_DASHBOARD'"
    )
    public ResponseEntity<GenericApiResponse<TeamResponseDto>> createMyDepartmentTeam(
            @RequestBody TeamRequestDto requestDto
    ) {
        return ResponseEntity.ok(
                GenericApiResponse.success(
                        "Team created successfully",
                        teamService.createMyDepartmentTeam(requestDto)
                )
        );
    }

    @PutMapping("/my-department/{id}")
    @PreAuthorize(
            "hasRole('DEPARTMENT_HEAD') or hasRole('DEPARTMENTHEAD') " +
                    "or hasAuthority('ROLE_DEPARTMENT_HEAD') or hasAuthority('ROLE_DEPARTMENTHEAD') " +
                    "or authentication.principal.dashboard == 'DEPARTMENT_HEAD_DASHBOARD'"
    )
    public ResponseEntity<GenericApiResponse<TeamResponseDto>> updateMyDepartmentTeam(
            @PathVariable Integer id,
            @RequestBody TeamRequestDto requestDto
    ) {
        return ResponseEntity.ok(
                GenericApiResponse.success(
                        "Team updated successfully",
                        teamService.updateMyDepartmentTeam(id, requestDto)
                )
        );
    }

    @GetMapping("/my-department/candidates/users")
    @PreAuthorize(
            "hasRole('DEPARTMENT_HEAD') or hasRole('DEPARTMENTHEAD') " +
                    "or hasAuthority('ROLE_DEPARTMENT_HEAD') or hasAuthority('ROLE_DEPARTMENTHEAD') " +
                    "or authentication.principal.dashboard == 'DEPARTMENT_HEAD_DASHBOARD'"
    )
    public ResponseEntity<GenericApiResponse<List<CandidateResponseDto>>> getMyDepartmentCandidateUsers() {
        return ResponseEntity.ok(
                GenericApiResponse.success(
                        "Candidate users fetched",
                        teamService.getMyDepartmentCandidateUsers()
                )
        );
    }

    @GetMapping("/my-department/candidates/members")
    @PreAuthorize(
            "hasRole('DEPARTMENT_HEAD') or hasRole('DEPARTMENTHEAD') " +
                    "or hasAuthority('ROLE_DEPARTMENT_HEAD') or hasAuthority('ROLE_DEPARTMENTHEAD') " +
                    "or authentication.principal.dashboard == 'DEPARTMENT_HEAD_DASHBOARD'"
    )
    public ResponseEntity<GenericApiResponse<List<CandidateResponseDto>>> getMyDepartmentCandidateMembers() {
        return ResponseEntity.ok(
                GenericApiResponse.success(
                        "Candidate members fetched",
                        teamService.getMyDepartmentCandidateMembers()
                )
        );
    }

    @GetMapping("/my-department/candidates/project-managers")
    @PreAuthorize(
            "hasRole('DEPARTMENT_HEAD') or hasRole('DEPARTMENTHEAD') " +
                    "or hasAuthority('ROLE_DEPARTMENT_HEAD') or hasAuthority('ROLE_DEPARTMENTHEAD') " +
                    "or authentication.principal.dashboard == 'DEPARTMENT_HEAD_DASHBOARD'"
    )
    public ResponseEntity<GenericApiResponse<List<CandidateResponseDto>>> getMyDepartmentCandidateProjectManagers() {
        return ResponseEntity.ok(
                GenericApiResponse.success(
                        "Candidate project managers fetched",
                        teamService.getMyDepartmentCandidateProjectManagers()
                )
        );
    }

    @GetMapping("/my-department/{teamId}/history")
    @PreAuthorize(
            "hasRole('DEPARTMENT_HEAD') or hasRole('DEPARTMENTHEAD') " +
                    "or hasAuthority('ROLE_DEPARTMENT_HEAD') or hasAuthority('ROLE_DEPARTMENTHEAD') " +
                    "or authentication.principal.dashboard == 'DEPARTMENT_HEAD_DASHBOARD'"
    )
    public ResponseEntity<GenericApiResponse<List<TeamHistoryResponseDto>>> getMyDepartmentTeamHistory(
            @PathVariable Integer teamId
    ) {
        return ResponseEntity.ok(
                GenericApiResponse.success(
                        "Team history fetched",
                        teamService.getMyDepartmentTeamHistory(teamId)
                )
        );
    }
}