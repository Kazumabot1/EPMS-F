package com.epms.service;

import com.epms.dto.OneOnOneActionItemRequestDto;
import com.epms.dto.OneOnOneActionItemResponseDto;

import java.util.List;
import java.util.Optional;

public interface OneOnOneActionItemService {

    List<OneOnOneActionItemResponseDto> getAll();

    OneOnOneActionItemResponseDto saveActionItem(OneOnOneActionItemRequestDto request);

    OneOnOneActionItemResponseDto updateActionItem(Integer id, OneOnOneActionItemRequestDto request);

    Optional<OneOnOneActionItemResponseDto> getByMeetingId(Integer meetingId);
}