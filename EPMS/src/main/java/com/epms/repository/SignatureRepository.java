package com.epms.repository;

import com.epms.entity.Signature;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface SignatureRepository extends JpaRepository<Signature, Long> {
    List<Signature> findByUserIdAndIsActiveTrueOrderByUpdatedAtDesc(Long userId);

    Optional<Signature> findByIdAndUserIdAndIsActiveTrue(Long id, Long userId);

    Optional<Signature> findByUserIdAndIsDefaultTrueAndIsActiveTrue(Long userId);

    Optional<Signature> findByIdAndIsActiveTrue(Long id);

    long countByUserIdAndIsActiveTrue(Long userId);
}
