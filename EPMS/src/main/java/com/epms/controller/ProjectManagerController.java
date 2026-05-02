package com.epms.controller;

import com.epms.dto.GenericApiResponse;
import com.epms.dto.TeamResponseDto;
import com.epms.service.TeamService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Project Manager-scoped REST controller.
 * Project Managers can read all teams (cross-department visibility) to monitor
 * project-level performance, but they cannot create or delete teams.
 */
@RestController
@RequestMapping("/api/project-manager")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
@PreAuthorize(
        "hasRole('PROJECT_MANAGER') " +
        "or hasRole('PROJECTMANAGER') " +
        "or hasAuthority('ROLE_PROJECT_MANAGER') " +
        "or hasAuthority('ROLE_PROJECTMANAGER') " +
        "or authentication.principal.dashboard == 'PROJECT_MANAGER_DASHBOARD' " +
        "or hasRole('HR') " +
        "or hasRole('ADMIN')"
)
public class ProjectManagerController {

    private final TeamService teamService;

    /**
     * Returns all teams across all departments.
     * Project Managers need cross-department visibility to track project-level performance.
     */
    @GetMapping("/teams")
    public ResponseEntity<GenericApiResponse<List<TeamResponseDto>>> getAllTeams() {
        return ResponseEntity.ok(
                GenericApiResponse.success("All teams fetched", teamService.getAllTeams())
        );
    }

    /**
     * Get a specific team by ID.
     */
    @GetMapping("/teams/{id}")
    public ResponseEntity<GenericApiResponse<TeamResponseDto>> getTeamById(@PathVariable Integer id) {
        return ResponseEntity.ok(
                GenericApiResponse.success("Team fetched", teamService.getTeamById(id))
        );
    }

    /**
     * Dashboard summary endpoint — returns basic stats for Project Manager view.
     * The frontend /project-manager/dashboard page calls the assessment score table directly;
     * this endpoint is a convenience for future expansion.
     */
    @GetMapping("/dashboard")
    public ResponseEntity<GenericApiResponse<Object>> dashboard() {
        List<TeamResponseDto> allTeams = teamService.getAllTeams();
        long activeTeams = allTeams.stream()
                .filter(t -> "Active".equalsIgnoreCase(t.getStatus()))
                .count();

        return ResponseEntity.ok(
                GenericApiResponse.success("Project Manager dashboard fetched",
                        java.util.Map.of(
                                "totalTeams", allTeams.size(),
                                "activeTeams", activeTeams
                        ))
        );
    }
}
