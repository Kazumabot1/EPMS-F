package com.epms.dto;

import lombok.Data;

import java.time.LocalDate;

@Data
public class OneOnOneActionItemRequestDto {

    private Integer meetingId;
    private String description;
    private String owner;
    private String status;
    private LocalDate dueDate;
}