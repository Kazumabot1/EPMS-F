package com.epms.controller;

import com.epms.entity.User;
import com.epms.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final UserRepository userRepository;

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> credentials) {
        String email = credentials.get("email");
        String password = credentials.get("password");

        User user = userRepository.findByEmail(email).orElse(null);

        if (user == null) {
            return ResponseEntity.status(401).body(Map.of("message", "User not found"));
        }

        if (user.getPassword() == null || !user.getPassword().equals(password)) {
            return ResponseEntity.status(401).body(Map.of("message", "Invalid password"));
        }

        return ResponseEntity.ok(Map.of(
                "token", "dummy-token",
                "email", user.getEmail(),
                "fullName", user.getFullName(),
                "id", user.getId(),
                "employeeCode", user.getEmployeeCode() == null ? "" : user.getEmployeeCode()
        ));
    }
}