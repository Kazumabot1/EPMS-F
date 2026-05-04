package com.epms.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Why this file exists:
 * - This DTO shows the update/edit history of a PIP.
 * - It is created from the pip_updates table.
 * - It helps track who edited, when edited, and what changed.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class PipUpdateHistoryDto {
    private Integer id;
    private Integer phaseId;
    private String actionType;
    private String oldValue;
    private String newValue;
    private String comments;
    private Integer updatedBy;
    private String updatedByName;
    private LocalDateTime updatedAt;
}