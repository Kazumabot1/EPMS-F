package com.epms.repository;

import com.epms.entity.AppraisalCycleDepartment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AppraisalCycleDepartmentRepository extends JpaRepository<AppraisalCycleDepartment, Integer> {

    List<AppraisalCycleDepartment> findByCycleId(Integer cycleId);

    void deleteByCycleId(Integer cycleId);

    boolean existsByCycleIdAndDepartmentId(Integer cycleId, Integer departmentId);
}
