/*
package com.epms.service.impl;

import com.epms.dto.PositionLevelRequestDto;
import com.epms.dto.PositionLevelResponseDto;
import com.epms.entity.PositionLevel;
import com.epms.exception.DuplicateResourceException;
import com.epms.exception.ResourceNotFoundException;
import com.epms.repository.PositionLevelRepository;
import com.epms.service.PositionLevelService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class PositionLevelServiceImpl implements PositionLevelService {

    private final PositionLevelRepository positionLevelRepository;

    @Override
    public PositionLevelResponseDto create(PositionLevelRequestDto dto) {
        String normalizedLevelCode = normalizeLevelCode(dto.getLevelCode());

        if (positionLevelRepository.existsByLevelCode(normalizedLevelCode)) {
            throw new DuplicateResourceException("Position level already exists with levelCode: " + normalizedLevelCode);
        }

        PositionLevel positionLevel = new PositionLevel();
        positionLevel.setLevelCode(normalizedLevelCode);

        PositionLevel savedPositionLevel = positionLevelRepository.save(positionLevel);
        return mapToResponseDto(savedPositionLevel);
    }

    @Override
    public List<PositionLevelResponseDto> getAll() {
        return positionLevelRepository.findAll()
                .stream()
                .map(this::mapToResponseDto)
                .toList();
    }

    @Override
    public PositionLevelResponseDto getById(Integer id) {
        PositionLevel positionLevel = getEntityById(id);
        return mapToResponseDto(positionLevel);
    }

    @Override
    public PositionLevelResponseDto update(Integer id, PositionLevelRequestDto dto) {
        PositionLevel existingPositionLevel = getEntityById(id);
        String normalizedLevelCode = normalizeLevelCode(dto.getLevelCode());

        positionLevelRepository.findByLevelCode(normalizedLevelCode)
                .filter(positionLevel -> !positionLevel.getId().equals(id))
                .ifPresent(positionLevel -> {
                    throw new DuplicateResourceException(
                            "Position level already exists with levelCode: " + normalizedLevelCode
                    );
                });

        existingPositionLevel.setLevelCode(normalizedLevelCode);
        PositionLevel updatedPositionLevel = positionLevelRepository.save(existingPositionLevel);
        return mapToResponseDto(updatedPositionLevel);
    }

    @Override
    public void delete(Integer id) {
        PositionLevel existingPositionLevel = getEntityById(id);
        positionLevelRepository.delete(existingPositionLevel);
    }

    private PositionLevel getEntityById(Integer id) {
        return positionLevelRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Position level not found with id: " + id));
    }

    private PositionLevelResponseDto mapToResponseDto(PositionLevel positionLevel) {
        return new PositionLevelResponseDto(
                positionLevel.getId(),
                positionLevel.getLevelCode()
        );
    }

    private String normalizeLevelCode(String levelCode) {
        return levelCode == null ? null : levelCode.trim();
    }
}
*/








package com.epms.service.impl;

import com.epms.dto.PositionLevelRequestDto;
import com.epms.dto.PositionLevelResponseDto;
import com.epms.entity.PositionLevel;
import com.epms.exception.BadRequestException;
import com.epms.exception.DuplicateResourceException;
import com.epms.exception.ResourceNotFoundException;
import com.epms.repository.PositionLevelRepository;
import com.epms.security.SecurityUtils;
import com.epms.service.AuditLogService;
import com.epms.service.PositionLevelService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.Date;
import java.util.List;
import java.util.Objects;

@Service
@RequiredArgsConstructor
public class PositionLevelServiceImpl implements PositionLevelService {

    private static final String ENTITY_TYPE = "POSITION_LEVEL";

    private final PositionLevelRepository positionLevelRepository;
    private final AuditLogService auditLogService;

    @Override
    @Transactional
    public PositionLevelResponseDto create(PositionLevelRequestDto dto) {
        String normalizedLevelCode = normalizeRequired(dto.getLevelCode(), "Level code is required.");

        if (positionLevelRepository.existsByLevelCode(normalizedLevelCode)) {
            throw new DuplicateResourceException("Position level already exists with levelCode: " + normalizedLevelCode);
        }

        PositionLevel positionLevel = new PositionLevel();
        positionLevel.setLevelCode(normalizedLevelCode);
        positionLevel.setActive(dto.getActive() == null || Boolean.TRUE.equals(dto.getActive()));
        positionLevel.setCreatedAt(new Date());
        positionLevel.setCreatedBy(currentUserId());

        return mapToResponseDto(positionLevelRepository.save(positionLevel));
    }

