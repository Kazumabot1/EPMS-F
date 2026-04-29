package com.epms.service.impl;

import com.epms.dto.FeedbackCampaignCreateRequest;
import com.epms.entity.Employee;
import com.epms.entity.FeedbackCampaign;
import com.epms.entity.FeedbackEvaluatorAssignment;
import com.epms.entity.FeedbackForm;
import com.epms.entity.FeedbackRequest;
import com.epms.entity.enums.FeedbackCampaignStatus;
import com.epms.entity.enums.FeedbackFormStatus;
import com.epms.entity.enums.FeedbackRequestStatus;
import com.epms.exception.BusinessValidationException;
import com.epms.exception.ResourceNotFoundException;
import com.epms.repository.EmployeeRepository;
import com.epms.repository.FeedbackCampaignRepository;
import com.epms.repository.FeedbackEvaluatorAssignmentRepository;
import com.epms.repository.FeedbackFormRepository;
import com.epms.repository.FeedbackRequestRepository;
import com.epms.service.FeedbackCampaignService;
import com.epms.service.FeedbackFormService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class FeedbackCampaignServiceImpl implements FeedbackCampaignService {

    private final FeedbackCampaignRepository feedbackCampaignRepository;
    private final FeedbackRequestRepository feedbackRequestRepository;
    private final FeedbackEvaluatorAssignmentRepository assignmentRepository;
    private final FeedbackFormService feedbackFormService;
    private final FeedbackFormRepository feedbackFormRepository;
    private final EmployeeRepository employeeRepository;

    @Override
    @Transactional
    public FeedbackCampaign createCampaign(FeedbackCampaignCreateRequest request, Long createdByUserId) {
        validateDates(request.getStartDate(), request.getEndDate());

        FeedbackForm form = feedbackFormRepository.findById(request.getFormId())
                .orElseThrow(() -> new ResourceNotFoundException("Feedback form not found."));
        if (form.getStatus() != FeedbackFormStatus.ACTIVE) {
            throw new BusinessValidationException("Only ACTIVE feedback forms can be used in a campaign.");
        }

        FeedbackCampaign campaign = new FeedbackCampaign();
        campaign.setName(request.getName().trim());
        campaign.setStartDate(request.getStartDate());
        campaign.setEndDate(request.getEndDate());
        campaign.setFormId(request.getFormId());
        campaign.setStatus(FeedbackCampaignStatus.DRAFT);
        campaign.setCreatedByUserId(createdByUserId);
        return feedbackCampaignRepository.save(campaign);
    }

    @Override
    @Transactional(readOnly = true)
    public FeedbackCampaign getCampaignById(Long campaignId) {
        return feedbackCampaignRepository.findById(campaignId)
                .orElseThrow(() -> new ResourceNotFoundException("Feedback campaign not found."));
    }

    @Override
    @Transactional(readOnly = true)
    public List<FeedbackCampaign> getAllCampaigns() {
        return feedbackCampaignRepository.findAllByOrderByStartDateDesc();
    }

    @Override
    @Transactional(readOnly = true)
    public List<FeedbackRequest> getRequestsForCampaign(Long campaignId) {
        return feedbackRequestRepository.findByCampaignIdOrderByTargetEmployeeIdAsc(campaignId);
    }

    @Override
    @Transactional
    public List<FeedbackRequest> replaceTargets(Long campaignId, List<Long> targetEmployeeIds, Long requestedByUserId) {
        FeedbackCampaign campaign = getCampaignById(campaignId);
        if (campaign.getStatus() == FeedbackCampaignStatus.CLOSED) {
            throw new BusinessValidationException("Closed campaigns cannot be reconfigured.");
        }

        Set<Long> uniqueTargetIds = normalizeTargetIds(targetEmployeeIds);
        List<Employee> employees = employeeRepository.findAllById(
                uniqueTargetIds.stream().map(Long::intValue).toList()
        );
        if (employees.size() != uniqueTargetIds.size()) {
            throw new ResourceNotFoundException("One or more target employees do not exist.");
        }

        FeedbackForm form = feedbackFormRepository.findById(campaign.getFormId())
                .orElseThrow(() -> new ResourceNotFoundException("Feedback form not found."));
        if (form.getStatus() != FeedbackFormStatus.ACTIVE) {
            throw new BusinessValidationException("Only ACTIVE feedback forms can be assigned to campaign targets.");
        }

        List<FeedbackRequest> existingRequests = feedbackRequestRepository.findByCampaignIdOrderByTargetEmployeeIdAsc(campaignId);
        if (!existingRequests.isEmpty()) {
            List<FeedbackEvaluatorAssignment> assignments = new ArrayList<>();
            for (FeedbackRequest request : existingRequests) {
                assignments.addAll(assignmentRepository.findByFeedbackRequestId(request.getId()));
            }
            if (!assignments.isEmpty()) {
                assignmentRepository.deleteAll(assignments);
            }
            feedbackRequestRepository.deleteAll(existingRequests);
        }

        List<FeedbackRequest> newRequests = uniqueTargetIds.stream()
                .map(targetEmployeeId -> buildRequest(campaign, form, targetEmployeeId, requestedByUserId))
                .toList();
        return feedbackRequestRepository.saveAll(newRequests);
    }

    @Override
    @Transactional(readOnly = true)
    public long countAssignments(Long campaignId) {
        return feedbackRequestRepository.findByCampaignId(campaignId).stream()
                .mapToLong(request -> assignmentRepository.countByFeedbackRequestId(request.getId()))
                .sum();
    }

    private FeedbackRequest buildRequest(FeedbackCampaign campaign, FeedbackForm form, Long targetEmployeeId, Long requestedByUserId) {
        FeedbackRequest request = new FeedbackRequest();
        request.setCampaign(campaign);
        request.setTargetEmployeeId(targetEmployeeId);

        // Legacy persistence fields kept populated until the old table constraints are fully migrated away.
        request.setForm(form);
        request.setRequestedByUserId(requestedByUserId);
        request.setDueAt(null);
        request.setIsAnonymousEnabled(false);
        request.setStatus(FeedbackRequestStatus.PENDING);
        return request;
    }

    private Set<Long> normalizeTargetIds(List<Long> targetEmployeeIds) {
        if (targetEmployeeIds == null || targetEmployeeIds.isEmpty()) {
            throw new BusinessValidationException("At least one target employee is required.");
        }

        Set<Long> uniqueTargetIds = new LinkedHashSet<>();
        for (Long employeeId : targetEmployeeIds) {
            if (employeeId == null) {
                throw new BusinessValidationException("Target employee IDs cannot contain null values.");
            }
            uniqueTargetIds.add(employeeId);
        }
        return uniqueTargetIds;
    }

    private void validateDates(LocalDate startDate, LocalDate endDate) {
        if (startDate == null || endDate == null) {
            throw new BusinessValidationException("Campaign start and end dates are required.");
        }
        if (!startDate.isBefore(endDate)) {
            throw new BusinessValidationException("Campaign start date must be earlier than the end date.");
        }
    }
}
