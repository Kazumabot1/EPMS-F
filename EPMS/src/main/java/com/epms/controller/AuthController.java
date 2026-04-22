
package com.epms.controller;

import com.epms.dto.GenericApiResponse;
import com.epms.dto.auth.AuthResponse;
import com.epms.dto.auth.ChangePasswordRequest;
import com.epms.dto.auth.LoginRequest;
import com.epms.dto.auth.RefreshTokenRequest;
import com.epms.security.SecurityUtils;
import com.epms.service.auth.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/login")
    public ResponseEntity<GenericApiResponse<AuthResponse>> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(GenericApiResponse.success("Login successful", authService.login(request)));
    }

    @PostMapping("/refresh")
    public ResponseEntity<GenericApiResponse<AuthResponse>> refresh(@Valid @RequestBody RefreshTokenRequest request) {
        return ResponseEntity.ok(GenericApiResponse.success("Token refreshed", authService.refresh(request)));
    }

    @PostMapping("/logout")
    public ResponseEntity<GenericApiResponse<Void>> logout(@RequestBody(required = false) Map<String, String> payload) {
        authService.logout(payload == null ? null : payload.get("refreshToken"));
        return ResponseEntity.ok(GenericApiResponse.success("Logout successful", null));
    }

    @PostMapping("/change-password")
    public ResponseEntity<GenericApiResponse<Void>> changePassword(@Valid @RequestBody ChangePasswordRequest request) {
        authService.changePassword(SecurityUtils.currentUserId(), request);
        return ResponseEntity.ok(GenericApiResponse.success("Password changed successfully", null));
    }
}


