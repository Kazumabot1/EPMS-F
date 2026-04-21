package com.epms.service.impl;

import com.epms.service.EmployeeHierarchyService;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.List;

@Service
public class EmployeeHierarchyServiceImpl implements EmployeeHierarchyService {

    @Override
    public Integer getManagerId(Integer employeeId) {
        // Dummy: assume manager is employeeId - 1 or something
        return employeeId > 1 ? employeeId - 1 : null;
    }

    @Override
    public List<Integer> getRandomPeers(Integer employeeId, int count) {
        // Dummy: return empty list
        return Collections.emptyList();
    }

    @Override
    public List<Integer> getSubordinates(Integer employeeId) {
        // Dummy: return empty list
        return Collections.emptyList();
    }
}
