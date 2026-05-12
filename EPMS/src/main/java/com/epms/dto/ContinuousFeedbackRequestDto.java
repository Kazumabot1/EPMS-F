package com.epms.dto;

import lombok.Data;

@Data
public class ContinuousFeedbackRequestDto {
    private Integer teamId;
    private Integer employeeId;
    private String feedbackText;
    private String category;
    private Integer rating;
}