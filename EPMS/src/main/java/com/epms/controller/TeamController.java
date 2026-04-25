package com.epms.controller;

import com.epms.dto.CandidateResponseDto;
import com.epms.dto.GenericApiResponse;
import com.epms.dto.TeamRequestDto;
import com.epms.dto.TeamResponseDto;
import com.epms.service.TeamService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
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
