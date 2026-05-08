package com.epms.repository;

import com.epms.entity.AppraisalFormCriteria;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AppraisalFormCriteriaRepository extends JpaRepository<AppraisalFormCriteria, Integer> {

    List<AppraisalFormCriteria> findBySectionIdOrderBySortOrderAsc(Integer sectionId);

    @Query("""
        SELECT c
        FROM AppraisalFormCriteria c
        WHERE c.section.template.id = :templateId
          AND c.active = true
        ORDER BY c.section.sortOrder ASC, c.sortOrder ASC
        """)
    List<AppraisalFormCriteria> findActiveCriteriaByTemplateId(@Param("templateId") Integer templateId);

    long countBySectionTemplateIdAndActiveTrue(Integer templateId);
}
