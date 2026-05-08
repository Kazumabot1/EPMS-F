/*
package com.epms.repository;

import com.epms.entity.Department;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface DepartmentRepository extends JpaRepository<Department, Integer> {

    Optional<Department> findByDepartmentName(String departmentName);

    Optional<Department> findByDepartmentNameIgnoreCase(String departmentName);

    Optional<Department> findByDepartmentCode(String departmentCode);

    Optional<Department> findByDepartmentCodeIgnoreCase(String departmentCode);

    boolean existsByDepartmentName(String departmentName);

    boolean existsByDepartmentNameIgnoreCase(String departmentName);

    boolean existsByDepartmentCode(String departmentCode);

    boolean existsByDepartmentCodeIgnoreCase(String departmentCode);
}*/

package com.epms.repository;

import com.epms.entity.Department;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface DepartmentRepository extends JpaRepository<Department, Integer> {

    Optional<Department> findByDepartmentName(String departmentName);

    Optional<Department> findByDepartmentNameIgnoreCase(String departmentName);

    Optional<Department> findByDepartmentCode(String departmentCode);

    Optional<Department> findByDepartmentCodeIgnoreCase(String departmentCode);

    boolean existsByDepartmentName(String departmentName);

    boolean existsByDepartmentNameIgnoreCase(String departmentName);

    boolean existsByDepartmentCode(String departmentCode);

    boolean existsByDepartmentCodeIgnoreCase(String departmentCode);

    @Query("""
        SELECT d
        FROM Department d
        WHERE :search IS NULL
           OR :search = ''
           OR LOWER(d.departmentName) LIKE LOWER(CONCAT('%', :search, '%'))
           OR LOWER(COALESCE(d.departmentCode, '')) LIKE LOWER(CONCAT('%', :search, '%'))
        ORDER BY d.departmentName ASC
        """)
    List<Department> searchForComparison(@Param("search") String search);
}