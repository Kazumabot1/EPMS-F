package com.epms.service;

import com.epms.dto.AssessmentFormDtos.AssessmentFormPayload;
import com.epms.dto.AssessmentFormDtos.AssessmentFormResponse;

import java.util.List;

public interface AssessmentFormDefinitionService {

    List<AssessmentFormResponse> getAll();

    AssessmentFormResponse getById(Integer id);

    AssessmentFormResponse create(AssessmentFormPayload payload);

    AssessmentFormResponse update(Integer id, AssessmentFormPayload payload);

    void deactivate(Integer id);
}