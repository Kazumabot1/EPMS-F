/*
package com.epms.security;

import com.epms.entity.Permission;
import com.epms.entity.Role;
import com.epms.entity.RolePermission;
import com.epms.entity.User;
import com.epms.entity.UserRole;
import com.epms.repository.PermissionRepository;
import com.epms.repository.RolePermissionRepository;
import com.epms.repository.RoleRepository;
import com.epms.repository.UserRepository;
import com.epms.repository.UserRoleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;
    private final UserRoleRepository userRoleRepository;
    private final RoleRepository roleRepository;
    private final RolePermissionRepository rolePermissionRepository;
    private final PermissionRepository permissionRepository;
    private final DashboardResolver dashboardResolver;

    @Override
    @Transactional(readOnly = true)
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        String email = username == null ? "" : username.trim();

        User user = userRepository.findActiveByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("Active user not found with email: " + email));

        List<UserRole> userRoles = userRoleRepository.findByUserId(user.getId());

        List<Integer> roleIds = userRoles.stream()
                .map(UserRole::getRoleId)
                .distinct()
                .toList();

        List<Role> roles = roleIds.isEmpty()
                ? List.of()
                : roleRepository.findAllById(roleIds);

        List<RolePermission> rolePermissions = roleIds.isEmpty()
                ? List.of()
                : rolePermissionRepository.findByRoleIdIn(roleIds);

        List<Integer> permissionIds = rolePermissions.stream()
                .map(RolePermission::getPermissionId)
                .distinct()
                .toList();

        List<Permission> permissions = permissionIds.isEmpty()
                ? List.of()
                : permissionRepository.findAllById(permissionIds);

        Set<String> roleNames = new LinkedHashSet<>();

        roles.forEach(role -> {
            String normalized = normalizeRoleName(role.getName());

            if (!normalized.isBlank()) {
                roleNames.add(normalized);
            }
        });

        String positionTitle = user.getPosition() != null
                ? user.getPosition().getPositionTitle()
                : null;

        String dashboard = dashboardResolver.resolveDashboard(
                roleNames.stream().toList(),
                positionTitle
        );

        if (roleNames.isEmpty()) {
            roleNames.add(roleFromDashboard(dashboard));
        }

        Set<String> permissionNames = new LinkedHashSet<>();

        permissions.forEach(permission -> {
            if (permission.getName() != null && !permission.getName().isBlank()) {
                permissionNames.add(permission.getName());
            }
        });

        return new UserPrincipal(
                user,
                roleNames.stream().toList(),
                permissionNames.stream().toList(),
                dashboard
        );
    }

    private String roleFromDashboard(String dashboard) {
        if (dashboard == null || dashboard.isBlank()) {
            return "EMPLOYEE";
        }

        return switch (dashboard) {
            case "ADMIN_DASHBOARD" -> "ADMIN";
            case "HR_DASHBOARD" -> "HR";
            case "MANAGER_DASHBOARD" -> "MANAGER";
            case "DEPARTMENT_HEAD_DASHBOARD" -> "DEPARTMENT_HEAD";
            case "EXECUTIVE_DASHBOARD" -> "EXECUTIVE";
            case "EMPLOYEE_DASHBOARD" -> "EMPLOYEE";
            default -> "EMPLOYEE";
        };
    }

    private String normalizeRoleName(String role) {
        if (role == null) {
            return "";
        }

        String normalized = role
                .replaceFirst("(?i)^ROLE_", "")
                .trim()
                .replaceAll("[^A-Za-z0-9]+", "_")
                .replaceAll("^_+|_+$", "")
                .toUpperCase();

        if (normalized.equals("DEPARTMENTHEAD")) {
            return "DEPARTMENT_HEAD";
        }

        return normalized;
    }
}*/







