/*
package com.epms.controller;

import com.epms.dto.EmployeeDropdownDto;
import com.epms.dto.EmployeeRequestDto;
import com.epms.dto.EmployeeResponseDto;
import com.epms.dto.GenericApiResponse;
import com.epms.repository.EmployeeDepartmentRepository;
import com.epms.service.EmployeeService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

*/
/**
 * Why this file is changed:
 * - 1:1 Meetings still sends selected departmentId.
 * - Backend now finds employees by working department id:
 *     parentdepartment if not null
 *     otherwise currentdepartment
 *//*

@RestController
@RequestMapping("/api/employees")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class EmployeeController {

    private final EmployeeService employeeService;
    private final EmployeeDepartmentRepository employeeDepartmentRepository;

    @GetMapping
    public ResponseEntity<GenericApiResponse<List<EmployeeResponseDto>>> getAllEmployees(
            @RequestParam(defaultValue = "false") boolean includeInactive
    ) {
        List<EmployeeResponseDto> employees = employeeService.getAllEmployees(includeInactive);
        return ResponseEntity.ok(GenericApiResponse.success("Employees fetched", employees));
    }

    @GetMapping("/{id}")
    public ResponseEntity<GenericApiResponse<EmployeeResponseDto>> getEmployeeById(@PathVariable Integer id) {
        EmployeeResponseDto dto = employeeService.getEmployeeById(id);
        return ResponseEntity.ok(GenericApiResponse.success("Employee fetched", dto));
    }

    */
/**
     * Used by 1:1 Meetings employee dropdown.
     *//*

    @GetMapping("/active-by-department/{departmentId}")
    public ResponseEntity<GenericApiResponse<List<EmployeeDropdownDto>>> getActiveByDepartment(
            @PathVariable Integer departmentId
    ) {
        List<EmployeeDropdownDto> employees = employeeDepartmentRepository
                .findActiveAssignmentsByWorkingDepartmentId(departmentId)
                .stream()
                .map(ed -> {
                    EmployeeDropdownDto dto = new EmployeeDropdownDto();
                    dto.setId(ed.getEmployee().getId());
                    dto.setFirstName(ed.getEmployee().getFirstName());
                    dto.setLastName(ed.getEmployee().getLastName());
                    return dto;
                })
                .collect(Collectors.collectingAndThen(
                        Collectors.toMap(
                                EmployeeDropdownDto::getId,
                                dto -> dto,
                                (first, second) -> first
                        ),
                        map -> map.values()
                                .stream()
                                .sorted(Comparator.comparing(
                                        dto -> ((dto.getFirstName() == null ? "" : dto.getFirstName()) + " "
                                                + (dto.getLastName() == null ? "" : dto.getLastName())).trim(),
                                        String.CASE_INSENSITIVE_ORDER
                                ))
                                .toList()
                ));

        return ResponseEntity.ok(GenericApiResponse.success("Active employees fetched", employees));
    }

    @PostMapping
    public ResponseEntity<GenericApiResponse<EmployeeResponseDto>> createEmployee(
            @Valid @RequestBody EmployeeRequestDto request
    ) {
        EmployeeResponseDto created = employeeService.createEmployee(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(GenericApiResponse.success("Employee created", created));
    }

    @PutMapping("/{id}")
    public ResponseEntity<GenericApiResponse<EmployeeResponseDto>> updateEmployee(
            @PathVariable Integer id,
            @Valid @RequestBody EmployeeRequestDto request
    ) {
        EmployeeResponseDto updated = employeeService.updateEmployee(id, request);
        return ResponseEntity.ok(GenericApiResponse.success("Employee updated", updated));
    }

    @PatchMapping("/{id}/deactivate")
    public ResponseEntity<GenericApiResponse<EmployeeResponseDto>> deactivateEmployee(@PathVariable Integer id) {
        EmployeeResponseDto dto = employeeService.deactivateEmployee(id);
        return ResponseEntity.ok(GenericApiResponse.success("Employee deactivated", dto));
    }
}*/






package com.epms.controller;

