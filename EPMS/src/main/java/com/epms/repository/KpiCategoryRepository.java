package com.epms.repository;

import com.epms.entity.KpiCategory;
import org.springframework.data.jpa.repository.JpaRepository;

public interface KpiCategoryRepository extends JpaRepository<KpiCategory, Integer> {
}
