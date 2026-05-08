package com.epms.service;

import com.epms.entity.AppraisalScoreBand;

import java.util.List;

public interface AppraisalScoreBandService {

    List<AppraisalScoreBand> getActiveScoreBands();

    AppraisalScoreBand saveScoreBand(AppraisalScoreBand scoreBand);

    void deleteScoreBand(Integer scoreBandId);
}
