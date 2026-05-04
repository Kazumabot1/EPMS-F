package com.epms.repository;

import com.epms.entity.PipUpdate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Why this file exists:
 * - Reads and saves PIP history records.
 * - Used to show what changed, who changed it, and when.
 */
@Repository
public interface PipUpdateRepository extends JpaRepository<PipUpdate, Integer> {
    List<PipUpdate> findByPipIdOrderByUpdatedAtDesc(Integer pipId);
}