package com.epms.security;

import com.epms.entity.User;
import lombok.Getter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.ArrayList;
import java.util.Collection;
import java.util.List;

@Getter
public class UserPrincipal implements UserDetails {

    private final Integer id;
    private final String email;
    private final String password;
    private final boolean active;

    private final Integer managerId;
    private final Integer departmentId;

    private final String fullName;
    private final String employeeCode;
    private final String position;
    private final String dashboard;
    private final boolean mustChangePassword;

    private final List<String> roles;
    private final List<String> permissions;
    private final Collection<? extends GrantedAuthority> authorities;

    public UserPrincipal(User user, List<String> roles, List<String> permissions, String dashboard) {
        this.id = user.getId();
        this.email = user.getEmail();
        this.password = user.getPassword();
        this.active = user.getActive() == null || Boolean.TRUE.equals(user.getActive());

        this.managerId = user.getManagerId();
        this.departmentId = user.getDepartmentId();

        this.fullName = user.getFullName();
        this.employeeCode = user.getEmployeeCode();
        this.position = user.getPosition() != null ? user.getPosition().getPositionTitle() : null;

        this.roles = roles == null ? List.of() : roles;
        this.permissions = permissions == null ? List.of() : permissions;

        this.dashboard = dashboard;
        this.mustChangePassword = Boolean.TRUE.equals(user.getMustChangePassword());

        this.authorities = buildAuthorities(this.roles, this.permissions);
    }

    private Collection<? extends GrantedAuthority> buildAuthorities(List<String> roles, List<String> permissions) {
        List<SimpleGrantedAuthority> granted = new ArrayList<>();

        for (String role : roles) {
            String normalizedRole = normalizeAuthorityName(role);

            if (!normalizedRole.isBlank()) {
                granted.add(new SimpleGrantedAuthority("ROLE_" + normalizedRole));
            }
        }

        for (String permission : permissions) {
            String normalizedPermission = normalizeAuthorityName(permission);

            if (!normalizedPermission.isBlank()) {
                granted.add(new SimpleGrantedAuthority(normalizedPermission));
            }
        }

        return granted;
    }

    private String normalizeAuthorityName(String value) {
        if (value == null) {
            return "";
        }

        return value
                .replaceFirst("(?i)^ROLE_", "")
                .trim()
                .replaceAll("[^A-Za-z0-9]+", "_")
                .replaceAll("^_+|_+$", "")
                .toUpperCase();
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return authorities;
    }

    @Override
    public String getUsername() {
        return email;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return active;
    }
}