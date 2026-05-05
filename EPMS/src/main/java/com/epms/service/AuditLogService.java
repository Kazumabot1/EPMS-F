package com.epms.service;

import com.epms.entity.AuditLog;

import java.util.List;

public interface AuditLogService {
    void log(Integer userId, String action, String entityType, Integer entityId, String oldValue, String newValue, String reason);
    List<AuditLog> getRecent(String entityType, Integer entityId);
}
