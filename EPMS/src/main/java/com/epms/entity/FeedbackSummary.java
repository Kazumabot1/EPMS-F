package com.epms.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "feedback_summary", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"campaign_id", "target_employee_id"})
})
@Getter
@Setter
@NoArgsConstructor
public class FeedbackSummary {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "campaign_id", nullable = false)
    private FeedbackCampaign campaign;

    @Column(name = "target_employee_id", nullable = false)
    private Long targetEmployeeId;

    @Column(name = "average_score", nullable = false)
    private Double averageScore;

    @Column(name = "total_responses", nullable = false)
    private Long totalResponses;

    @Column(name = "manager_responses", nullable = false)
    private Long managerResponses;

    @Column(name = "peer_responses", nullable = false)
    private Long peerResponses;

    @Column(name = "subordinate_responses", nullable = false)
    private Long subordinateResponses;

    @Column(name = "summarized_at", nullable = false)
    private LocalDateTime summarizedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
