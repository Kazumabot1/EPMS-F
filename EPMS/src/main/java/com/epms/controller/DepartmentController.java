/*
package com.epms.controller;

import com.epms.dto.DepartmentRequestDto;
import com.epms.dto.DepartmentResponseDto;
import com.epms.dto.GenericApiResponse;
import com.epms.entity.Department;
import com.epms.exception.BadRequestException;
import com.epms.exception.DuplicateResourceException;
import com.epms.exception.ResourceNotFoundException;
import com.epms.repository.DepartmentRepository;
import com.epms.security.SecurityUtils;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Comparator;
import java.util.Date;
import java.util.List;

@RestController
@RequestMapping("/api/departments")
@RequiredArgsConstructor
public class DepartmentController {

    private final DepartmentRepository departmentRepository;

    @GetMapping
    public ResponseEntity<GenericApiResponse<List<DepartmentResponseDto>>> getAllDepartments() {
        List<DepartmentResponseDto> departments = departmentRepository.findAll()
                .stream()
                .sorted(Comparator.comparing(Department::getDepartmentName, String.CASE_INSENSITIVE_ORDER))
                .map(this::toResponse)
                .toList();

        return ResponseEntity.ok(
                GenericApiResponse.success("Departments fetched", departments)
        );
    }

    @PostMapping
    public ResponseEntity<GenericApiResponse<DepartmentResponseDto>> createDepartment(
            @Valid @RequestBody DepartmentRequestDto request
    ) {
        String name = normalizeRequired(request.getDepartmentName(), "Department name is required");
        String code = normalizeOptional(request.getDepartmentCode());

        ensureNameAvailable(name, null);
        ensureCodeAvailable(code, null);

        Department department = new Department();
        department.setDepartmentName(name);
        department.setDepartmentCode(code);
        department.setHeadEmployee(normalizeOptional(request.getHeadEmployee()));
        department.setStatus(request.getStatus() == null ? true : request.getStatus());
        department.setCreatedAt(new Date());
        department.setCreatedBy(currentUsername());

        Department saved = saveDepartment(department);

        return ResponseEntity.ok(
                GenericApiResponse.success("Department created", toResponse(saved))
        );
    }

    @PutMapping("/{id}")
    public ResponseEntity<GenericApiResponse<DepartmentResponseDto>> updateDepartment(
            @PathVariable Integer id,
            @Valid @RequestBody DepartmentRequestDto request
    ) {
        Department department = departmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Department not found"));

        String name = normalizeRequired(request.getDepartmentName(), "Department name is required");
        String code = normalizeOptional(request.getDepartmentCode());

        ensureNameAvailable(name, id);
        ensureCodeAvailable(code, id);

        department.setDepartmentName(name);
        department.setDepartmentCode(code);
        department.setHeadEmployee(normalizeOptional(request.getHeadEmployee()));
        if (request.getStatus() != null) {
            department.setStatus(request.getStatus());
        }

        Department saved = saveDepartment(department);

        return ResponseEntity.ok(
                GenericApiResponse.success("Department updated", toResponse(saved))
        );
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<GenericApiResponse<Void>> deleteDepartment(@PathVariable Integer id) {
        Department department = departmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Department not found"));

        department.setStatus(false);
        saveDepartment(department);

        return ResponseEntity.ok(
                GenericApiResponse.success("Department deactivated", null)
        );
    }

    private Department saveDepartment(Department department) {
        try {
            return departmentRepository.save(department);
        } catch (DataIntegrityViolationException ex) {
            throw new DuplicateResourceException("Department name or code already exists");
        }
    }

    private void ensureNameAvailable(String name, Integer currentId) {
        departmentRepository.findByDepartmentNameIgnoreCase(name)
                .filter(existing -> currentId == null || !existing.getId().equals(currentId))
                .ifPresent(existing -> {
                    throw new DuplicateResourceException("Department name already exists");
                });
    }

    private void ensureCodeAvailable(String code, Integer currentId) {
        if (code == null) {
            return;
        }
        departmentRepository.findByDepartmentCodeIgnoreCase(code)
                .filter(existing -> currentId == null || !existing.getId().equals(currentId))
                .ifPresent(existing -> {
                    throw new DuplicateResourceException("Department code already exists");
                });
    }

    private DepartmentResponseDto toResponse(Department d) {
        return DepartmentResponseDto.builder()
                .id(d.getId())
                .departmentName(d.getDepartmentName())
                .departmentCode(d.getDepartmentCode())
                .headEmployee(d.getHeadEmployee())
                .status(d.getStatus())
                .createdAt(d.getCreatedAt())
                .createdBy(d.getCreatedBy())
                .build();
    }

    private String normalizeRequired(String value, String message) {
        String normalized = normalizeOptional(value);
        if (normalized == null) {
            throw new BadRequestException(message);
        }
        return normalized;
    }

    private String normalizeOptional(String value) {
        if (value == null) {
            return null;
        }
        String normalized = value.trim();
        return normalized.isEmpty() ? null : normalized;
    }

    private String currentUsername() {
        try {
            return SecurityUtils.currentUser().getUsername();
        } catch (Exception ignored) {
            return "system";
        }
    }
}
*/