    @Override
    @Transactional(readOnly = true)
    public List<PositionLevelResponseDto> getAll() {
        return positionLevelRepository.findAll()
                .stream()
                .sorted(Comparator.comparing(PositionLevel::getLevelCode, String.CASE_INSENSITIVE_ORDER))
                .map(this::mapToResponseDto)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public PositionLevelResponseDto getById(Integer id) {
        return mapToResponseDto(getEntityById(id));
    }

    @Override
    @Transactional
    public PositionLevelResponseDto update(Integer id, PositionLevelRequestDto dto) {
        PositionLevel existing = getEntityById(id);
        String normalizedLevelCode = normalizeRequired(dto.getLevelCode(), "Level code is required.");
        Boolean newActive = dto.getActive() == null ? activeValue(existing.getActive()) : dto.getActive();

        positionLevelRepository.findByLevelCode(normalizedLevelCode)
                .filter(positionLevel -> !positionLevel.getId().equals(id))
                .ifPresent(positionLevel -> {
                    throw new DuplicateResourceException("Position level already exists with levelCode: " + normalizedLevelCode);
                });

        boolean changed = !Objects.equals(existing.getLevelCode(), normalizedLevelCode)
                || !Objects.equals(activeValue(existing.getActive()), activeValue(newActive));
        String reason = normalizeReason(dto.getReason(), changed);

        String oldCode = existing.getLevelCode();
        Boolean oldActive = existing.getActive();

        existing.setLevelCode(normalizedLevelCode);
        existing.setActive(newActive);
        existing.setUpdatedAt(new Date());

        PositionLevel saved = positionLevelRepository.save(existing);
        Integer userId = currentUserId();
        logIfChanged(userId, saved.getId(), "levelCode", oldCode, saved.getLevelCode(), reason);
        logIfChanged(userId, saved.getId(), "active", activeText(oldActive), activeText(saved.getActive()), reason);

        return mapToResponseDto(saved);
    }

    @Override
    @Transactional
    public void delete(Integer id, String reason) {
        PositionLevel existing = getEntityById(id);
        if (Boolean.FALSE.equals(existing.getActive())) {
            throw new BadRequestException("Position level is already inactive.");
        }
        String normalizedReason = normalizeReason(reason, true);
        Boolean oldActive = existing.getActive();
        existing.setActive(false);
        existing.setUpdatedAt(new Date());
        positionLevelRepository.save(existing);
        auditLogService.log(currentUserId(), "DEACTIVATE", ENTITY_TYPE, id, "active", activeText(oldActive), "Inactive", normalizedReason);
    }

    private PositionLevel getEntityById(Integer id) {
        return positionLevelRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Position level not found with id: " + id));
    }

    private PositionLevelResponseDto mapToResponseDto(PositionLevel positionLevel) {
        return new PositionLevelResponseDto(
                positionLevel.getId(),
                positionLevel.getLevelCode(),
                activeValue(positionLevel.getActive()),
                positionLevel.getCreatedAt(),
                positionLevel.getCreatedBy(),
                positionLevel.getUpdatedAt()
        );
    }

    private void logIfChanged(Integer userId, Integer entityId, String column, String oldValue, String newValue, String reason) {
        if (!Objects.equals(valueOrBlank(oldValue), valueOrBlank(newValue))) {
            auditLogService.log(userId, "UPDATE", ENTITY_TYPE, entityId, column, oldValue, newValue, reason);
        }
    }

    private String normalizeRequired(String value, String message) {
        String normalized = normalize(value);
        if (normalized == null) {
            throw new BadRequestException(message);
        }
        return normalized;
    }

    private String normalize(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private String normalizeReason(String reason, boolean required) {
        String normalized = normalize(reason);
        if (required && normalized == null) {
            throw new BadRequestException("Reason is required for edit or deactivate.");
        }
        if (normalized != null && normalized.length() > 150) {
            throw new BadRequestException("Reason must not exceed 150 characters.");
        }
        return normalized;
    }

    private Integer currentUserId() {
        try {
            return SecurityUtils.currentUserId();
        } catch (Exception ignored) {
            return null;
        }
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
}
