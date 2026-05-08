package com.epms.repository;

import com.epms.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Integer> {

    Optional<User> findByEmail(String email);

    @Query("""
            SELECT u FROM User u
            WHERE LOWER(u.email) = LOWER(:email)
              AND (u.active IS NULL OR u.active = true)
            """)
    Optional<User> findActiveByEmail(@Param("email") String email);

    Optional<User> findByEmployeeId(Integer employeeId);

    @Query("""
            SELECT u FROM User u
            WHERE u.employeeId = :employeeId
              AND (u.active IS NULL OR u.active = true)
            """)
    Optional<User> findActiveByEmployeeId(@Param("employeeId") Integer employeeId);

    boolean existsByEmailIgnoreCase(String email);

    long countByManagerId(Integer managerId);

    long countByDepartmentId(Integer departmentId);

    long countByActiveTrue();

    List<User> findByManagerIdAndActiveTrue(Integer managerId);

    List<User> findByDepartmentIdAndActiveTrue(Integer departmentId);

    @Query(value = """
            SELECT DISTINCT u.*
            FROM users u
            JOIN user_roles ur ON ur.user_id = u.id
            JOIN roles r ON r.id = ur.role_id
            WHERE (u.active IS NULL OR u.active = true)
              AND UPPER(REPLACE(REPLACE(REPLACE(REPLACE(r.name, 'ROLE_', ''), ' ', '_'), '-', '_'), '/', '_')) IN (:roleNames)
            """, nativeQuery = true)
    List<User> findActiveUsersByNormalizedRoleNames(@Param("roleNames") List<String> roleNames);

    @Query(value = """
            SELECT DISTINCT u.*
            FROM users u
            JOIN user_roles ur ON ur.user_id = u.id
            JOIN roles r ON r.id = ur.role_id
            WHERE u.department_id = :departmentId
              AND (u.active IS NULL OR u.active = true)
              AND UPPER(REPLACE(REPLACE(REPLACE(REPLACE(r.name, 'ROLE_', ''), ' ', '_'), '-', '_'), '/', '_')) IN ('DEPARTMENT_HEAD', 'DEPARTMENTHEAD')
            """, nativeQuery = true)
    List<User> findActiveDepartmentHeadsByDepartmentId(@Param("departmentId") Integer departmentId);
}