package com.epms.controller;

import com.epms.dto.AuditReasonRequest;
import com.epms.dto.DepartmentRequestDto;
import com.epms.dto.DepartmentResponseDto;
import com.epms.dto.GenericApiResponse;
import com.epms.entity.Department;
import com.epms.exception.BadRequestException;
import com.epms.exception.DuplicateResourceException;
import com.epms.exception.ResourceNotFoundException;
import com.epms.repository.DepartmentRepository;
import com.epms.security.SecurityUtils;
import com.epms.service.AuditLogService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Comparator;
import java.util.Date;
import java.util.List;
import java.util.Objects;

@RestController
@RequestMapping("/api/departments")
@RequiredArgsConstructor
public class DepartmentController {

    private static final String ENTITY_TYPE = "DEPARTMENT";

    private final DepartmentRepository departmentRepository;
    private final AuditLogService auditLogService;

    @GetMapping
    public ResponseEntity<GenericApiResponse<List<DepartmentResponseDto>>> getAllDepartments() {
        List<DepartmentResponseDto> departments = departmentRepository.findAll()
                .stream()
                .sorted(Comparator.comparing(Department::getDepartmentName, String.CASE_INSENSITIVE_ORDER))
                .map(this::toResponse)
                .toList();

        return ResponseEntity.ok(GenericApiResponse.success("Departments fetched", departments));
    }

