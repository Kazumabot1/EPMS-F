package com.epms.controller;

import com.epms.dto.AccountProvisionResult;
import com.epms.dto.GenericApiResponse;
import com.epms.dto.HrEmployeeAccountCreateRequest;
import com.epms.entity.Department;
import com.epms.entity.Position;
import com.epms.entity.Role;
import com.epms.entity.User;
import com.epms.entity.UserRole;
import com.epms.exception.BadRequestException;
import com.epms.repository.DepartmentRepository;
import com.epms.repository.PositionRepository;
import com.epms.repository.RoleRepository;
import com.epms.repository.UserRepository;
import com.epms.repository.UserRoleRepository;
import com.epms.service.HrEmployeeAccountService;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Comparator;
import java.util.Date;
import java.util.List;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserAccountController {

    private final HrEmployeeAccountService hrEmployeeAccountService;
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final UserRoleRepository userRoleRepository;
    private final DepartmentRepository departmentRepository;
    private final PositionRepository positionRepository;

    @GetMapping
    public ResponseEntity<GenericApiResponse<List<AdminUserAccountResponse>>> getUsers() {
        List<AdminUserAccountResponse> users = userRepository.findAll()
                .stream()
                .sorted(Comparator.comparing(
                        User::getCreatedAt,
                        Comparator.nullsLast(Comparator.reverseOrder())
                ))
                .map(this::toResponse)
                .toList();

        return ResponseEntity.ok(GenericApiResponse.success("Users fetched", users));
    }

    @PostMapping
    public ResponseEntity<GenericApiResponse<AdminUserAccountResponse>> createUser(
            @RequestBody HrEmployeeAccountCreateRequest request
    ) {
        AccountProvisionResult result = hrEmployeeAccountService.createOrUpdateEmployeeAccount(request);

        if (!result.isSuccess() || result.getUserId() == null) {
            AdminUserAccountResponse response = new AdminUserAccountResponse();
            response.setUserId(result.getUserId());
            response.setTemporaryPasswordEmailSent(result.isTemporaryPasswordEmailSent());
            response.setMessage(result.getMessage());
            response.setSmtpErrorDetail(result.getSmtpErrorDetail());

            return ResponseEntity.ok(
                    GenericApiResponse.success("Account processing failed", response)
            );
        }

        User user = userRepository.findById(result.getUserId())
                .orElseThrow(() -> new BadRequestException("User was created but could not be loaded"));

        AdminUserAccountResponse response = toResponse(user);
        response.setTemporaryPasswordEmailSent(result.isTemporaryPasswordEmailSent());
        response.setMessage(result.getMessage());
        response.setSmtpErrorDetail(result.getSmtpErrorDetail());

        return ResponseEntity.ok(
                GenericApiResponse.success("Account processed", response)
        );
    }

    @PutMapping("/{id}")
    public ResponseEntity<GenericApiResponse<AdminUserAccountResponse>> updateUser(
            @PathVariable Integer id,
            @RequestBody AdminUserAccountUpdateRequest request
    ) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new BadRequestException("User not found"));

        String email = cleanEmail(request.getEmail());

        if (email == null) {
            throw new BadRequestException("Email is required");
        }

        userRepository.findByEmail(email).ifPresent(existing -> {
            if (!existing.getId().equals(id)) {
                throw new BadRequestException("Email is already used by another user");
            }
        });

        String fullName = clean(request.getFullName());

        if (fullName == null) {
            throw new BadRequestException("Full name is required");
        }

        user.setFullName(fullName);
        user.setEmail(email);
        user.setEmployeeCode(clean(request.getEmployeeCode()));
        user.setDepartmentId(request.getDepartmentId());
        user.setActive(request.getActive() == null || request.getActive());
        user.setUpdatedAt(new Date());

        if (request.getPositionId() != null) {
            Position position = positionRepository.findById(request.getPositionId())
                    .orElseThrow(() -> new BadRequestException("Position not found"));
            user.setPosition(position);
        } else {
            user.setPosition(null);
        }

        user = userRepository.save(user);

        replaceUserRole(user.getId(), normalizeRoleName(request.getRoleName()));

        return ResponseEntity.ok(
                GenericApiResponse.success("User account updated", toResponse(user))
        );
    }

    @PostMapping("/{id}/resend-temporary-password")
    public ResponseEntity<GenericApiResponse<AccountProvisionResult>> resendTemporaryPassword(
            @PathVariable Integer id
    ) {
        AccountProvisionResult result = hrEmployeeAccountService.resendTemporaryPassword(id);

        String summary = result.isSuccess()
                ? "Onboarding email was accepted for delivery"
                : "Onboarding email could not be sent";

        return ResponseEntity.ok(GenericApiResponse.success(summary, result));
    }

    private AdminUserAccountResponse toResponse(User user) {
        AdminUserAccountResponse response = new AdminUserAccountResponse();

        response.setUserId(user.getId());
        response.setFullName(user.getFullName());
        response.setEmail(user.getEmail());
        response.setEmployeeCode(user.getEmployeeCode());
        response.setDepartmentId(user.getDepartmentId());
        response.setActive(user.getActive() == null || user.getActive());
        response.setAccountStatus(user.getAccountStatus());
        response.setMustChangePassword(Boolean.TRUE.equals(user.getMustChangePassword()));

        if (user.getDepartmentId() != null) {
            departmentRepository.findById(user.getDepartmentId())
                    .map(Department::getDepartmentName)
                    .ifPresent(response::setDepartmentName);
        }

        if (user.getPosition() != null) {
            response.setPositionId(user.getPosition().getId());
            response.setPositionName(user.getPosition().getPositionTitle());
        }

        List<UserRole> roles = userRoleRepository.findByUserId(user.getId());

        if (!roles.isEmpty()) {
            Integer roleId = roles.get(0).getRoleId();

            roleRepository.findById(roleId)
                    .map(Role::getName)
                    .map(this::normalizeRoleName)
                    .ifPresent(response::setRoleName);
        } else {
            response.setRoleName("EMPLOYEE");
        }

        return response;
    }

    private void replaceUserRole(Integer userId, String roleName) {
        if (userId == null) {
            return;
        }

        Role role = getOrCreateRole(roleName);

        List<UserRole> existingRoles = userRoleRepository.findByUserId(userId);

        if (!existingRoles.isEmpty()) {
            userRoleRepository.deleteAll(existingRoles);
        }

        UserRole userRole = new UserRole();
        userRole.setUserId(userId);
        userRole.setRoleId(role.getId());

        userRoleRepository.save(userRole);
    }

    private Role getOrCreateRole(String roleName) {
        String normalizedRole = normalizeRoleName(roleName);

        return roleRepository.findAll()
                .stream()
                .filter(role -> normalizeRoleName(role.getName()).equals(normalizedRole))
                .findFirst()
                .orElseGet(() -> {
                    Role role = new Role();
                    role.setName(normalizedRole);
                    role.setDescription("Auto-created by Admin user edit");
                    return roleRepository.save(role);
                });
    }

    private String normalizeRoleName(String roleName) {
        String value = clean(roleName);

        if (value == null) {
            return "EMPLOYEE";
        }

        String normalized = value
                .replaceFirst("(?i)^ROLE_", "")
                .replaceAll("[\\s-]+", "_")
                .trim()
                .toUpperCase();

        return switch (normalized) {
            case "PROJECT_MANAGER", "PROJECTMANAGER", "PM" -> "MANAGER";
            case "DEPARTMENTHEAD" -> "DEPARTMENT_HEAD";
            case "ADMIN" -> "ADMIN";
            case "HR" -> "HR";
            case "MANAGER" -> "MANAGER";
            case "DEPARTMENT_HEAD" -> "DEPARTMENT_HEAD";
            case "EXECUTIVE", "CEO" -> "EXECUTIVE";
            case "EMPLOYEE" -> "EMPLOYEE";
            default -> "EMPLOYEE";
        };
    }

    private String cleanEmail(String value) {
        String cleaned = clean(value);
        return cleaned == null ? null : cleaned.toLowerCase();
    }

    private String clean(String value) {
        if (value == null) {
            return null;
        }

        String cleaned = value.trim();

        if (cleaned.isEmpty()
                || cleaned.equalsIgnoreCase("null")
                || cleaned.equalsIgnoreCase("nil")
                || cleaned.equalsIgnoreCase("n/a")
                || cleaned.equals("-")) {
            return null;
        }

        return cleaned;
    }

    @Data
    public static class AdminUserAccountUpdateRequest {
        private String fullName;
        private String email;
        private String employeeCode;
        private Integer departmentId;
        private Integer positionId;
        private String roleName;
        private Boolean active;
    }

    @Data
    public static class AdminUserAccountResponse {
        private Integer userId;
        private String fullName;
        private String email;
        private String employeeCode;

        private Integer departmentId;
        private String departmentName;

        private Integer positionId;
        private String positionName;

        private String roleName;

        private Boolean active;
        private String accountStatus;
        private Boolean mustChangePassword;

        private Boolean temporaryPasswordEmailSent;
        private String message;
        private String smtpErrorDetail;
    }
}