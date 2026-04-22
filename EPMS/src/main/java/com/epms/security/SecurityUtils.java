
package com.epms.security;

import lombok.Data;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

public final class SecurityUtils {

    private SecurityUtils() {
    }

    public static UserPrincipal currentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof UserPrincipal principal)) {
            throw new IllegalStateException("Authenticated user not available in security context");
        }
        return principal;
    }

    public static Integer currentUserId() {
        return currentUser().getId();
    }

    public static String currentUserEmail() {
        return currentUser().getUsername();
    }
}

