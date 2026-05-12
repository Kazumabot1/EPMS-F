package com.epms.repository;

import com.epms.entity.FeedbackQuestionBank;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FeedbackQuestionBankRepository extends JpaRepository<FeedbackQuestionBank, Long> {

    Optional<FeedbackQuestionBank> findByQuestionCodeIgnoreCase(String questionCode);

    boolean existsByQuestionCodeIgnoreCase(String questionCode);

    @Query("""
        SELECT qb.questionCode
        FROM FeedbackQuestionBank qb
        WHERE UPPER(qb.questionCode) LIKE CONCAT(:prefix, '%')
    """)
    List<String> findQuestionCodesByPrefix(@Param("prefix") String prefix);

    @Query("""
        SELECT qb
        FROM FeedbackQuestionBank qb
        LEFT JOIN FETCH qb.versions qv
        ORDER BY qb.competencyCode ASC, qb.questionCode ASC, qv.versionNumber DESC
    """)
    List<FeedbackQuestionBank> findAllWithVersions();
}
