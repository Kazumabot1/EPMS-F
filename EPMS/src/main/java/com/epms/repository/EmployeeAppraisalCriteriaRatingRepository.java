package com.epms.repository;

import com.epms.entity.EmployeeAppraisalCriteriaRating;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface EmployeeAppraisalCriteriaRatingRepository extends JpaRepository<EmployeeAppraisalCriteriaRating, Integer> {

    Optional<EmployeeAppraisalCriteriaRating> findByEmployeeAppraisalFormIdAndCriteriaId(Integer employeeAppraisalFormId, Integer criteriaId);

    @EntityGraph(attributePaths = {"criteria", "criteria.section"})
    List<EmployeeAppraisalCriteriaRating> findByEmployeeAppraisalFormId(Integer employeeAppraisalFormId);

    void deleteByEmployeeAppraisalFormId(Integer employeeAppraisalFormId);
}
