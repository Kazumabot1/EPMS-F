package com.epms.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * Why this file exists:
 * - Used when creator updates a phase after PIP starts.
 * - Creator can update phase status and reason/note.
 */
@Data
public class PipPhaseUpdateRequestDto {
    @NotBlank(message = "Phase status is required.")
    private String status;

    private String reasonNote;
}