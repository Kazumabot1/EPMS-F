//package com.epms.controller;
//
//import com.epms.dto.PipRequestDto;
//import com.epms.dto.PipResponseDto;
//import com.epms.service.PipService;
//import jakarta.validation.Valid;
//import lombok.RequiredArgsConstructor;
//import org.springframework.http.HttpStatus;
//import org.springframework.http.ResponseEntity;
//import org.springframework.web.bind.annotation.DeleteMapping;
//import org.springframework.web.bind.annotation.GetMapping;
//import org.springframework.web.bind.annotation.PathVariable;
//import org.springframework.web.bind.annotation.PostMapping;
//import org.springframework.web.bind.annotation.PutMapping;
//import org.springframework.web.bind.annotation.RequestBody;
//import org.springframework.web.bind.annotation.RequestMapping;
//import org.springframework.web.bind.annotation.RestController;
//
//import java.util.List;
//
//@RestController
//@RequestMapping("/api/pips")
//@RequiredArgsConstructor
//public class PipController {
//
//    private final PipService pipService;
//
//    @PostMapping
//    public ResponseEntity<PipResponseDto> createPip(
//            @Valid @RequestBody PipRequestDto requestDto) {
//        PipResponseDto responseDto = pipService.createPip(requestDto);
//        return new ResponseEntity<>(responseDto, HttpStatus.CREATED);
//    }
//
//    @GetMapping
//    public ResponseEntity<List<PipResponseDto>> getAllPips() {
//        return ResponseEntity.ok(pipService.getAllPips());
//    }
//
//    @GetMapping("/{id}")
//    public ResponseEntity<PipResponseDto> getPipById(@PathVariable Integer id) {
//        return ResponseEntity.ok(pipService.getPipById(id));
//    }
//
//    @PutMapping("/{id}")
//    public ResponseEntity<PipResponseDto> updatePip(
//            @PathVariable Integer id,
//            @Valid @RequestBody PipRequestDto requestDto) {
//        return ResponseEntity.ok(pipService.updatePip(id, requestDto));
//    }
//
//    @DeleteMapping("/{id}")
//    public ResponseEntity<Void> deletePip(@PathVariable Integer id) {
//        pipService.deletePip(id);
//        return ResponseEntity.noContent().build();
//    }
//}


package com.epms.controller;

import com.epms.dto.*;
import com.epms.service.PipService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Why this file exists:
 * - This exposes backend APIs for the new PIP feature.
 * - Frontend uses these endpoints for:
 *   1. Employee dropdown
 *   2. PIP creation
 *   3. Ongoing/Past PIP Plan
 *   4. Detail modal
 *   5. Phase status/reason update
 *   6. Finish PIP
 */
@RestController
@RequestMapping("/api/pips")
@RequiredArgsConstructor
public class PipController {

    private final PipService pipService;

    @GetMapping("/eligible-employees")
    public ResponseEntity<List<PipEligibleEmployeeDto>> getEligibleEmployees() {
        return ResponseEntity.ok(pipService.getEligibleEmployees());
    }

    @PostMapping
    public ResponseEntity<PipDetailResponseDto> createPip(@Valid @RequestBody PipCreateRequestDto requestDto) {
        return new ResponseEntity<>(pipService.createPip(requestDto), HttpStatus.CREATED);
    }

    @GetMapping("/ongoing")
    public ResponseEntity<List<PipDetailResponseDto>> getOngoingPips() {
        return ResponseEntity.ok(pipService.getOngoingPips());
    }

    @GetMapping("/past")
    public ResponseEntity<List<PipDetailResponseDto>> getPastPips() {
        return ResponseEntity.ok(pipService.getPastPips());
    }

    @GetMapping("/{id}")
    public ResponseEntity<PipDetailResponseDto> getPipById(@PathVariable Integer id) {
        return ResponseEntity.ok(pipService.getPipById(id));
    }

    @PutMapping("/{pipId}/phases/{phaseId}")
    public ResponseEntity<PipDetailResponseDto> updatePhase(
            @PathVariable Integer pipId,
            @PathVariable Integer phaseId,
            @Valid @RequestBody PipPhaseUpdateRequestDto requestDto
    ) {
        return ResponseEntity.ok(pipService.updatePhase(pipId, phaseId, requestDto));
    }

    @PostMapping("/{id}/finish")
    public ResponseEntity<PipDetailResponseDto> finishPip(
            @PathVariable Integer id,
            @Valid @RequestBody PipFinishRequestDto requestDto
    ) {
        return ResponseEntity.ok(pipService.finishPip(id, requestDto));
    }
}