package com.epms.service;

import java.util.List;

/**
 * Port interface defining domain boundary queries for employee hierarchy.
 * Represents external module interactions needed for auto-selecting evaluators.
 */
public interface EmployeeHierarchyService {
    Integer getManagerId(Integer employeeId);
    List<Integer> getRandomPeers(Integer employeeId, int count);
    List<Integer> getSubordinates(Integer employeeId);
}
