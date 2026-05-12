package com.epms.repository;

import com.epms.entity.FeedbackQuestionApplicabilityRule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface FeedbackQuestionApplicabilityRuleRepository extends JpaRepository<FeedbackQuestionApplicabilityRule, Long> {

    @Query("""
        SELECT r
        FROM FeedbackQuestionApplicabilityRule r
        JOIN FETCH r.questionVersion qv
        JOIN FETCH qv.questionBank qb
        WHERE r.active = true
          AND qv.active = true
          AND qb.status = 'ACTIVE'
          AND :levelRank BETWEEN r.targetLevelMinRank AND r.targetLevelMaxRank
          AND (r.evaluatorRelationshipType = :relationshipType OR r.evaluatorRelationshipType = 'ANY')
          AND (r.targetPositionId IS NULL OR r.targetPositionId = :targetPositionId)
          AND (r.targetDepartmentId IS NULL OR r.targetDepartmentId = :targetDepartmentId)
          AND (r.validFrom IS NULL OR r.validFrom <= :today)
          AND (r.validTo IS NULL OR r.validTo >= :today)
        ORDER BY r.sectionOrder ASC,
                 r.displayOrder ASC,
                 CASE WHEN r.evaluatorRelationshipType = :relationshipType THEN 0 ELSE 1 END ASC,
                 CASE WHEN r.targetPositionId IS NULL THEN 1 ELSE 0 END ASC,
                 r.rulePriority ASC,
                 r.id ASC
    """)
    List<FeedbackQuestionApplicabilityRule> findApplicableRules(
            @Param("levelRank") Integer levelRank,
            @Param("targetPositionId") Long targetPositionId,
            @Param("targetDepartmentId") Long targetDepartmentId,
            @Param("relationshipType") String relationshipType,
            @Param("today") LocalDate today
    );

    @Query("""
        SELECT r
        FROM FeedbackQuestionApplicabilityRule r
        JOIN FETCH r.questionVersion qv
        JOIN FETCH qv.questionBank qb
        WHERE r.evaluatorRelationshipType <> 'ANY'
        ORDER BY r.active DESC, r.sectionOrder ASC, r.displayOrder ASC, r.id DESC
    """)
    List<FeedbackQuestionApplicabilityRule> findAllDetailed();

    @Query("""
        SELECT COUNT(r)
        FROM FeedbackQuestionApplicabilityRule r
        WHERE r.active = true
          AND r.questionVersion.id = :questionVersionId
          AND r.targetLevelMinRank = :targetLevelMinRank
          AND r.targetLevelMaxRank = :targetLevelMaxRank
          AND r.evaluatorRelationshipType = :relationshipType
          AND r.sectionCode = :sectionCode
          AND ((:targetPositionId IS NULL AND r.targetPositionId IS NULL) OR r.targetPositionId = :targetPositionId)
          AND ((:targetDepartmentId IS NULL AND r.targetDepartmentId IS NULL) OR r.targetDepartmentId = :targetDepartmentId)
          AND (:excludeRuleId IS NULL OR r.id <> :excludeRuleId)
    """)
    long countDuplicateRules(
            @Param("questionVersionId") Long questionVersionId,
            @Param("targetLevelMinRank") Integer targetLevelMinRank,
            @Param("targetLevelMaxRank") Integer targetLevelMaxRank,
            @Param("relationshipType") String relationshipType,
            @Param("sectionCode") String sectionCode,
            @Param("targetPositionId") Long targetPositionId,
            @Param("targetDepartmentId") Long targetDepartmentId,
            @Param("excludeRuleId") Long excludeRuleId
    );


    @Query("""
        SELECT r
        FROM FeedbackQuestionApplicabilityRule r
        WHERE r.active = false
          AND r.questionVersion.id = :questionVersionId
          AND r.targetLevelMinRank = :targetLevelMinRank
          AND r.targetLevelMaxRank = :targetLevelMaxRank
          AND r.evaluatorRelationshipType = :relationshipType
          AND r.sectionCode = :sectionCode
          AND ((:targetPositionId IS NULL AND r.targetPositionId IS NULL) OR r.targetPositionId = :targetPositionId)
          AND ((:targetDepartmentId IS NULL AND r.targetDepartmentId IS NULL) OR r.targetDepartmentId = :targetDepartmentId)
        ORDER BY r.updatedAt DESC, r.id DESC
    """)
    Optional<FeedbackQuestionApplicabilityRule> findFirstInactiveDuplicateRule(
            @Param("questionVersionId") Long questionVersionId,
            @Param("targetLevelMinRank") Integer targetLevelMinRank,
            @Param("targetLevelMaxRank") Integer targetLevelMaxRank,
            @Param("relationshipType") String relationshipType,
            @Param("sectionCode") String sectionCode,
            @Param("targetPositionId") Long targetPositionId,
            @Param("targetDepartmentId") Long targetDepartmentId
    );

}