/*
package com.epms.security;

import com.epms.entity.Permission;
import com.epms.entity.Role;
import com.epms.entity.User;
import com.epms.exception.ResourceNotFoundException;
import com.epms.repository.RolePermissionRepository;
import com.epms.repository.UserRepository;
import com.epms.repository.UserRoleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;
    private final UserRoleRepository userRoleRepository;
    private final RolePermissionRepository rolePermissionRepository;

    @Override
    public UserPrincipal loadUserByUsername(String username) {
        User user = userRepository.findByEmailIgnoreCase(username)
                .orElseThrow(() -> new ResourceNotFoundException("Invalid email or password"));

        if (Boolean.FALSE.equals(user.getActive())) {
            throw new DisabledException("This account is inactive for now. Please contact the HR or Admin to verify!");
        }

        List<Role> roles = userRoleRepository.findRolesByUserId(user.getId()).stream()
                .filter(role -> role.getActive() == null || Boolean.TRUE.equals(role.getActive()))
                .toList();

        List<String> roleNames = roles.stream()
                .map(Role::getName)
                .toList();

        List<String> permissions = roles.stream()
                .flatMap(role -> rolePermissionRepository.findByRoleId(role.getId()).stream())
                .map(rolePermission -> rolePermission.getPermission())
                .map(Permission::getName)
                .distinct()
                .toList();

        String normalizedRole = roleNames.stream()
                .map(this::normalize)
                .findFirst()
                .orElse("");

        String normalizedPosition = normalize(user.getPosition());
        String dashboard = resolveDashboard(normalizedRole, normalizedPosition, permissions);

        List<String> authorities = new ArrayList<>();
        authorities.addAll(roleNames);
        authorities.addAll(permissions);

        return UserPrincipal.builder()
                .id(user.getId())
                .username(user.getEmail())
                .password(user.getPassword())
                .fullName(user.getFullName())
                .employeeCode(user.getEmployeeCode())
                .position(user.getPosition())
                .roles(roleNames)
                .permissions(permissions)
                .dashboard(dashboard)
                .mustChangePassword(Boolean.TRUE.equals(user.getMustChangePassword()))
                .authorities(authorities)
                .build();
    }

    private String resolveDashboard(String normalizedRole, String normalizedPosition, List<String> permissions) {
        if (normalizedRole.equals("ADMIN")) {
            return "ADMIN_DASHBOARD";
        }

        if (isHrLike(normalizedRole) || isHrLike(normalizedPosition)) {
            return "HR_DASHBOARD";
        }

        if (
                normalizedRole.equals("DEPARTMENT_HEAD")
                        || normalizedRole.equals("DEPARTMENTHEAD")
                        || normalizedPosition.equals("DEPARTMENT_HEAD")
                        || normalizedPosition.equals("DEPARTMENTHEAD")
                        || normalizedPosition.contains("HEAD")
        ) {
            return "DEPARTMENT_HEAD_DASHBOARD";
        }

        if (normalizedRole.equals("MANAGER") || normalizedPosition.contains("MANAGER")) {
            return "MANAGER_DASHBOARD";
        }

        if (
                normalizedRole.equals("CEO")
                        || normalizedRole.equals("EXECUTIVE")
                        || normalizedPosition.equals("CEO")
                        || normalizedPosition.contains("EXECUTIVE")
        ) {
            return "EXECUTIVE_DASHBOARD";
        }

        if (permissions != null && permissions.stream().anyMatch(permission -> normalize(permission).contains("APPRAISAL"))) {
            return "EMPLOYEE_DASHBOARD";
        }

        return "EMPLOYEE_DASHBOARD";
    }

    private boolean isHrLike(String value) {
        if (value == null || value.isBlank()) {
            return false;
        }

        return value.equals("HR")
                || value.equals("HUMAN_RESOURCE")
                || value.equals("HUMAN_RESOURCES")
                || value.equals("HR_MANAGER")
                || value.equals("HR_ADMIN")
                || value.equals("PEOPLE")
                || value.equals("PEOPLE_OPS")
                || value.equals("TALENT")
                || value.contains("_HR")
                || value.contains("HR_")
                || value.contains("HUMAN_RESOURCE")
                || value.contains("HUMAN_RESOURCES")
                || value.contains("PEOPLE")
                || value.contains("TALENT");
    }

    private String normalize(String value) {
        if (value == null) {
            return "";
        }

        return value
                .replaceFirst("(?i)^ROLE_", "")
                .trim()
                .replaceAll("[^A-Za-z0-9]+", "_")
                .replaceAll("^_+|_+$", "")
                .toUpperCase(Locale.ROOT);
    }
}*/










