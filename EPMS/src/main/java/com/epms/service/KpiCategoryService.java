package com.epms.service;

import com.epms.dto.KpiCategoryRequestDto;
import com.epms.dto.KpiCategoryResponseDto;

import java.util.List;

public interface KpiCategoryService {

    KpiCategoryResponseDto createKpiCategory(KpiCategoryRequestDto requestDto);

    List<KpiCategoryResponseDto> getAllKpiCategories();

    KpiCategoryResponseDto getKpiCategoryById(Integer id);

    KpiCategoryResponseDto updateKpiCategory(Integer id, KpiCategoryRequestDto requestDto);

    void deleteKpiCategory(Integer id);
}
