/*
package com.epms.service.impl;

import com.epms.dto.RoleRequestDto;
import com.epms.dto.RoleResponseDto;
import com.epms.entity.Role;
import com.epms.exception.ResourceNotFoundException;
import com.epms.repository.RoleRepository;
import com.epms.service.RoleService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class RoleServiceImpl implements RoleService {

    private final RoleRepository roleRepository;

    @Override
    public RoleResponseDto createRole(RoleRequestDto requestDto) {
        Role role = new Role();
        role.setName(requestDto.getName().trim());
        role.setDescription(requestDto.getDescription() != null ? requestDto.getDescription().trim() : null);

        Role savedRole = roleRepository.save(role);
        return mapToResponseDto(savedRole);
    }

    @Override
    public List<RoleResponseDto> getAllRoles() {
        return roleRepository.findAll()
                .stream()
                .map(this::mapToResponseDto)
                .toList();
    }

    @Override
    public RoleResponseDto getRoleById(Integer id) {
        Role role = getRoleEntityById(id);
        return mapToResponseDto(role);
    }

    @Override
    public RoleResponseDto updateRole(Integer id, RoleRequestDto requestDto) {
        Role existingRole = getRoleEntityById(id);
        existingRole.setName(requestDto.getName().trim());
        existingRole.setDescription(requestDto.getDescription() != null ? requestDto.getDescription().trim() : null);

        Role updatedRole = roleRepository.save(existingRole);
        return mapToResponseDto(updatedRole);
    }

    @Override
    public void deleteRole(Integer id) {
        Role existingRole = getRoleEntityById(id);
        roleRepository.delete(existingRole);
    }

    private Role getRoleEntityById(Integer id) {
        return roleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Role not found with id: " + id));
    }

    private RoleResponseDto mapToResponseDto(Role role) {
        return new RoleResponseDto(
                role.getId(),
                role.getName(),
                role.getDescription()
        );
    }
}
*/





package com.epms.service.impl;

import com.epms.dto.RoleRequestDto;
import com.epms.dto.RoleResponseDto;
import com.epms.entity.Role;
import com.epms.exception.BadRequestException;
import com.epms.exception.DuplicateResourceException;
import com.epms.exception.ResourceNotFoundException;
import com.epms.repository.RoleRepository;
import com.epms.security.SecurityUtils;
import com.epms.service.AuditLogService;
import com.epms.service.RoleService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.Date;
import java.util.List;
import java.util.Objects;

@Service
@RequiredArgsConstructor
public class RoleServiceImpl implements RoleService {

    private static final String ENTITY_TYPE = "ROLE";

    private final RoleRepository roleRepository;
    private final AuditLogService auditLogService;

    @Override
    @Transactional
    public RoleResponseDto createRole(RoleRequestDto requestDto) {
        String name = normalizeRequired(requestDto.getName(), "Role name is required.").toUpperCase();
        ensureNameAvailable(name, null);

        Role role = new Role();
        role.setName(name);
        role.setDescription(normalize(requestDto.getDescription()));
        role.setActive(requestDto.getActive() == null || Boolean.TRUE.equals(requestDto.getActive()));
        role.setCreatedAt(new Date());
        role.setCreatedBy(currentUserId());

        return mapToResponseDto(roleRepository.save(role));
    }

    @Override
    @Transactional(readOnly = true)
    public List<RoleResponseDto> getAllRoles() {
        return roleRepository.findAll()
                .stream()
                .sorted(Comparator.comparing(Role::getName, String.CASE_INSENSITIVE_ORDER))
                .map(this::mapToResponseDto)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public RoleResponseDto getRoleById(Integer id) {
        return mapToResponseDto(getRoleEntityById(id));
    }

    @Override
    @Transactional
    public RoleResponseDto updateRole(Integer id, RoleRequestDto requestDto) {
        Role existing = getRoleEntityById(id);
        String name = normalizeRequired(requestDto.getName(), "Role name is required.").toUpperCase();
        String description = normalize(requestDto.getDescription());
        Boolean newActive = requestDto.getActive() == null ? activeValue(existing.getActive()) : requestDto.getActive();

        ensureNameAvailable(name, id);

        boolean changed = !Objects.equals(existing.getName(), name)
                || !Objects.equals(valueOrBlank(existing.getDescription()), valueOrBlank(description))
                || !Objects.equals(activeValue(existing.getActive()), activeValue(newActive));
        String reason = normalizeReason(requestDto.getReason(), changed);

        String oldName = existing.getName();
        String oldDescription = existing.getDescription();
        Boolean oldActive = existing.getActive();

        existing.setName(name);
        existing.setDescription(description);
        existing.setActive(newActive);
        existing.setUpdatedAt(new Date());

        Role saved = roleRepository.save(existing);
        Integer userId = currentUserId();
        logIfChanged(userId, saved.getId(), "name", oldName, saved.getName(), reason);
        logIfChanged(userId, saved.getId(), "description", oldDescription, saved.getDescription(), reason);
        logIfChanged(userId, saved.getId(), "active", activeText(oldActive), activeText(saved.getActive()), reason);

        return mapToResponseDto(saved);
    }

    @Override
    @Transactional
    public void deleteRole(Integer id, String reason) {
        Role existing = getRoleEntityById(id);
        if (Boolean.FALSE.equals(existing.getActive())) {
            throw new BadRequestException("Role is already inactive.");
        }
        String normalizedReason = normalizeReason(reason, true);
        Boolean oldActive = existing.getActive();
        existing.setActive(false);
        existing.setUpdatedAt(new Date());
        roleRepository.save(existing);
        auditLogService.log(currentUserId(), "DEACTIVATE", ENTITY_TYPE, id, "active", activeText(oldActive), "Inactive", normalizedReason);
    }

    private Role getRoleEntityById(Integer id) {
        return roleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Role not found with id: " + id));
    }

    private void ensureNameAvailable(String name, Integer currentId) {
        roleRepository.findByNameIgnoreCase(name)
                .filter(existing -> currentId == null || !existing.getId().equals(currentId))
                .ifPresent(existing -> {
                    throw new DuplicateResourceException("Role name already exists: " + name);
                });
    }

    private RoleResponseDto mapToResponseDto(Role role) {
        return new RoleResponseDto(
                role.getId(),
                role.getName(),
                role.getDescription(),
                activeValue(role.getActive()),
                role.getCreatedAt(),
                role.getCreatedBy(),
                role.getUpdatedAt()
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
