package com.epms.service.impl;

import com.epms.dto.OneOnOneActionItemRequestDto;
import com.epms.dto.OneOnOneActionItemResponseDto;
import com.epms.entity.Employee;
import com.epms.entity.OneOnOneActionItem;
import com.epms.entity.OneOnOneMeeting;
import com.epms.repository.OneOnOneActionItemRepository;
import com.epms.repository.OneOnOneMeetingRepository;
import com.epms.service.OneOnOneActionItemService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class OneOnOneActionItemServiceImpl implements OneOnOneActionItemService {

    private final OneOnOneActionItemRepository actionItemRepo;
    private final OneOnOneMeetingRepository meetingRepo;

    @Override
    @Transactional(readOnly = true)
    public List<OneOnOneActionItemResponseDto> getAll() {
        return actionItemRepo.findAllByOrderByUpdatedAtDesc()
                .stream()
                .map(this::toDto)
                .toList();
    }

    @Override
    @Transactional
    public OneOnOneActionItemResponseDto saveActionItem(OneOnOneActionItemRequestDto request) {
        validateRequest(request);

        OneOnOneMeeting meeting = meetingRepo.findById(request.getMeetingId())
                .orElseThrow(() -> new RuntimeException("Meeting not found: " + request.getMeetingId()));

        OneOnOneActionItem item = actionItemRepo.findByMeetingId(request.getMeetingId())
                .orElseGet(OneOnOneActionItem::new);

        LocalDateTime now = LocalDateTime.now();

        if (item.getId() == null) {
            item.setCreatedAt(now);
        }

        item.setMeeting(meeting);
        applyRequest(item, request, meeting);
        item.setUpdatedAt(now);

        return toDto(actionItemRepo.save(item));
    }

    @Override
    @Transactional
    public OneOnOneActionItemResponseDto updateActionItem(Integer id, OneOnOneActionItemRequestDto request) {
        OneOnOneActionItem item = actionItemRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Action item not found: " + id));

        OneOnOneMeeting meeting = item.getMeeting();

        if (request.getMeetingId() != null) {
            meeting = meetingRepo.findById(request.getMeetingId())
                    .orElseThrow(() -> new RuntimeException("Meeting not found: " + request.getMeetingId()));
            item.setMeeting(meeting);
        }

        applyRequest(item, request, meeting);
        item.setUpdatedAt(LocalDateTime.now());

        return toDto(actionItemRepo.save(item));
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<OneOnOneActionItemResponseDto> getByMeetingId(Integer meetingId) {
        return actionItemRepo.findByMeetingId(meetingId).map(this::toDto);
    }

    private void validateRequest(OneOnOneActionItemRequestDto request) {
        if (request == null) {
            throw new RuntimeException("Action item request is required.");
        }

        if (request.getMeetingId() == null) {
            throw new RuntimeException("Meeting is required.");
        }

        if (request.getDescription() != null && request.getDescription().length() > 1000) {
            throw new RuntimeException("Meeting Description / Action Items cannot exceed 1000 characters.");
        }
    }

    private void applyRequest(
            OneOnOneActionItem item,
            OneOnOneActionItemRequestDto request,
            OneOnOneMeeting meeting
    ) {
        if (request.getDescription() != null && request.getDescription().length() > 1000) {
            throw new RuntimeException("Meeting Description / Action Items cannot exceed 1000 characters.");
        }

        item.setDescription(cleanNullable(request.getDescription()));

        if (request.getDueDate() != null) {
            item.setDueDate(request.getDueDate());
        }

        if (request.getStatus() != null && !request.getStatus().isBlank()) {
            item.setStatus(request.getStatus().trim());
        } else if (item.getStatus() == null || item.getStatus().isBlank()) {
            item.setStatus("RECORDED");
        }

        if (request.getOwner() != null && !request.getOwner().isBlank()) {
            item.setOwner(request.getOwner().trim());
        } else if (item.getOwner() == null || item.getOwner().isBlank()) {
            item.setOwner(resolveOwnerName(meeting));
        }
    }

    private String resolveOwnerName(OneOnOneMeeting meeting) {
        if (meeting == null || meeting.getEmployee() == null) {
            return null;
        }

        Employee employee = meeting.getEmployee();

        String firstName = employee.getFirstName() == null ? "" : employee.getFirstName().trim();
        String lastName = employee.getLastName() == null ? "" : employee.getLastName().trim();
        String fullName = (firstName + " " + lastName).trim();

        if (!fullName.isBlank()) {
            return fullName;
        }

        return employee.getEmail();
    }

    private OneOnOneActionItemResponseDto toDto(OneOnOneActionItem item) {
        OneOnOneActionItemResponseDto dto = new OneOnOneActionItemResponseDto();

        dto.setId(item.getId());
        dto.setMeetingId(item.getMeeting() != null ? item.getMeeting().getId() : null);
        dto.setDescription(item.getDescription());
        dto.setCreatedAt(item.getCreatedAt());
        dto.setUpdatedAt(item.getUpdatedAt());
        dto.setDueDate(item.getDueDate());
        dto.setOwner(item.getOwner());
        dto.setStatus(item.getStatus());

        return dto;
    }

    private String cleanNullable(String value) {
        if (value == null || value.trim().isEmpty()) {
            return null;
        }

        return value.trim();
    }
}