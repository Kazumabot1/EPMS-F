package com.epms.controller;

import com.epms.dto.KpiCategoryRequestDto;
import com.epms.dto.KpiCategoryResponseDto;
import com.epms.service.KpiCategoryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/kpi-categories")
@RequiredArgsConstructor
public class KpiCategoryController {

    private final KpiCategoryService kpiCategoryService;

    @PostMapping
    public ResponseEntity<KpiCategoryResponseDto> createKpiCategory(
            @Valid @RequestBody KpiCategoryRequestDto requestDto) {
        KpiCategoryResponseDto responseDto = kpiCategoryService.createKpiCategory(requestDto);
        return new ResponseEntity<>(responseDto, HttpStatus.CREATED);
    }

    @GetMapping
    public ResponseEntity<List<KpiCategoryResponseDto>> getAllKpiCategories() {
        return ResponseEntity.ok(kpiCategoryService.getAllKpiCategories());
    }

    @GetMapping("/{id}")
    public ResponseEntity<KpiCategoryResponseDto> getKpiCategoryById(@PathVariable Integer id) {
        return ResponseEntity.ok(kpiCategoryService.getKpiCategoryById(id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<KpiCategoryResponseDto> updateKpiCategory(
            @PathVariable Integer id,
            @Valid @RequestBody KpiCategoryRequestDto requestDto) {
        return ResponseEntity.ok(kpiCategoryService.updateKpiCategory(id, requestDto));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteKpiCategory(@PathVariable Integer id) {
        kpiCategoryService.deleteKpiCategory(id);
        return ResponseEntity.noContent().build();
    }
}
