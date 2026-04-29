package com.epms.service;

import com.epms.dto.RatingScaleOptionResponse;
import java.util.List;

public interface RatingScaleService {
    List<RatingScaleOptionResponse> getAllRatingScales();
}