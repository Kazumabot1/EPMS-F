package com.epms.repository;

import com.epms.entity.PasswordResetOtp;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

public interface PasswordResetOtpRepository extends JpaRepository<PasswordResetOtp, Integer> {

    Optional<PasswordResetOtp> findTopByEmailIgnoreCaseAndConsumedAtIsNullOrderByCreatedAtDesc(String email);

    Optional<PasswordResetOtp> findByResetTokenHashAndConsumedAtIsNull(String resetTokenHash);

    @Modifying
    @Transactional
    @Query("""
            UPDATE PasswordResetOtp p
            SET p.consumedAt = CURRENT_TIMESTAMP
            WHERE LOWER(p.email) = LOWER(:email)
              AND p.consumedAt IS NULL
            """)
    void consumeOpenOtpsByEmail(@Param("email") String email);
}