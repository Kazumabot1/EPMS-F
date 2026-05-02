//package com.epms.service;
//
//import com.epms.dto.PipRequestDto;
//import com.epms.dto.PipResponseDto;
//
//import java.util.List;///Zlo
//
//public interface PipService {
//
//    PipResponseDto createPip(PipRequestDto requestDto);
//
//    List<PipResponseDto> getAllPips();
//
//    PipResponseDto getPipById(Integer id);
//
//    PipResponseDto updatePip(Integer id, PipRequestDto requestDto);
//
//    void deletePip(Integer id);
//}


package com.epms.service;

import com.epms.dto.*;

import java.util.List;

/**
 * Why this file exists:
 * - This service interface defines the PIP workflow.
 * - Controller calls this interface instead of putting business logic in controller.
 */
public interface PipService {
    List<PipEligibleEmployeeDto> getEligibleEmployees();

    PipDetailResponseDto createPip(PipCreateRequestDto requestDto);

    List<PipDetailResponseDto> getOngoingPips();

    List<PipDetailResponseDto> getPastPips();

    PipDetailResponseDto getPipById(Integer id);

    PipDetailResponseDto updatePhase(Integer pipId, Integer phaseId, PipPhaseUpdateRequestDto requestDto);

    PipDetailResponseDto finishPip(Integer id, PipFinishRequestDto requestDto);
}