package com.epms.repository;

import com.epms.entity.AppraisalScoreBand;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AppraisalScoreBandRepository extends JpaRepository<AppraisalScoreBand, Integer> {

    List<AppraisalScoreBand> findByActiveTrueOrderBySortOrderAsc();

    @Query("""
        SELECT b
        FROM AppraisalScoreBand b
        WHERE b.active = true
          AND :score BETWEEN b.minScore AND b.maxScore
        ORDER BY b.sortOrder ASC
        """)
    Optional<AppraisalScoreBand> findBandForScore(@Param("score") Integer score);
}
