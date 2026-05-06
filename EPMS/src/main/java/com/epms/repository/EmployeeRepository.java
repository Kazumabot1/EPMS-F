package com.epms.repository;

import com.epms.entity.Employee;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

/**
 * Why this file is changed:
 * - currentdepartment and parentdepartment are now Department FK references.
 * - Department-based employee lookup uses:
 *     COALESCE(parentDepartment.id, currentDepartment.id)
 */
public interface EmployeeRepository extends JpaRepository<Employee, Integer> {

    @EntityGraph(attributePaths = {
            "employeeDepartments",
            "employeeDepartments.currentDepartment",
            "employeeDepartments.parentDepartment",
            "position",
            "position.level"
    })
    List<Employee> findAll();

    @EntityGraph(attributePaths = {
            "employeeDepartments",
            "employeeDepartments.currentDepartment",
            "employeeDepartments.parentDepartment",
            "position",
            "position.level"
    })
    @Query("SELECT e FROM Employee e WHERE e.active IS NULL OR e.active = true")
    List<Employee> findAllActiveWithDepartments();

    @EntityGraph(attributePaths = {
            "employeeDepartments",
            "employeeDepartments.currentDepartment",
            "employeeDepartments.parentDepartment",
            "position",
            "position.level"
    })
    @Query("SELECT e FROM Employee e WHERE e.id = :id")
    Optional<Employee> findWithDepartmentsById(@Param("id") Integer id);

    Optional<Employee> findByEmail(String email);

    /**
     * Used by Department Head employee pages.
     *
     * Working department rule:
     * - parentDepartment if present
     * - otherwise currentDepartment
     */
    @EntityGraph(attributePaths = {
            "employeeDepartments",
            "employeeDepartments.currentDepartment",
            "employeeDepartments.parentDepartment",
            "position",
            "position.level"
    })
    @Query("""
       SELECT DISTINCT e
       FROM Employee e
       JOIN e.employeeDepartments ed
       LEFT JOIN ed.parentDepartment pd
       LEFT JOIN ed.currentDepartment cd
       WHERE ed.enddate IS NULL
         AND (:includeInactive = true OR e.active IS NULL OR e.active = true)
         AND COALESCE(pd.id, cd.id) = :departmentId
       """)
    List<Employee> findCurrentByWorkingDepartmentId(
            @Param("departmentId") Integer departmentId,
            @Param("includeInactive") boolean includeInactive
    );
}