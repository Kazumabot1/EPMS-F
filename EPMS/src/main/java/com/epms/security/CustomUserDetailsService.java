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

        /*
         * Important fix:
         * Some HR-created/imported employees have no user_roles row.
         * Without this fallback, Spring creates a logged-in user with no
         * ROLE_EMPLOYEE authority, and employee APIs return 403.
         */
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
            case "MANAGER_DASHBOARD", "PROJECT_MANAGER_DASHBOARD" -> "MANAGER";
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

        if (normalized.equals("PROJECT_MANAGER") || normalized.equals("PROJECTMANAGER")) {
            return "MANAGER";
        }

        if (normalized.equals("DEPARTMENTHEAD")) {
            return "DEPARTMENT_HEAD";
        }

        return normalized;
    }
}