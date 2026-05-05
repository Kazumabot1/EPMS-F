package com.epms.service.impl;

import com.epms.entity.AuditLog;
import com.epms.repository.AuditLogRepository;
import com.epms.service.AuditLogService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AuditLogServiceImpl implements AuditLogService {

    private final AuditLogRepository auditLogRepository;

    @Override
    @Transactional
    public void log(Integer userId, String action, String entityType, Integer entityId, String oldValue, String newValue, String reason) {
        AuditLog auditLog = new AuditLog();
        auditLog.setUserId(userId);
        auditLog.setAction(action);
        auditLog.setEntityType(entityType);
        auditLog.setEntityId(entityId);
        auditLog.setOldValue(oldValue);
        auditLog.setNewValue(newValue);
        auditLog.setReason(reason);
        auditLogRepository.save(auditLog);
    }

    @Override
    @Transactional(readOnly = true)
    public List<AuditLog> getRecent(String entityType, Integer entityId) {
        if (entityType != null && entityId != null) {
            return auditLogRepository.findTop200ByEntityTypeAndEntityIdOrderByTimestampDesc(entityType, entityId);
        }
        if (entityType != null) {
            return auditLogRepository.findTop200ByEntityTypeOrderByTimestampDesc(entityType);
        }
        return auditLogRepository.findTop200ByOrderByTimestampDesc();
    }
}
