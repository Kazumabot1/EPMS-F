package com.epms.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * Why this file exists:
 * - Final comments are required before ending a PIP.
 * - This helps keep a final progress/result note in the record.
 */
@Data
public class PipFinishRequestDto {
    @NotBlank(message = "Final comments are required.")
    private String comments;
}