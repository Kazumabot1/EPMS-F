package com.epms.controller;

import com.epms.dto.GenericApiResponse;
import com.epms.dto.RatingScaleOptionResponse;
import com.epms.service.RatingScaleService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/rating-scales")
@RequiredArgsConstructor
public class RatingScaleController {

    private final RatingScaleService ratingScaleService;

    @GetMapping
    public ResponseEntity<GenericApiResponse<List<RatingScaleOptionResponse>>> getRatingScales() {
        return ResponseEntity.ok(
                GenericApiResponse.success(
                        "Rating scales retrieved successfully",
                        ratingScaleService.getAllRatingScales()
                )
        );
    }
}