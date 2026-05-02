package com.epms.service.impl;

import com.epms.dto.PipUpdateRequestDto;
import com.epms.dto.PipUpdateResponseDto;
import com.epms.entity.PipUpdate;
import com.epms.exception.ResourceNotFoundException;
import com.epms.repository.PipUpdateRepository;
import com.epms.service.PipUpdateService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Why this file exists:
 * - Keeps the old PipUpdateController/PipUpdateService working.
 * - New automatic PIP history is mainly written by PipServiceImpl.
 * - This service still allows basic CRUD for pip_updates if existing screens use it.
 */
@Service
@RequiredArgsConstructor
public class PipUpdateServiceImpl implements PipUpdateService {

    private final PipUpdateRepository pipUpdateRepository;

    @Override
    public PipUpdateResponseDto createPipUpdate(PipUpdateRequestDto requestDto) {
        PipUpdate pipUpdate = new PipUpdate();
        pipUpdate.setPipId(requestDto.getPipId());
        pipUpdate.setComments(requestDto.getComments() != null ? requestDto.getComments().trim() : null);
        pipUpdate.setStatus(requestDto.getStatus());
        pipUpdate.setUpdatedBy(requestDto.getUpdatedBy());
        pipUpdate.setUpdatedAt(LocalDateTime.now());

        PipUpdate savedPipUpdate = pipUpdateRepository.save(pipUpdate);
        return mapToResponseDto(savedPipUpdate);
    }

    @Override
    public List<PipUpdateResponseDto> getAllPipUpdates() {
        return pipUpdateRepository.findAll()
                .stream()
                .map(this::mapToResponseDto)
                .toList();
    }

    @Override
    public PipUpdateResponseDto getPipUpdateById(Integer id) {
        PipUpdate pipUpdate = getPipUpdateEntityById(id);
        return mapToResponseDto(pipUpdate);
    }

    @Override
    public PipUpdateResponseDto updatePipUpdate(Integer id, PipUpdateRequestDto requestDto) {
        PipUpdate existingPipUpdate = getPipUpdateEntityById(id);

        existingPipUpdate.setPipId(requestDto.getPipId());
        existingPipUpdate.setComments(requestDto.getComments() != null ? requestDto.getComments().trim() : null);
        existingPipUpdate.setStatus(requestDto.getStatus());
        existingPipUpdate.setUpdatedBy(requestDto.getUpdatedBy());
        existingPipUpdate.setUpdatedAt(LocalDateTime.now());

        PipUpdate updatedPipUpdate = pipUpdateRepository.save(existingPipUpdate);
        return mapToResponseDto(updatedPipUpdate);
    }

    @Override
    public void deletePipUpdate(Integer id) {
        PipUpdate existingPipUpdate = getPipUpdateEntityById(id);
        pipUpdateRepository.delete(existingPipUpdate);
    }

    private PipUpdate getPipUpdateEntityById(Integer id) {
        return pipUpdateRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("PipUpdate not found with id: " + id));
    }

    private PipUpdateResponseDto mapToResponseDto(PipUpdate pipUpdate) {
        return new PipUpdateResponseDto(
                pipUpdate.getId(),
                pipUpdate.getPipId(),
                pipUpdate.getComments(),
                pipUpdate.getStatus(),
                pipUpdate.getUpdatedBy(),
                pipUpdate.getUpdatedAt()
        );
    }
}