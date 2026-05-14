
package com.epms.service.auth;

import com.epms.exception.BadRequestException;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
public class PasswordPolicyService {

    public static final int MIN_LENGTH = 8;

    public boolean isStrong(String password) {
        return violations(password).isEmpty();
    }

    public void validateOrThrow(String password, String fieldName) {
        List<String> problems = violations(password);

        if (!problems.isEmpty()) {
            String label = fieldName == null || fieldName.isBlank() ? "Password" : fieldName;
            throw new BadRequestException(label + " is too weak. " + String.join(" ", problems));
        }
    }

    public List<String> violations(String password) {
        List<String> problems = new ArrayList<>();

        if (password == null || password.isBlank()) {
            problems.add("Password is required.");
            return problems;
        }

        if (password.length() < MIN_LENGTH) {
            problems.add("Use at least " + MIN_LENGTH + " characters.");
        }

        if (!password.matches(".*[A-Z].*")) {
            problems.add("Include at least 1 uppercase letter.");
        }

        if (!password.matches(".*[a-z].*")) {
            problems.add("Include at least 1 lowercase letter.");
        }

        if (!password.matches(".*[0-9].*")) {
            problems.add("Include at least 1 number.");
        }

        if (!password.matches(".*[^A-Za-z0-9].*")) {
            problems.add("Include at least 1 special character.");
        }

        if (password.matches(".*\\s.*")) {
            problems.add("Do not use spaces.");
        }

        return problems;
    }
}
