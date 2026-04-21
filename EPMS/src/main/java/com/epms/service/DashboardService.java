package com.epms.service;

import com.epms.dto.DashboardSummaryResponse;

public interface DashboardService {
    DashboardSummaryResponse getDashboardSummary(String email);
}