    @PostMapping
    public ResponseEntity<GenericApiResponse<DepartmentResponseDto>> createDepartment(
            @Valid @RequestBody DepartmentRequestDto request
    ) {
        String name = normalizeRequired(request.getDepartmentName(), "Department name is required");
        String code = normalizeOptional(request.getDepartmentCode());

        ensureNameAvailable(name, null);
        ensureCodeAvailable(code, null);

        Department department = new Department();
        department.setDepartmentName(name);
        department.setDepartmentCode(code);
        department.setHeadEmployee(normalizeOptional(request.getHeadEmployee()));
        department.setStatus(request.getStatus() == null ? true : request.getStatus());
        department.setCreatedAt(new Date());
        department.setCreatedBy(currentUsername());

        Department saved = saveDepartment(department);

        return ResponseEntity.ok(GenericApiResponse.success("Department created", toResponse(saved)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<GenericApiResponse<DepartmentResponseDto>> updateDepartment(
            @PathVariable Integer id,
            @Valid @RequestBody DepartmentRequestDto request
    ) {
        Department department = departmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Department not found"));

        String name = normalizeRequired(request.getDepartmentName(), "Department name is required");
        String code = normalizeOptional(request.getDepartmentCode());
        String headEmployee = normalizeOptional(request.getHeadEmployee());
        Boolean status = request.getStatus() == null ? department.getStatus() : request.getStatus();

        ensureNameAvailable(name, id);
        ensureCodeAvailable(code, id);

        boolean changed = !Objects.equals(department.getDepartmentName(), name)
                || !Objects.equals(department.getDepartmentCode(), code)
                || !Objects.equals(department.getHeadEmployee(), headEmployee)
                || !Objects.equals(activeValue(department.getStatus()), activeValue(status));

        String reason = normalizeReason(request.getReason(), changed);

        String oldName = department.getDepartmentName();
        String oldCode = department.getDepartmentCode();
        String oldHead = department.getHeadEmployee();
        Boolean oldStatus = department.getStatus();

        department.setDepartmentName(name);
        department.setDepartmentCode(code);
        department.setHeadEmployee(headEmployee);
        department.setStatus(status);

        Department saved = saveDepartment(department);

        Integer currentUserId = currentUserId();
        logIfChanged(currentUserId, saved.getId(), "departmentName", oldName, saved.getDepartmentName(), reason);
        logIfChanged(currentUserId, saved.getId(), "departmentCode", oldCode, saved.getDepartmentCode(), reason);
        logIfChanged(currentUserId, saved.getId(), "headEmployee", oldHead, saved.getHeadEmployee(), reason);
        logIfChanged(currentUserId, saved.getId(), "status", activeText(oldStatus), activeText(saved.getStatus()), reason);

        return ResponseEntity.ok(GenericApiResponse.success("Department updated", toResponse(saved)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<GenericApiResponse<Void>> deleteDepartment(
            @PathVariable Integer id,
            @RequestBody(required = false) AuditReasonRequest request
    ) {
        Department department = departmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Department not found"));

        if (Boolean.FALSE.equals(department.getStatus())) {
            throw new BadRequestException("Department is already inactive.");
        }

        String reason = normalizeReason(request != null ? request.getReason() : null, true);
        Boolean oldStatus = department.getStatus();

        department.setStatus(false);
        saveDepartment(department);

        auditLogService.log(currentUserId(), "DEACTIVATE", ENTITY_TYPE, id, "status", activeText(oldStatus), "Inactive", reason);

        return ResponseEntity.ok(GenericApiResponse.success("Department deactivated", null));
    }

    private Department saveDepartment(Department department) {
        try {
            return departmentRepository.save(department);
        } catch (DataIntegrityViolationException ex) {
            throw new DuplicateResourceException("Department name or code already exists");
        }
    }

    private void ensureNameAvailable(String name, Integer currentId) {
        departmentRepository.findByDepartmentNameIgnoreCase(name)
                .filter(existing -> currentId == null || !existing.getId().equals(currentId))
                .ifPresent(existing -> {
                    throw new DuplicateResourceException("Department name already exists");
                });
    }

    private void ensureCodeAvailable(String code, Integer currentId) {
        if (code == null) {
            return;
        }
        departmentRepository.findByDepartmentCodeIgnoreCase(code)
                .filter(existing -> currentId == null || !existing.getId().equals(currentId))
                .ifPresent(existing -> {
                    throw new DuplicateResourceException("Department code already exists");
                });
    }

    private DepartmentResponseDto toResponse(Department d) {
        return DepartmentResponseDto.builder()
                .id(d.getId())
                .departmentName(d.getDepartmentName())
                .departmentCode(d.getDepartmentCode())
                .headEmployee(d.getHeadEmployee())
                .status(d.getStatus())
                .createdAt(d.getCreatedAt())
                .createdBy(d.getCreatedBy())
                .build();
    }

    private void logIfChanged(Integer userId, Integer entityId, String column, String oldValue, String newValue, String reason) {
        if (!Objects.equals(valueOrBlank(oldValue), valueOrBlank(newValue))) {
            auditLogService.log(userId, "UPDATE", ENTITY_TYPE, entityId, column, oldValue, newValue, reason);
        }
    }

    private String normalizeRequired(String value, String message) {
        String normalized = normalizeOptional(value);
        if (normalized == null) {
            throw new BadRequestException(message);
        }
        return normalized;
    }

    private String normalizeOptional(String value) {
        if (value == null) {
            return null;
        }
        String normalized = value.trim();
        return normalized.isEmpty() ? null : normalized;
    }

    private String normalizeReason(String reason, boolean required) {
        String normalized = normalizeOptional(reason);
        if (required && normalized == null) {
            throw new BadRequestException("Reason is required for edit or deactivate.");
        }
        if (normalized != null && normalized.length() > 150) {
            throw new BadRequestException("Reason must not exceed 150 characters.");
        }
        return normalized;
    }

    private String currentUsername() {
        try {
            return SecurityUtils.currentUser().getUsername();
        } catch (Exception ignored) {
            return "system";
        }
    }

    private Integer currentUserId() {
        try {
            return SecurityUtils.currentUserId();
        } catch (Exception ignored) {
            return null;
        }
    }

    private Boolean activeValue(Boolean value) {
        return value == null || Boolean.TRUE.equals(value);
    }

    private String activeText(Boolean value) {
        return activeValue(value) ? "Active" : "Inactive";
    }

    private String valueOrBlank(String value) {
        return value == null ? "" : value;
    }
}
