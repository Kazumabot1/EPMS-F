package com.epms.service;

import com.epms.entity.User;

import java.util.Set;

/**
 * Extension point for project-based peer discovery.
 * The current workspace has no project membership module, so the default adapter returns no peers.
 */
public interface ProjectPeerDirectory {

    Set<Long> findProjectPeerEmployeeIds(User targetUser);

    boolean isConfigured();
}
