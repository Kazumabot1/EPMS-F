/*
package com.epms.service.impl;

import com.epms.dto.PositionRequestDto;
import com.epms.dto.PositionResponseDto;
import com.epms.entity.Position;
import com.epms.entity.PositionLevel;
import com.epms.exception.BadRequestException;
import com.epms.exception.ResourceNotFoundException;
import com.epms.repository.PositionLevelRepository;
import com.epms.repository.PositionRepository;
import com.epms.service.PositionService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class PositionServiceImpl implements PositionService {

    private final PositionRepository positionRepository;
    private final PositionLevelRepository positionLevelRepository;

    @Override
    @Transactional
    public PositionResponseDto create(PositionRequestDto dto) {
        PositionLevel level = getLevelById(dto.getLevelId());

        Position position = new Position();
        position.setPositionTitle(normalizeText(dto.getPositionTitle()));
        position.setLevel(level);
        position.setDescription(normalizeText(dto.getDescription()));
        position.setStatus(dto.getStatus() != null ? dto.getStatus() : Boolean.TRUE);
        position.setCreatedBy(normalizeText(dto.getCreatedBy()));

        Position savedPosition = positionRepository.save(position);
        return mapToResponseDto(savedPosition);
    }

    @Override
    @Transactional(readOnly = true)
    public List<PositionResponseDto> getAll() {
        return positionRepository.findAll()
                .stream()
                .map(this::mapToResponseDto)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public PositionResponseDto getById(Integer id) {
        Position position = getPositionById(id);
        return mapToResponseDto(position);
    }

    @Override
    @Transactional
    public PositionResponseDto update(Integer id, PositionRequestDto dto) {
        Position existingPosition = getPositionById(id);
        PositionLevel level = getLevelById(dto.getLevelId());

        existingPosition.setPositionTitle(normalizeText(dto.getPositionTitle()));
        existingPosition.setLevel(level);
        existingPosition.setDescription(normalizeText(dto.getDescription()));
        existingPosition.setStatus(dto.getStatus() != null ? dto.getStatus() : existingPosition.getStatus());

        Position updatedPosition = positionRepository.save(existingPosition);
        return mapToResponseDto(updatedPosition);
    }

    @Override
    @Transactional
    public void delete(Integer id) {
        Position existingPosition = getPositionById(id);
        positionRepository.delete(existingPosition);
    }

    private Position getPositionById(Integer id) {
        return positionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Position not found with id: " + id));
    }

    private PositionLevel getLevelById(Integer levelId) {
        if (levelId == null) {
            throw new BadRequestException("Level id must not be null");
        }

        return positionLevelRepository.findById(levelId)
                .orElseThrow(() -> new ResourceNotFoundException("Position level not found with id: " + levelId));
    }

    private PositionResponseDto mapToResponseDto(Position position) {
        PositionLevel level = position.getLevel();

        Integer levelId = level != null ? level.getId() : null;
        String levelCode = level != null ? level.getLevelCode() : null;

        return new PositionResponseDto(
                position.getId(),
                position.getPositionTitle(),
                levelId,
                levelCode,
                position.getDescription(),
                position.getStatus(),
                position.getCreatedAt(),
                position.getCreatedBy()
        );
    }

    private String normalizeText(String value) {
        if (value == null) {
            return null;
        }

        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}*/









package com.epms.service.impl;

import com.epms.dto.PositionRequestDto;
import com.epms.dto.PositionResponseDto;
import com.epms.entity.Position;
import com.epms.entity.PositionLevel;
import com.epms.exception.BadRequestException;
import com.epms.exception.ResourceNotFoundException;
import com.epms.repository.PositionLevelRepository;
import com.epms.repository.PositionRepository;
import com.epms.security.SecurityUtils;
import com.epms.service.AuditLogService;
import com.epms.service.PositionService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Objects;

@Service
@RequiredArgsConstructor
public class PositionServiceImpl implements PositionService {

    private static final String ENTITY_TYPE = "POSITION";

    private final PositionRepository positionRepository;
    private final PositionLevelRepository positionLevelRepository;
    private final AuditLogService auditLogService;

    @Override
    @Transactional
    public PositionResponseDto create(PositionRequestDto dto) {
        PositionLevel level = getLevelById(dto.getLevelId());

        Position position = new Position();
        position.setPositionTitle(normalizeRequired(dto.getPositionTitle(), "Position title is required."));
        position.setLevel(level);
        position.setDescription(normalizeText(dto.getDescription()));
        position.setStatus(dto.getStatus() != null ? dto.getStatus() : Boolean.TRUE);
        position.setCreatedBy(normalizeText(dto.getCreatedBy()));

        Position savedPosition = positionRepository.save(position);
        return mapToResponseDto(savedPosition);
    }

