package com.epms.controller;

import com.epms.dto.EmployeeKpiResultDto;
import com.epms.service.EmployeeKpiWorkflowService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/employee/kpis")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
@PreAuthorize("isAuthenticated()")
public class EmployeeKpiController {

    private final EmployeeKpiWorkflowService employeeKpiWorkflowService;

    @GetMapping("/my-results")
    public ResponseEntity<List<EmployeeKpiResultDto>> myResults() {
        employeeKpiWorkflowService.runAutoFinalizePastDueAssignments();
        return ResponseEntity.ok(employeeKpiWorkflowService.listFinalizedForCurrentEmployee());
    }
}
