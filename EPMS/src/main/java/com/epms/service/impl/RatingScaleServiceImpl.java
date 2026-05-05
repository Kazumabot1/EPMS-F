package com.epms.service.impl;

import com.epms.dto.RatingScaleOptionResponse;
import com.epms.repository.RatingScaleRepository;
import com.epms.service.RatingScaleService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class RatingScaleServiceImpl implements RatingScaleService {

    private final RatingScaleRepository ratingScaleRepository;

    @Override
    public List<RatingScaleOptionResponse> getAllRatingScales() {
        return ratingScaleRepository.findAll().stream()
                .map(scale -> RatingScaleOptionResponse.builder()
                        .id(scale.getId().longValue())
                        .scales(scale.getScales())
                        .description(scale.getDescription())
                        .performanceLevel(scale.getPerformanceLevel())
                        .promotionEligibility(scale.getPromotionEligibility())
                        .build())
                .toList();
    }
}