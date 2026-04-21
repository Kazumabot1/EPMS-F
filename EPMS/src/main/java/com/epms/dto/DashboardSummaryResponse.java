package com.epms.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class DashboardSummaryResponse {
    private UserSnapshot user;
    private Stats stats;
    private List<NotificationItem> recentNotifications;
    private List<FeedbackRequestItem> recentFeedbackRequests;
    private List<KpiItem> recentKpis;
    private long generatedAt;

    @Data
    @Builder
    public static class UserSnapshot {
        private Integer id;
        private String email;
        private String fullName;
        private String employeeCode;
        private String position;
        private Integer managerId;
        private Integer departmentId;
        private Boolean active;
        private Long joinDate;
    }

    @Data
    @Builder
    public static class Stats {
        private long directReports;
        private long unreadNotifications;
        private long feedbackFormsCreated;
        private long openFeedbackRequests;
        private long kpisCreated;
        private long activePipsManaged;
    }

    @Data
    @Builder
    public static class NotificationItem {
        private Integer id;
        private String title;
        private String message;
        private String type;
        private Boolean read;
        private Long createdAt;
    }

    @Data
    @Builder
    public static class FeedbackRequestItem {
        private Long id;
        private String formName;
        private Long targetEmployeeId;
        private String status;
        private Long createdAt;
        private Long dueAt;
    }

    @Data
    @Builder
    public static class KpiItem {
        private Integer id;
        private String title;
        private Double target;
        private Integer weight;
        private Long createdAt;
    }
}