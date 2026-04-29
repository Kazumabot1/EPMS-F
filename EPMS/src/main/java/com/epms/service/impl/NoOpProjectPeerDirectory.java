package com.epms.service.impl;

import com.epms.entity.User;
import com.epms.service.ProjectPeerDirectory;
import org.springframework.stereotype.Service;

import java.util.Set;

@Service
public class NoOpProjectPeerDirectory implements ProjectPeerDirectory {

    @Override
    public Set<Long> findProjectPeerEmployeeIds(User targetUser) {
        return Set.of();
    }

    @Override
    public boolean isConfigured() {
        return false;
    }
}
