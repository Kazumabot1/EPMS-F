package com.epms.repository;

import com.epms.entity.FeedbackQuestionVersion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface FeedbackQuestionVersionRepository extends JpaRepository<FeedbackQuestionVersion, Long> {

    Optional<FeedbackQuestionVersion> findTopByQuestionBank_IdAndActiveTrueOrderByVersionNumberDesc(Long questionBankId);

    @Query("""
        SELECT COALESCE(MAX(qv.versionNumber), 0)
        FROM FeedbackQuestionVersion qv
        WHERE qv.questionBank.id = :questionBankId
    """)
    int findMaxVersionNumber(@Param("questionBankId") Long questionBankId);
}
