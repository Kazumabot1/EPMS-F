package com.epms.repository;

import com.epms.entity.AppraisalForm;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AppraisalFormRepository extends JpaRepository<AppraisalForm, Long> {

    List<AppraisalForm> findByIsActiveTrueOrderByCreatedAtDesc();

    /**
     * Find the first active form whose target_roles column contains the given role substring.
     * E.g. if role = "Employee", matches "Employee,Manager" or "Employee".
     */
    @Query("""
            SELECT f FROM AppraisalForm f
            WHERE f.isActive = true
              AND f.targetRoles LIKE CONCAT('%', :role, '%')
            ORDER BY f.updatedAt DESC
            """)
    List<AppraisalForm> findActiveByTargetRoleContaining(@Param("role") String role);

    List<AppraisalForm> findAllByOrderByCreatedAtDesc();
}
