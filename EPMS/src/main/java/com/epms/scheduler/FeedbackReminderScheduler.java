package com.epms.scheduler;

import com.epms.entity.FeedbackCampaign;
import com.epms.entity.enums.FeedbackCampaignStatus;
import com.epms.repository.FeedbackCampaignRepository;
import com.epms.service.FeedbackCampaignService;
import com.epms.service.FeedbackOperationalService;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Component
@RequiredArgsConstructor
public class FeedbackReminderScheduler {

    private final FeedbackCampaignRepository feedbackCampaignRepository;
    private final FeedbackCampaignService feedbackCampaignService;
    private final FeedbackOperationalService feedbackOperationalService;

    @Scheduled(fixedDelay = 900000)
    @Transactional
    public void closeExpiredCampaignsAndSendFeedbackReminders() {
        feedbackCampaignService.closeExpiredCampaigns();
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime deadlineWindowEnd = now.plusHours(24);

        List<FeedbackCampaign> activeCampaigns = feedbackCampaignRepository.findByStatusOrderByStartDateDesc(FeedbackCampaignStatus.ACTIVE);
        for (FeedbackCampaign campaign : activeCampaigns) {
            LocalDateTime deadline = campaign.getEndAt();
            if (deadline == null) {
                continue;
            }

            if (deadline.isAfter(now) && !deadline.isAfter(deadlineWindowEnd)) {
                FeedbackOperationalService.NotificationDeliveryResult result = feedbackOperationalService.notifyPendingEvaluatorReminders(
                        campaign,
                        FeedbackOperationalService.FeedbackReminderKind.DEADLINE
                );
                auditIfSent(campaign, result, FeedbackOperationalService.DEADLINE_REMINDERS_SENT, "Automated 360 feedback deadline reminders sent");
            } else if (deadline.isBefore(now)) {
                FeedbackOperationalService.NotificationDeliveryResult result = feedbackOperationalService.notifyPendingEvaluatorReminders(
                        campaign,
                        FeedbackOperationalService.FeedbackReminderKind.OVERDUE
                );
                auditIfSent(campaign, result, FeedbackOperationalService.OVERDUE_REMINDERS_SENT, "Automated overdue 360 feedback reminders sent");
            }
        }
    }

    private void auditIfSent(
            FeedbackCampaign campaign,
            FeedbackOperationalService.NotificationDeliveryResult result,
            String action,
            String reason
    ) {
        if (result.getSentCount() <= 0) {
            return;
        }
        feedbackOperationalService.audit(
                (Long) null,
                action,
                FeedbackOperationalService.ENTITY_CAMPAIGN,
                campaign.getId(),
                null,
                "pendingAssignments=" + result.getCandidateCount() + ", notificationsSent=" + result.getSentCount()
                        + ", uniqueUsers=" + result.getUniqueUserCount() + ", skipped=" + result.getSkippedCount(),
                reason
        );
    }
}
