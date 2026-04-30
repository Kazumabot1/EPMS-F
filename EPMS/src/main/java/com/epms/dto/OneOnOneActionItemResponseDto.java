package com.epms.dto;

import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
public class OneOnOneActionItemResponseDto {

    private Integer id;
    private Integer meetingId;
    private String description;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    private LocalDate dueDate;
    private String owner;
    private String status;
}