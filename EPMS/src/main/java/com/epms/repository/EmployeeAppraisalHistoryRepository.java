package com.epms.repository;

import com.epms.entity.EmployeeAppraisalHistory;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface EmployeeAppraisalHistoryRepository extends JpaRepository<EmployeeAppraisalHistory, Integer> {

    @EntityGraph(attributePaths = {"actionByUser"})
    List<EmployeeAppraisalHistory> findByEmployeeAppraisalFormIdOrderByCreatedAtAsc(Integer employeeAppraisalFormId);
}
