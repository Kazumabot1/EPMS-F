package com.epms.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Date;

@Entity
@Table(name = "password_reset_otps")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class PasswordResetOtp {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false)
    private String email;

    @Column(name = "otp_hash", nullable = false, length = 128)
    private String otpHash;

    @Column(name = "reset_token_hash", length = 128)
    private String resetTokenHash;

    @Temporal(TemporalType.TIMESTAMP)
    @Column(name = "expires_at", nullable = false)
    private Date expiresAt;

    @Temporal(TemporalType.TIMESTAMP)
    @Column(name = "verified_at")
    private Date verifiedAt;

    @Temporal(TemporalType.TIMESTAMP)
    @Column(name = "consumed_at")
    private Date consumedAt;

    @Column(name = "failed_attempts", nullable = false)
    private Integer failedAttempts = 0;

    @Temporal(TemporalType.TIMESTAMP)
    @Column(name = "created_at", nullable = false)
    private Date createdAt = new Date();
}