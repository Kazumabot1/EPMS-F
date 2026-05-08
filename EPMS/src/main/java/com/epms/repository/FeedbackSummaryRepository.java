package com.epms.repository;

import com.epms.entity.FeedbackSummary;
import com.epms.entity.enums.FeedbackSummaryVisibilityStatus;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface FeedbackSummaryRepository extends JpaRepository<FeedbackSummary, Long> {

    @Query("SELECT s FROM FeedbackSummary s JOIN FETCH s.campaign c WHERE c.id = :campaignId ORDER BY s.targetEmployeeId ASC")
    List<FeedbackSummary> findByCampaignIdOrderByTargetEmployeeIdAsc(@Param("campaignId") Long campaignId);

    @Query("SELECT s FROM FeedbackSummary s JOIN FETCH s.campaign c WHERE s.targetEmployeeId = :targetEmployeeId ORDER BY c.endDate DESC, c.id DESC")
    List<FeedbackSummary> findByTargetEmployeeIdOrderByCampaignEndDateDesc(@Param("targetEmployeeId") Long targetEmployeeId);

    @Query("SELECT s FROM FeedbackSummary s JOIN FETCH s.campaign c WHERE s.targetEmployeeId = :targetEmployeeId AND s.visibilityStatus = :visibilityStatus ORDER BY c.endDate DESC, c.id DESC")
    List<FeedbackSummary> findByTargetEmployeeIdAndVisibilityStatusOrderByCampaignEndDateDesc(
            @Param("targetEmployeeId") Long targetEmployeeId,
            @Param("visibilityStatus") FeedbackSummaryVisibilityStatus visibilityStatus
    );

    @Query("SELECT s FROM FeedbackSummary s JOIN FETCH s.campaign c WHERE s.targetEmployeeId IN :targetEmployeeIds ORDER BY c.endDate DESC, s.targetEmployeeId ASC")
    List<FeedbackSummary> findByTargetEmployeeIdInOrderByCampaignEndDateDesc(@Param("targetEmployeeIds") List<Long> targetEmployeeIds);

    @Query("SELECT s FROM FeedbackSummary s WHERE s.campaign.id = :campaignId AND s.targetEmployeeId = :targetEmployeeId")
    Optional<FeedbackSummary> findByCampaignIdAndTargetEmployeeId(
            @Param("campaignId") Long campaignId,
            @Param("targetEmployeeId") Long targetEmployeeId
    );

    boolean existsByCampaign_IdAndTargetEmployeeIdAndVisibilityStatus(
            Long campaignId,
            Long targetEmployeeId,
            FeedbackSummaryVisibilityStatus visibilityStatus
    );

    @Modifying
    @Query("DELETE FROM FeedbackSummary s WHERE s.campaign.id = :campaignId")
    void deleteByCampaignId(@Param("campaignId") Long campaignId);
}
