//package com.epms.repository;
//
//import com.epms.entity.Employee;
//import org.springframework.data.jpa.repository.EntityGraph;
//import org.springframework.data.jpa.repository.JpaRepository;
//import org.springframework.data.jpa.repository.Query;
//import org.springframework.data.repository.query.Param;
//
//import java.util.List;
//import java.util.Optional;
//
//public interface EmployeeRepository extends JpaRepository<Employee, Integer> {
//
//    @EntityGraph(attributePaths = {"employeeDepartments", "employeeDepartments.department", "position", "position.level"})
//    List<Employee> findAll();
//
//    @EntityGraph(attributePaths = {"employeeDepartments", "employeeDepartments.department", "position", "position.level"})
//    @Query("SELECT e FROM Employee e WHERE e.active IS NULL OR e.active = true")
//    List<Employee> findAllActiveWithDepartments();
//
//    @EntityGraph(attributePaths = {"employeeDepartments", "employeeDepartments.department", "position", "position.level"})
//    @Query("SELECT e FROM Employee e WHERE e.id = :id")
//    Optional<Employee> findWithDepartmentsById(@Param("id") Integer id);
//
//    Optional<Employee> findByEmail(String email);
//    @EntityGraph(attributePaths = {"employeeDepartments", "employeeDepartments.department", "position", "position.level"})
//    @Query("""
//       SELECT DISTINCT e FROM Employee e
//       JOIN e.employeeDepartments ed
//       WHERE ed.department.id = :departmentId
//       AND ed.enddate IS NULL
//       AND (:includeInactive = true OR e.active IS NULL OR e.active = true)
//       """)
//    List<Employee> findCurrentByDepartmentId(
//            @Param("departmentId") Integer departmentId,
//            @Param("includeInactive") boolean includeInactive
//    );
//}


package com.epms.repository;

import com.epms.entity.Employee;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

/**
 * Why this file is updated:
 *
 * Before:
 * - 1:1 Meetings loaded employees by employee_department.
 * - Team Creation loaded employees by users.department_id.
 * - Because of that difference, some employees appeared in Team Creation
 *   but did not appear in 1:1 Meetings.
 *
 * Now:
 * - The new findActiveEmployeesByUserDepartmentId() query loads employees
 *   through the users table.
 * - This matches the Team Creation behavior.
 * - It only returns employees whose linked user account is active and whose
 *   employee record is active.
 *
 * Important:
 * - users.employee_id must point to employee.id.
 * - users.department_id is used as the current department source.
 */
public interface EmployeeRepository extends JpaRepository<Employee, Integer> {

    @EntityGraph(attributePaths = {"employeeDepartments", "employeeDepartments.department", "position", "position.level"})
    List<Employee> findAll();

    @EntityGraph(attributePaths = {"employeeDepartments", "employeeDepartments.department", "position", "position.level"})
    @Query("SELECT e FROM Employee e WHERE e.active IS NULL OR e.active = true")
    List<Employee> findAllActiveWithDepartments();

    @EntityGraph(attributePaths = {"employeeDepartments", "employeeDepartments.department", "position", "position.level"})
    @Query("SELECT e FROM Employee e WHERE e.id = :id")
    Optional<Employee> findWithDepartmentsById(@Param("id") Integer id);

    Optional<Employee> findByEmail(String email);

    @EntityGraph(attributePaths = {"employeeDepartments", "employeeDepartments.department", "position", "position.level"})
    @Query("""
       SELECT DISTINCT e FROM Employee e
       JOIN e.employeeDepartments ed
       WHERE ed.department.id = :departmentId
       AND ed.enddate IS NULL
       AND (:includeInactive = true OR e.active IS NULL OR e.active = true)
       """)
    List<Employee> findCurrentByDepartmentId(
            @Param("departmentId") Integer departmentId,
            @Param("includeInactive") boolean includeInactive
    );

    /**
     * Used by 1:1 Meetings employee dropdown.
     *
     * This query intentionally uses users.department_id instead of
     * employee_department.department_id.
     *
     * Reason:
     * - Team Creation already uses users.department_id.
     * - The logged-in account and role system also use users.
     * - Some records may not have employee_department history rows.
     * - This makes 1:1 Meetings and Team Creation show the same active employees.
     */
    @Query("""
       SELECT DISTINCT e FROM Employee e
       JOIN User u ON u.employeeId = e.id
       WHERE u.departmentId = :departmentId
         AND u.active = true
         AND (e.active IS NULL OR e.active = true)
       ORDER BY e.firstName ASC, e.lastName ASC
       """)
    List<Employee> findActiveEmployeesByUserDepartmentId(@Param("departmentId") Integer departmentId);
}