/*
package com.epms.controller;

import com.epms.dto.GenericApiResponse;
import com.epms.dto.auth.AuthResponse;
import com.epms.dto.auth.ChangePasswordRequest;
import com.epms.dto.auth.CurrentUserResponse;
import com.epms.dto.auth.LoginRequest;
import com.epms.dto.auth.RefreshTokenRequest;
import com.epms.security.SecurityUtils;
import com.epms.security.UserPrincipal;
import com.epms.service.auth.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/login")
    public ResponseEntity<GenericApiResponse<AuthResponse>> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(
                GenericApiResponse.success("Login successful", authService.login(request))
        );
    }

    @PostMapping("/refresh")
    public ResponseEntity<GenericApiResponse<AuthResponse>> refresh(@Valid @RequestBody RefreshTokenRequest request) {
        return ResponseEntity.ok(
                GenericApiResponse.success("Token refreshed successfully", authService.refresh(request))
        );
    }

    @PostMapping("/logout")
    public ResponseEntity<GenericApiResponse<Void>> logout(@Valid @RequestBody RefreshTokenRequest request) {
        authService.logout(request.getRefreshToken());
        return ResponseEntity.ok(GenericApiResponse.success("Logout successful", null));
    }

    @PostMapping("/change-password")
    public ResponseEntity<GenericApiResponse<Void>> changePassword(@Valid @RequestBody ChangePasswordRequest request) {
        authService.changePassword(SecurityUtils.currentUserId(), request);
        return ResponseEntity.ok(GenericApiResponse.success("Password changed successfully", null));
    }

    @GetMapping("/me")
    public ResponseEntity<GenericApiResponse<CurrentUserResponse>> me() {
        UserPrincipal principal = SecurityUtils.currentUser();

        CurrentUserResponse response = CurrentUserResponse.builder()
                .id(principal.getId())
                .email(principal.getUsername())
                .fullName(principal.getFullName())
                .employeeCode(principal.getEmployeeCode())
                .position(principal.getPosition())
                .roles(principal.getRoles())
                .permissions(principal.getPermissions())
                .dashboard(principal.getDashboard())
                .mustChangePassword(principal.isMustChangePassword())
                .build();

        return ResponseEntity.ok(GenericApiResponse.success("Current user fetched successfully", response));
    }
}*/










package com.epms.controller;

import com.epms.dto.GenericApiResponse;
import com.epms.dto.auth.AuthResponse;
import com.epms.dto.auth.ChangePasswordRequest;
import com.epms.dto.auth.CurrentUserResponse;
import com.epms.dto.auth.ForgotPasswordRequest;
import com.epms.dto.auth.LoginRequest;
import com.epms.dto.auth.RefreshTokenRequest;
import com.epms.dto.auth.ResetForgotPasswordRequest;
import com.epms.dto.auth.VerifyForgotPasswordOtpRequest;
import com.epms.dto.auth.VerifyForgotPasswordOtpResponse;
import com.epms.security.SecurityUtils;
import com.epms.security.UserPrincipal;
import com.epms.service.auth.AuthService;
import com.epms.service.auth.ForgotPasswordService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final ForgotPasswordService forgotPasswordService;

    @PostMapping("/login")
    public ResponseEntity<GenericApiResponse<AuthResponse>> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(
                GenericApiResponse.success("Login successful", authService.login(request))
        );
    }

    @PostMapping("/refresh")
    public ResponseEntity<GenericApiResponse<AuthResponse>> refresh(@Valid @RequestBody RefreshTokenRequest request) {
        return ResponseEntity.ok(
                GenericApiResponse.success("Token refreshed successfully", authService.refresh(request))
        );
    }

    @PostMapping("/logout")
    public ResponseEntity<GenericApiResponse<Void>> logout(@Valid @RequestBody RefreshTokenRequest request) {
        authService.logout(request.getRefreshToken());
        return ResponseEntity.ok(GenericApiResponse.success("Logout successful", null));
    }

    @PostMapping("/forgot-password/request")
    public ResponseEntity<GenericApiResponse<Void>> requestForgotPasswordOtp(@Valid @RequestBody ForgotPasswordRequest request) {
        String message = forgotPasswordService.requestOtp(request);
        return ResponseEntity.ok(GenericApiResponse.success(message, null));
    }

    @PostMapping("/forgot-password/verify")
    public ResponseEntity<GenericApiResponse<VerifyForgotPasswordOtpResponse>> verifyForgotPasswordOtp(
            @Valid @RequestBody VerifyForgotPasswordOtpRequest request
    ) {
        return ResponseEntity.ok(
                GenericApiResponse.success("OTP verified successfully", forgotPasswordService.verifyOtp(request))
        );
    }

    @PostMapping("/forgot-password/reset")
    public ResponseEntity<GenericApiResponse<Void>> resetForgotPassword(@Valid @RequestBody ResetForgotPasswordRequest request) {
        forgotPasswordService.resetPassword(request);
        return ResponseEntity.ok(GenericApiResponse.success("Password reset successfully", null));
    }

    @PostMapping("/change-password")
    public ResponseEntity<GenericApiResponse<Void>> changePassword(@Valid @RequestBody ChangePasswordRequest request) {
        authService.changePassword(SecurityUtils.currentUserId(), request);
        return ResponseEntity.ok(GenericApiResponse.success("Password changed successfully", null));
    }

    @GetMapping("/me")
    public ResponseEntity<GenericApiResponse<CurrentUserResponse>> me() {
        UserPrincipal principal = SecurityUtils.currentUser();

        CurrentUserResponse response = CurrentUserResponse.builder()
                .id(principal.getId())
                .email(principal.getUsername())
                .fullName(principal.getFullName())
                .employeeCode(principal.getEmployeeCode())
                .position(principal.getPosition())
                .roles(principal.getRoles())
                .permissions(principal.getPermissions())
                .dashboard(principal.getDashboard())
                .mustChangePassword(principal.isMustChangePassword())
                .build();

        return ResponseEntity.ok(GenericApiResponse.success("Current user fetched successfully", response));
    }
}
