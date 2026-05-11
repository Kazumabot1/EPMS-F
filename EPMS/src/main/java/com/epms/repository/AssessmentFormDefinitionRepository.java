package com.epms.repository;

import com.epms.entity.AssessmentFormDefinition;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface AssessmentFormDefinitionRepository extends JpaRepository<AssessmentFormDefinition, Integer> {

    boolean existsByFormNameIgnoreCase(String formName);

    boolean existsByFormNameIgnoreCaseAndIdNot(String formName, Integer id);

    List<AssessmentFormDefinition> findAllByOrderByCreatedAtDesc();

    List<AssessmentFormDefinition> findByActiveTrueAndStartDateLessThanEqualAndEndDateGreaterThanEqualOrderByCreatedAtDesc(
            LocalDate startDate,
            LocalDate endDate
    );
}