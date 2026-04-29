package com.epms.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RatingScaleOptionResponse {

    private Long id;
    private Integer scales;
    private String description;
    private String performanceLevel;
    private String promotionEligibility;
}