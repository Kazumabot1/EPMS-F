package com.epms.entity;

import com.epms.entity.enums.FeedbackCampaignRound;
import com.epms.entity.enums.FeedbackCampaignStatus;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "feedback_campaigns")
@Getter
@Setter
@NoArgsConstructor
public class FeedbackCampaign {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "name", nullable = false)
    private String name;

    @Column(name = "review_year")
    private Integer reviewYear;

    @Enumerated(EnumType.STRING)
    @Column(name = "review_round")
    private FeedbackCampaignRound reviewRound;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date", nullable = false)
    private LocalDate endDate;

    @Column(name = "start_time")
    private LocalTime startTime;

    @Column(name = "end_time")
    private LocalTime endTime;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "instructions", columnDefinition = "TEXT")
    private String instructions;

    @Column(name = "form_id", nullable = false)
    private Long formId;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private FeedbackCampaignStatus status;

    @Column(name = "created_by_user_id", nullable = false)
    private Long createdByUserId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @OneToMany(mappedBy = "campaign", fetch = FetchType.LAZY)
    private List<FeedbackRequest> feedbackRequests = new ArrayList<>();

    public LocalDateTime getStartAt() {
        if (startDate == null) {
            return null;
        }
        return startDate.atTime(startTime != null ? startTime : LocalTime.of(9, 0));
    }

    public LocalDateTime getEndAt() {
        if (endDate == null) {
            return null;
        }
        return endDate.atTime(endTime != null ? endTime : LocalTime.of(17, 0));
    }

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
        if (this.startTime == null) {
            this.startTime = LocalTime.of(9, 0);
        }
        if (this.endTime == null) {
            this.endTime = LocalTime.of(17, 0);
        }
        if (this.reviewYear == null && this.startDate != null) {
            this.reviewYear = this.startDate.getYear();
        }
        if (this.reviewRound == null) {
            this.reviewRound = FeedbackCampaignRound.ANNUAL;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
