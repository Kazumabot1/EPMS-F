package com.epms.service.impl;

import com.epms.entity.AppraisalScoreBand;
import com.epms.exception.BadRequestException;
import com.epms.exception.ResourceNotFoundException;
import com.epms.repository.AppraisalScoreBandRepository;
import com.epms.service.AppraisalScoreBandService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class AppraisalScoreBandServiceImpl implements AppraisalScoreBandService {

    private final AppraisalScoreBandRepository scoreBandRepository;

    @Override
    @Transactional(readOnly = true)
    public List<AppraisalScoreBand> getActiveScoreBands() {
        return scoreBandRepository.findByActiveTrueOrderBySortOrderAsc();
    }

    @Override
    public AppraisalScoreBand saveScoreBand(AppraisalScoreBand scoreBand) {
        if (scoreBand == null) {
            throw new BadRequestException("Score band is required.");
        }
        if (scoreBand.getMinScore() == null || scoreBand.getMaxScore() == null) {
            throw new BadRequestException("Score band min and max score are required.");
        }
        if (scoreBand.getMinScore() < 0 || scoreBand.getMaxScore() > 100 || scoreBand.getMinScore() > scoreBand.getMaxScore()) {
            throw new BadRequestException("Score band must be within 0-100 and min score cannot exceed max score.");
        }
        if (scoreBand.getLabel() == null || scoreBand.getLabel().isBlank()) {
            throw new BadRequestException("Score band label is required.");
        }
        return scoreBandRepository.save(scoreBand);
    }

    @Override
    public void deleteScoreBand(Integer scoreBandId) {
        AppraisalScoreBand scoreBand = scoreBandRepository.findById(scoreBandId)
                .orElseThrow(() -> new ResourceNotFoundException("Score band not found with id: " + scoreBandId));
        scoreBandRepository.delete(scoreBand);
    }
}
