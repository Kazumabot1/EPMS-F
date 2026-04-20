package com.epms.service.impl;

import com.epms.dto.DashboardSummaryResponse;
import com.epms.entity.User;
import com.epms.repository.UserRepository;
import com.epms.service.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.Date;

@Service
@RequiredArgsConstructor
public class DashboardServiceImpl implements DashboardService {

    private final UserRepository userRepository;

    @Override
    public DashboardSummaryResponse getDashboardSummary(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + email));

        return DashboardSummaryResponse.builder()
                .user(DashboardSummaryResponse.UserSnapshot.builder()
                        .id(user.getId())
                        .email(user.getEmail())
                        .fullName(user.getFullName())
                        .employeeCode(user.getEmployeeCode())
                        .position(user.getPosition())
                        .managerId(user.getManagerId())
                        .departmentId(user.getDepartmentId())
                        .active(Boolean.TRUE.equals(user.getActive()))
                        .joinDate(user.getJoinDate() != null ? user.getJoinDate().getTime() : null)
                        .build())
                .stats(DashboardSummaryResponse.Stats.builder()
                        .directReports(0)
                        .unreadNotifications(0)
                        .feedbackFormsCreated(0)
                        .openFeedbackRequests(0)
                        .kpisCreated(0)
                        .activePipsManaged(0)
                        .build())
                .recentNotifications(Collections.emptyList())
                .recentFeedbackRequests(Collections.emptyList())
                .recentKpis(Collections.emptyList())
                .generatedAt(new Date().getTime())
                .build();
    }
}