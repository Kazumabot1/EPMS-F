package com.epms.security;

import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class DashboardResolver {

    public String resolveDashboard(List<String> roles, String position) {
        List<String> normalizedRoles = roles == null
                ? List.of()
                : roles.stream().map(this::normalizeRoleName).toList();

        String normalizedPosition = position == null ? "" : normalizeRoleName(position);

        if (hasRole(normalizedRoles, "ADMIN")) {
            return "ADMIN_DASHBOARD";
        }

        if (hasRole(normalizedRoles, "HR")) {
            return "HR_DASHBOARD";
        }

        if (hasRole(normalizedRoles, "CEO") || hasRole(normalizedRoles, "EXECUTIVE")) {
            return "EXECUTIVE_DASHBOARD";
        }

        if (hasRole(normalizedRoles, "DEPARTMENT_HEAD") || hasRole(normalizedRoles, "DEPARTMENTHEAD")) {
            return "DEPARTMENT_HEAD_DASHBOARD";
        }

        if (hasRole(normalizedRoles, "MANAGER")) {
            return "MANAGER_DASHBOARD";
        }

        /*
         * Job-title hints must run before the generic EMPLOYEE role rule.
         * Many HR accounts keep an EMPLOYEE (or similar) formal role while their title
         * indicates HR work; otherwise they incorrectly get EMPLOYEE_DASHBOARD and HR APIs
         * that rely on dashboard + roles may deny access.
         */
        if (normalizedPosition.contains("HR")) {
            return "HR_DASHBOARD";
        }

        if (normalizedPosition.contains("CEO") || normalizedPosition.contains("EXECUTIVE")) {
            return "EXECUTIVE_DASHBOARD";
        }

        if (
                normalizedPosition.contains("DEPARTMENT_HEAD") ||
                        normalizedPosition.contains("DEPARTMENTHEAD") ||
                        normalizedPosition.contains("HEAD")
        ) {
            return "DEPARTMENT_HEAD_DASHBOARD";
        }

        if (normalizedPosition.contains("MANAGER")) {
            return "MANAGER_DASHBOARD";
        }

        if (hasRole(normalizedRoles, "EMPLOYEE")) {
            return "EMPLOYEE_DASHBOARD";
        }

        return "EMPLOYEE_DASHBOARD";
    }

    private String normalizeRoleName(String value) {
        if (value == null) return "";

        return value
                .replaceFirst("(?i)^ROLE_", "")
                .trim()
                .replaceAll("[\\s-]+", "_")
                .toUpperCase();
    }

    private boolean hasRole(List<String> roles, String target) {
        return roles.stream().anyMatch(role -> role.equalsIgnoreCase(target));
    }
}