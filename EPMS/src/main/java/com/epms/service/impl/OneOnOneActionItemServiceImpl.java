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
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class OneOnOneActionItemServiceImpl implements OneOnOneActionItemService {

    private final OneOnOneActionItemRepository actionItemRepo;
    private final OneOnOneMeetingRepository meetingRepo;

    @Override
    @Transactional
    public OneOnOneActionItemResponseDto saveActionItem(OneOnOneActionItemRequestDto request) {
        if (request.getMeetingId() == null) {
            throw new RuntimeException("Meeting is required.");
        }

        if (request.getDescription() != null && request.getDescription().length() > 1000) {
            throw new RuntimeException("Meeting Description / Action Items cannot exceed 1000 characters.");
        }

        OneOnOneMeeting meeting = meetingRepo.findById(request.getMeetingId())
                .orElseThrow(() -> new RuntimeException("Meeting not found: " + request.getMeetingId()));

        OneOnOneActionItem item = actionItemRepo.findByMeetingId(request.getMeetingId())
                .orElse(new OneOnOneActionItem());

        LocalDateTime now = LocalDateTime.now();

        if (item.getId() == null) {
            item.setCreatedAt(now);
        }

        item.setMeeting(meeting);
        item.setDescription(request.getDescription());
        item.setUpdatedAt(now);
        item.setStatus("RECORDED");

        Employee employee = meeting.getEmployee();
        if (employee != null) {
            String first = employee.getFirstName() != null ? employee.getFirstName() : "";
            String last = employee.getLastName() != null ? employee.getLastName() : "";
            item.setOwner((first + " " + last).trim());
        }

        return toDto(actionItemRepo.save(item));
    }

    @Override
    public Optional<OneOnOneActionItemResponseDto> getByMeetingId(Integer meetingId) {
        return actionItemRepo.findByMeetingId(meetingId).map(this::toDto);
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
}