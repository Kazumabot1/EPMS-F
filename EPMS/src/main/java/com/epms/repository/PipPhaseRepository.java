package com.epms.repository;

import com.epms.entity.PipPhase;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Why this file exists:
 * - Handles database access for PIP phases.
 * - Used when updating phase status/reason and when showing PIP details.
 */
@Repository
public interface PipPhaseRepository extends JpaRepository<PipPhase, Integer> {
    List<PipPhase> findByPipIdOrderByPhaseNumberAsc(Integer pipId);
}