package com.epms.controller;

import com.epms.dto.KpiFormRequestDTO;
import com.epms.dto.KpiFormResponseDTO;
import com.epms.service.KpiFormService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/hr/kpi-templates")
@RequiredArgsConstructor
@PreAuthorize(
        "hasAnyRole('HR', 'ADMIN') "
                + "or principal.dashboard == 'HR_DASHBOARD' "
                + "or principal.dashboard == 'ADMIN_DASHBOARD'"
)
public class KpiTemplateController {

    private final KpiFormService kpiFormService;

    @PostMapping("/create")
    public ResponseEntity<KpiFormResponseDTO> create(@Valid @RequestBody KpiFormRequestDTO dto) {
        return new ResponseEntity<>(kpiFormService.createTemplate(dto), HttpStatus.CREATED);
    }

    @PutMapping("/update/{id}")
    public ResponseEntity<KpiFormResponseDTO> update(@PathVariable Integer id, @Valid @RequestBody KpiFormRequestDTO dto) {
        return ResponseEntity.ok(kpiFormService.updateTemplate(id, dto));
    }

    @GetMapping("/list")
    public ResponseEntity<List<KpiFormResponseDTO>> list() {
        return ResponseEntity.ok(kpiFormService.getAllTemplates());
    }

    @GetMapping("/{id}")
    public ResponseEntity<KpiFormResponseDTO> getById(@PathVariable Integer id) {
        return ResponseEntity.ok(kpiFormService.getTemplateById(id));
    }

    @DeleteMapping("/delete/{id}")
    public ResponseEntity<Void> delete(@PathVariable Integer id) {
        kpiFormService.deleteTemplate(id);
        return ResponseEntity.noContent().build();
    }
}
