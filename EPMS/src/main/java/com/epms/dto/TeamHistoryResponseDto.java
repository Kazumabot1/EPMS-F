package com.epms.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Date;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class TeamHistoryResponseDto {
    private Integer id;

    private Integer teamId;
    private String teamName;

    private String actionType;
    private String fieldName;

    private String oldValue;
    private String newValue;

    private String reason;

    private Integer changedById;
    private String changedByName;

    private Date changedAt;
}