    @Override
    @Transactional(readOnly = true)
    public List<PositionResponseDto> getAll() {
        return positionRepository.findAll()
                .stream()
                .map(this::mapToResponseDto)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public PositionResponseDto getById(Integer id) {
        Position position = getPositionById(id);
        return mapToResponseDto(position);
    }

    @Override
    @Transactional
    public PositionResponseDto update(Integer id, PositionRequestDto dto) {
        Position existingPosition = getPositionById(id);
        PositionLevel newLevel = getLevelById(dto.getLevelId());

        String newTitle = normalizeRequired(dto.getPositionTitle(), "Position title is required.");
        String newDescription = normalizeText(dto.getDescription());
        Boolean newStatus = dto.getStatus() != null ? dto.getStatus() : activeValue(existingPosition.getStatus());

        String oldTitle = existingPosition.getPositionTitle();
        PositionLevel oldLevel = existingPosition.getLevel();
        String oldDescription = existingPosition.getDescription();
        Boolean oldStatus = existingPosition.getStatus();

        boolean changed = !Objects.equals(valueOrBlank(oldTitle), valueOrBlank(newTitle))
                || !Objects.equals(oldLevel != null ? oldLevel.getId() : null, newLevel.getId())
                || !Objects.equals(valueOrBlank(oldDescription), valueOrBlank(newDescription))
                || !Objects.equals(activeValue(oldStatus), activeValue(newStatus));

        String reason = normalizeReason(dto.getReason(), changed);

        existingPosition.setPositionTitle(newTitle);
        existingPosition.setLevel(newLevel);
        existingPosition.setDescription(newDescription);
        existingPosition.setStatus(newStatus);

        Position updatedPosition = positionRepository.save(existingPosition);
        Integer userId = currentUserId();

        logIfChanged(userId, updatedPosition.getId(), "positionTitle", oldTitle, updatedPosition.getPositionTitle(), reason);
        logIfChanged(userId, updatedPosition.getId(), "positionLevel", levelLabel(oldLevel), levelLabel(updatedPosition.getLevel()), reason);
        logIfChanged(userId, updatedPosition.getId(), "description", oldDescription, updatedPosition.getDescription(), reason);
        logIfChanged(userId, updatedPosition.getId(), "status", activeText(oldStatus), activeText(updatedPosition.getStatus()), reason);

        return mapToResponseDto(updatedPosition);
    }

    @Override
    @Transactional
    public void delete(Integer id) {
        Position existingPosition = getPositionById(id);
        positionRepository.delete(existingPosition);
    }

    private Position getPositionById(Integer id) {
        return positionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Position not found with id: " + id));
    }

    private PositionLevel getLevelById(Integer levelId) {
        if (levelId == null) {
            throw new BadRequestException("Level id must not be null");
        }

        return positionLevelRepository.findById(levelId)
                .orElseThrow(() -> new ResourceNotFoundException("Position level not found with id: " + levelId));
    }

    private PositionResponseDto mapToResponseDto(Position position) {
        PositionLevel level = position.getLevel();

        Integer levelId = level != null ? level.getId() : null;
        String levelCode = level != null ? level.getLevelCode() : null;

        return new PositionResponseDto(
                position.getId(),
                position.getPositionTitle(),
                levelId,
                levelCode,
                position.getDescription(),
                position.getStatus(),
                position.getCreatedAt(),
                position.getCreatedBy()
        );
    }

    private void logIfChanged(Integer userId, Integer entityId, String column, String oldValue, String newValue, String reason) {
        if (!Objects.equals(valueOrBlank(oldValue), valueOrBlank(newValue))) {
            auditLogService.log(userId, "UPDATE", ENTITY_TYPE, entityId, column, oldValue, newValue, reason);
        }
    }

    private String normalizeRequired(String value, String message) {
        String normalized = normalizeText(value);
        if (normalized == null) {
            throw new BadRequestException(message);
        }
        return normalized;
    }

    private String normalizeText(String value) {
        if (value == null) {
            return null;
        }

        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private String normalizeReason(String reason, boolean required) {
        String normalized = normalizeText(reason);
        if (required && normalized == null) {
            throw new BadRequestException("Reason is required for edit or deactivate.");
        }
        if (normalized != null && normalized.length() > 150) {
            throw new BadRequestException("Reason must not exceed 150 characters.");
        }
        return normalized;
    }

    private String levelLabel(PositionLevel level) {
        if (level == null) {
            return null;
        }
        return level.getLevelCode() != null ? level.getLevelCode() : String.valueOf(level.getId());
    }

    private Boolean activeValue(Boolean value) {
        return value == null || Boolean.TRUE.equals(value);
    }

    private String activeText(Boolean value) {
        return activeValue(value) ? "Active" : "Inactive";
    }

    private String valueOrBlank(String value) {
        return value == null ? "" : value;
    }

    private Integer currentUserId() {
        try {
            return SecurityUtils.currentUserId();
        } catch (Exception ignored) {
            return null;
        }
    }
}