package com.epms.security;

import com.epms.entity.Permission;
import com.epms.entity.Role;
import com.epms.entity.RolePermission;
import com.epms.entity.User;
import com.epms.entity.UserRole;
import com.epms.repository.PermissionRepository;
import com.epms.repository.RolePermissionRepository;
import com.epms.repository.RoleRepository;
import com.epms.repository.UserRepository;
import com.epms.repository.UserRoleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;
    private final UserRoleRepository userRoleRepository;
    private final RoleRepository roleRepository;
    private final RolePermissionRepository rolePermissionRepository;
    private final PermissionRepository permissionRepository;
    private final DashboardResolver dashboardResolver;

    @Override
    @Transactional(readOnly = true)
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        String email = username == null ? "" : username.trim();

        User user = userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new UsernameNotFoundException("User not found with email: " + email));

        if (Boolean.FALSE.equals(user.getActive())) {
            throw new DisabledException("This account is inactive for now. Please contact the HR or Admin to verify!");
        }

        List<UserRole> userRoles = userRoleRepository.findByUserId(user.getId());

        List<Integer> roleIds = userRoles.stream()
                .map(UserRole::getRoleId)
                .distinct()
                .toList();

        List<Role> roles = roleIds.isEmpty()
                ? List.of()
                : roleRepository.findAllById(roleIds)
                .stream()
                .filter(role -> role.getActive() == null || Boolean.TRUE.equals(role.getActive()))
                .toList();

        List<Integer> activeRoleIds = roles.stream()
                .map(Role::getId)
                .distinct()
                .toList();

        List<RolePermission> rolePermissions = activeRoleIds.isEmpty()
                ? List.of()
                : rolePermissionRepository.findByRoleIdIn(activeRoleIds);

        List<Integer> permissionIds = rolePermissions.stream()
                .map(RolePermission::getPermissionId)
                .distinct()
                .toList();

        List<Permission> permissions = permissionIds.isEmpty()
                ? List.of()
                : permissionRepository.findAllById(permissionIds);

        Set<String> roleNames = new LinkedHashSet<>();

        roles.forEach(role -> {
            String normalized = normalizeRoleName(role.getName());

            if (!normalized.isBlank()) {
                roleNames.add(normalized);
            }
        });

        String positionTitle = user.getPosition() != null
                ? user.getPosition().getPositionTitle()
                : null;

        String dashboard = dashboardResolver.resolveDashboard(
                roleNames.stream().toList(),
                positionTitle
        );

        if (roleNames.isEmpty()) {
            roleNames.add(roleFromDashboard(dashboard));
        }

        Set<String> permissionNames = new LinkedHashSet<>();

        permissions.forEach(permission -> {
            if (permission.getName() != null && !permission.getName().isBlank()) {
                permissionNames.add(permission.getName());
            }
        });

        return new UserPrincipal(
                user,
                roleNames.stream().toList(),
                permissionNames.stream().toList(),
                dashboard
        );
    }

    private String roleFromDashboard(String dashboard) {
        if (dashboard == null || dashboard.isBlank()) {
            return "EMPLOYEE";
        }

        return switch (dashboard) {
            case "ADMIN_DASHBOARD" -> "ADMIN";
            case "HR_DASHBOARD" -> "HR";
            case "MANAGER_DASHBOARD" -> "MANAGER";
            case "DEPARTMENT_HEAD_DASHBOARD" -> "DEPARTMENT_HEAD";
            case "EXECUTIVE_DASHBOARD" -> "EXECUTIVE";
            case "EMPLOYEE_DASHBOARD" -> "EMPLOYEE";
            default -> "EMPLOYEE";
        };
    }

    private String normalizeRoleName(String role) {
        if (role == null) {
            return "";
        }

        String normalized = role
                .replaceFirst("(?i)^ROLE_", "")
                .trim()
                .replaceAll("[^A-Za-z0-9]+", "_")
                .replaceAll("^_+|_+$", "")
                .toUpperCase();

        if (normalized.equals("DEPARTMENTHEAD")) {
            return "DEPARTMENT_HEAD";
        }

        return normalized;
    }
}


