package com.epms.repository;

import com.epms.entity.AppraisalTemplateDepartment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AppraisalTemplateDepartmentRepository extends JpaRepository<AppraisalTemplateDepartment, Integer> {

    List<AppraisalTemplateDepartment> findByTemplateId(Integer templateId);

    void deleteByTemplateId(Integer templateId);

    boolean existsByTemplateIdAndDepartmentId(Integer templateId, Integer departmentId);
}
