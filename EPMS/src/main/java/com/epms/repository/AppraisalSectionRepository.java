package com.epms.repository;

import com.epms.entity.AppraisalSection;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AppraisalSectionRepository extends JpaRepository<AppraisalSection, Integer> {

    List<AppraisalSection> findByTemplateIdOrderBySortOrderAsc(Integer templateId);

    @EntityGraph(attributePaths = {"criteria"})
    @Query("""
        SELECT DISTINCT s
        FROM AppraisalSection s
        WHERE s.template.id = :templateId
        ORDER BY s.sortOrder ASC
        """)
    List<AppraisalSection> findByTemplateIdWithCriteria(@Param("templateId") Integer templateId);
}
