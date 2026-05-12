/*
package com.epms.service;

import com.epms.entity.AuditLog;

import java.util.List;

public interface AuditLogService {
    void log(Integer userId, String action, String entityType, Integer entityId, String oldValue, String newValue, String reason);
    List<AuditLog> getRecent(String entityType, Integer entityId);
}
*//*








package com.epms.service;

import com.epms.entity.AuditLog;

import java.util.Collection;
import java.util.List;

public interface AuditLogService {
    void log(Integer userId, String action, String entityType, Integer entityId, String oldValue, String newValue, String reason);

    void log(Integer userId, String action, String entityType, Integer entityId, String changedColumn, String oldValue, String newValue, String reason);

    List<AuditLog> getRecent(String entityType, Integer entityId);

    List<AuditLog> getRecentForEntityTypes(Collection<String> entityTypes);
}
*/

/*

package com.epms.service;

import com.epms.entity.AuditLog;

import java.util.Collection;
import java.util.List;

public interface AuditLogService {

    void log(
            Integer userId,
            String action,
            String entityType,
            Integer entityId,
            String oldValue,
            String newValue,
            String reason
    );

    void log(
            Integer userId,
            String action,
            String entityType,
            Integer entityId,
            String changedColumn,
            String oldValue,
            String newValue,
            String reason
    );

    List<AuditLog> getRecent(String entityType, Integer entityId);

    List<AuditLog> getRecentForEntityTypes(Collection<String> entityTypes);
}*/





package com.epms.service;

import com.epms.entity.AuditLog;

import java.util.Collection;
import java.util.List;

public interface AuditLogService {

    void log(
            Integer userId,
            String action,
            String entityType,
            Integer entityId,
            String oldValue,
            String newValue,
            String reason
    );

    void log(
            Integer userId,
            String action,
            String entityType,
            Integer entityId,
            String changedColumn,
            String oldValue,
            String newValue,
            String reason
    );

    List<AuditLog> getRecent(String entityType, Integer entityId);

    List<AuditLog> getRecent(String entityType, Integer entityId, Integer userId);

    List<AuditLog> getRecentForEntityTypes(Collection<String> entityTypes);

    List<AuditLog> getRecentForEntityTypes(Collection<String> entityTypes, Integer userId);

    List<Integer> getEditorUserIdsForEntityTypes(Collection<String> entityTypes);
}