/*
package com.epms.service;

import com.epms.entity.Employee;
import com.epms.entity.User;
import com.epms.exception.DuplicateResourceException;
import com.epms.repository.EmployeeRepository;
import com.epms.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
public class NameValidationService {

    private static final Pattern TRAILING_NUMBER_PATTERN = Pattern.compile("^(.*?)(?:\\s+(\\d+))?$");

    private final EmployeeRepository employeeRepository;
    private final UserRepository userRepository;

    public void validateEmployeeNameAvailable(String firstName, String lastName, Integer currentEmployeeId) {
        String baseName = normalizeFullName(firstName, lastName);

        if (baseName.isBlank()) {
            return;
        }

        boolean duplicate = employeeRepository.findAll().stream()
                .filter(employee -> currentEmployeeId == null || !employee.getId().equals(currentEmployeeId))
                .map(this::employeeFullName)
                .map(this::normalizeSpaces)
                .anyMatch(existingName -> namesEqual(existingName, baseName))
                || userRepository.findAll().stream()
                .filter(user -> currentEmployeeId == null || user.getEmployeeId() == null || !user.getEmployeeId().equals(currentEmployeeId))
                .map(User::getFullName)
                .map(this::normalizeSpaces)
                .anyMatch(existingName -> namesEqual(existingName, baseName));

        if (!duplicate) {
            return;
        }

        String suggestion = suggestNextName(baseName, currentEmployeeId);

        throw new DuplicateResourceException(
                "Name already exists. Please use something like this \"" + suggestion + "\"."
        );
    }

    private String suggestNextName(String baseName, Integer currentEmployeeId) {
        String normalizedBase = stripTrailingNumber(baseName);
        int suffix = 2;

        while (nameExists(normalizedBase + " " + suffix, currentEmployeeId)) {
            suffix++;
        }

        return normalizedBase + " " + suffix;
    }

    private boolean nameExists(String fullName, Integer currentEmployeeId) {
        String normalizedFullName = normalizeSpaces(fullName);

        return employeeRepository.findAll().stream()
                .filter(employee -> currentEmployeeId == null || !employee.getId().equals(currentEmployeeId))
                .map(this::employeeFullName)
                .map(this::normalizeSpaces)
                .anyMatch(existingName -> namesEqual(existingName, normalizedFullName))
                || userRepository.findAll().stream()
                .filter(user -> currentEmployeeId == null || user.getEmployeeId() == null || !user.getEmployeeId().equals(currentEmployeeId))
                .map(User::getFullName)
                .map(this::normalizeSpaces)
                .anyMatch(existingName -> namesEqual(existingName, normalizedFullName));
    }

    private String employeeFullName(Employee employee) {
        return normalizeFullName(employee.getFirstName(), employee.getLastName());
    }

    private String normalizeFullName(String firstName, String lastName) {
        String first = firstName == null ? "" : firstName;
        String last = lastName == null ? "" : lastName;
        return normalizeSpaces((first + " " + last).trim());
    }

    private String normalizeSpaces(String value) {
        if (value == null) {
            return "";
        }

        return value.trim().replaceAll("\\s+", " ");
    }

    private boolean namesEqual(String a, String b) {
        return normalizeSpaces(a).toLowerCase(Locale.ROOT)
                .equals(normalizeSpaces(b).toLowerCase(Locale.ROOT));
    }

    private String stripTrailingNumber(String value) {
        String normalized = normalizeSpaces(value);
        Matcher matcher = TRAILING_NUMBER_PATTERN.matcher(normalized);

        if (matcher.matches() && matcher.group(1) != null && matcher.group(2) != null) {
            return normalizeSpaces(matcher.group(1));
        }

        return normalized;
    }
}*/






package com.epms.service;

import com.epms.entity.Employee;
import com.epms.entity.User;
import com.epms.exception.DuplicateResourceException;
import com.epms.repository.EmployeeRepository;
import com.epms.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.Locale;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class NameValidationService {

    private final EmployeeRepository employeeRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public void validateEmployeeName(String firstName, String lastName, Integer excludeEmployeeId, Integer excludeUserId) {
        validateFullName(join(firstName, lastName), excludeEmployeeId, excludeUserId);
    }

    @Transactional(readOnly = true)
    public void validateFullName(String fullName, Integer excludeEmployeeId, Integer excludeUserId) {
        String normalizedFullName = normalizeDisplay(fullName);
        if (normalizedFullName == null) {
            return;
        }

        Set<String> existingNames = collectExistingNames(excludeEmployeeId, excludeUserId);
        String key = key(normalizedFullName);

        if (existingNames.contains(key)) {
            String suggestion = nextSuggestion(normalizedFullName, existingNames);
            throw new DuplicateResourceException(
                    "Name already exists. Please use something like this \"" + suggestion + "\"."
            );
        }
    }

    private Set<String> collectExistingNames(Integer excludeEmployeeId, Integer excludeUserId) {
        Set<String> names = new HashSet<>();

        for (Employee employee : employeeRepository.findAll()) {
            if (employee == null || (excludeEmployeeId != null && excludeEmployeeId.equals(employee.getId()))) {
                continue;
            }
            String fullName = join(employee.getFirstName(), employee.getLastName());
            String normalized = normalizeDisplay(fullName);
            if (normalized != null) {
                names.add(key(normalized));
            }
        }

        for (User user : userRepository.findAll()) {
            if (user == null || (excludeUserId != null && excludeUserId.equals(user.getId()))) {
                continue;
            }
            String normalized = normalizeDisplay(user.getFullName());
            if (normalized != null) {
                names.add(key(normalized));
            }
        }

        return names;
    }

    private String nextSuggestion(String baseName, Set<String> existingNames) {
        int index = 2;
        String candidate = baseName + " " + index;
        while (existingNames.contains(key(candidate))) {
            index++;
            candidate = baseName + " " + index;
        }
        return candidate;
    }

    private String join(String firstName, String lastName) {
        String first = firstName == null ? "" : firstName.trim();
        String last = lastName == null ? "" : lastName.trim();
        return (first + " " + last).trim();
    }

    private String normalizeDisplay(String value) {
        if (value == null) {
            return null;
        }
        String normalized = value.trim().replaceAll("\\s+", " ");
        return normalized.isBlank() ? null : normalized;
    }

    private String key(String value) {
        return normalizeDisplay(value).toLowerCase(Locale.ROOT);
    }
}