import com.epms.dto.EmployeeDepartmentTransferPreviewDto;
import com.epms.dto.EmployeeDropdownDto;
import com.epms.dto.EmployeeRequestDto;
import com.epms.dto.EmployeeResponseDto;
import com.epms.dto.GenericApiResponse;
import com.epms.repository.EmployeeDepartmentRepository;
import com.epms.service.EmployeeService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/employees")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class EmployeeController {

    private final EmployeeService employeeService;
    private final EmployeeDepartmentRepository employeeDepartmentRepository;

    @GetMapping
    public ResponseEntity<GenericApiResponse<List<EmployeeResponseDto>>> getAllEmployees(
            @RequestParam(defaultValue = "false") boolean includeInactive
    ) {
        List<EmployeeResponseDto> employees = employeeService.getAllEmployees(includeInactive);
        return ResponseEntity.ok(GenericApiResponse.success("Employees fetched", employees));
    }

    @GetMapping("/{id}")
    public ResponseEntity<GenericApiResponse<EmployeeResponseDto>> getEmployeeById(@PathVariable Integer id) {
        EmployeeResponseDto dto = employeeService.getEmployeeById(id);
        return ResponseEntity.ok(GenericApiResponse.success("Employee fetched", dto));
    }

    @GetMapping("/{id}/department-transfer-preview")
    public ResponseEntity<GenericApiResponse<EmployeeDepartmentTransferPreviewDto>> previewDepartmentTransfer(
            @PathVariable Integer id,
            @RequestParam(required = false) Integer currentDepartmentId,
            @RequestParam(required = false) Integer parentDepartmentId
    ) {
        EmployeeDepartmentTransferPreviewDto dto = employeeService.previewDepartmentTransfer(
                id,
                currentDepartmentId,
                parentDepartmentId
        );

        return ResponseEntity.ok(GenericApiResponse.success("Department transfer preview fetched", dto));
    }

    /**
     * Used by 1:1 Meetings employee dropdown.
     * Uses working department: parentDepartment if present, otherwise currentDepartment.
     */
    @GetMapping("/active-by-department/{departmentId}")
    public ResponseEntity<GenericApiResponse<List<EmployeeDropdownDto>>> getActiveByDepartment(
            @PathVariable Integer departmentId
    ) {
        List<EmployeeDropdownDto> employees = employeeDepartmentRepository
                .findActiveAssignmentsByWorkingDepartmentId(departmentId)
                .stream()
                .map(ed -> {
                    EmployeeDropdownDto dto = new EmployeeDropdownDto();
                    dto.setId(ed.getEmployee().getId());
                    dto.setFirstName(ed.getEmployee().getFirstName());
                    dto.setLastName(ed.getEmployee().getLastName());
                    return dto;
                })
                .collect(Collectors.collectingAndThen(
                        Collectors.toMap(
                                EmployeeDropdownDto::getId,
                                dto -> dto,
                                (first, second) -> first
                        ),
                        map -> map.values()
                                .stream()
                                .sorted(Comparator.comparing(
                                        dto -> ((dto.getFirstName() == null ? "" : dto.getFirstName()) + " "
                                                + (dto.getLastName() == null ? "" : dto.getLastName())).trim(),
                                        String.CASE_INSENSITIVE_ORDER
                                ))
                                .toList()
                ));

        return ResponseEntity.ok(GenericApiResponse.success("Active employees fetched", employees));
    }

    @PostMapping
    public ResponseEntity<GenericApiResponse<EmployeeResponseDto>> createEmployee(
            @Valid @RequestBody EmployeeRequestDto request
    ) {
        EmployeeResponseDto created = employeeService.createEmployee(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(GenericApiResponse.success("Employee created", created));
    }

    @PutMapping("/{id}")
    public ResponseEntity<GenericApiResponse<EmployeeResponseDto>> updateEmployee(
            @PathVariable Integer id,
            @Valid @RequestBody EmployeeRequestDto request
    ) {
        EmployeeResponseDto updated = employeeService.updateEmployee(id, request);
        return ResponseEntity.ok(GenericApiResponse.success("Employee updated", updated));
    }

    @PatchMapping("/{id}/deactivate")
    public ResponseEntity<GenericApiResponse<EmployeeResponseDto>> deactivateEmployee(@PathVariable Integer id) {
        EmployeeResponseDto dto = employeeService.deactivateEmployee(id);
        return ResponseEntity.ok(GenericApiResponse.success("Employee deactivated", dto));
    }
}