package com.epms.repository;

import com.epms.entity.AuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AuditLogRepository extends JpaRepository<AuditLog, Integer> {
    List<AuditLog> findTop200ByOrderByTimestampDesc();
    List<AuditLog> findTop200ByEntityTypeOrderByTimestampDesc(String entityType);
    List<AuditLog> findTop200ByEntityTypeAndEntityIdOrderByTimestampDesc(String entityType, Integer entityId);
}
