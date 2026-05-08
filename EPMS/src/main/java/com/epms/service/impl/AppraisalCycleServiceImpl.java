package com.epms.service.impl;

import com.epms.dto.appraisal.AppraisalCycleRequest;
import com.epms.dto.appraisal.AppraisalCycleResponse;
import com.epms.dto.appraisal.AppraisalTemplateCycleRequest;
import com.epms.dto.appraisal.AppraisalTemplateResponse;
import com.epms.entity.*;
import com.epms.entity.enums.AppraisalCycleStatus;
import com.epms.entity.enums.AppraisalCycleType;
import com.epms.exception.BadRequestException;
import com.epms.exception.DuplicateResourceException;
import com.epms.exception.ResourceNotFoundException;
import com.epms.repository.*;
import com.epms.service.AppraisalCycleService;
import com.epms.service.AppraisalTemplateService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class AppraisalCycleServiceImpl implements AppraisalCycleService {

    private final AppraisalCycleRepository cycleRepository;
    private final AppraisalFormTemplateRepository templateRepository;
    private final DepartmentRepository departmentRepository;
    private final UserRepository userRepository;
    private final AppraisalTemplateService appraisalTemplateService;

    @Override
    public AppraisalCycleResponse createTemplateAndCycle(AppraisalTemplateCycleRequest request, Integer createdByUserId) {
        if (request == null || request.getTemplate() == null || request.getCycle() == null) {
            throw new BadRequestException("Template and cycle information are required.");
        }

        AppraisalTemplateResponse template = appraisalTemplateService.createTemplate(request.getTemplate(), createdByUserId);

        AppraisalCycleRequest cycleRequest = request.getCycle();
        cycleRequest.setTemplateId(template.getId());
        if (cycleRequest.getCycleType() == null) {
            cycleRequest.setCycleType(request.getTemplate().getFormType() != null
                    ? request.getTemplate().getFormType()
                    : AppraisalCycleType.ANNUAL);
        }
        if (cycleRequest.getDepartmentIds() == null || cycleRequest.getDepartmentIds().isEmpty()) {
            cycleRequest.setDepartmentIds(request.getTemplate().getDepartmentIds());
        }
        return createCycle(cycleRequest, createdByUserId);
    }

    @Override
    public AppraisalCycleResponse createCycle(AppraisalCycleRequest request, Integer createdByUserId) {
        validateCycleRequest(request);

        AppraisalFormTemplate template = templateRepository.findById(request.getTemplateId())
                .orElseThrow(() -> new ResourceNotFoundException("Appraisal template not found with id: " + request.getTemplateId()));
        CycleDates dates = calculateCycleDates(request);
        if (cycleRepository.existsByCycleTypeAndCycleYearAndPeriodNo(request.getCycleType(), dates.cycleYear(), dates.periodNo())) {
            throw new DuplicateResourceException("Appraisal cycle already exists for "
                    + request.getCycleType() + " " + dates.cycleYear() + " period " + dates.periodNo());
        }

        AppraisalCycle cycle = new AppraisalCycle();
        cycle.setCycleName(resolveCycleName(request, dates));
        cycle.setDescription(request.getDescription());
        cycle.setTemplate(template);
        cycle.setCycleType(request.getCycleType());
        cycle.setCycleYear(dates.cycleYear());
        cycle.setPeriodNo(dates.periodNo());
        cycle.setStartDate(dates.startDate());
        cycle.setEndDate(dates.endDate());
        cycle.setSubmissionDeadline(request.getSubmissionDeadline());
        cycle.setStatus(AppraisalCycleStatus.DRAFT);
        cycle.setLocked(false);

        if (createdByUserId != null) {
            User user = userRepository.findById(createdByUserId)
                    .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + createdByUserId));
            cycle.setCreatedByUser(user);
        }

        applyCycleDepartments(cycle, request, template);
        return mapCycle(cycleRepository.save(cycle));
    }

    @Override
    @Transactional(readOnly = true)
    public AppraisalCycleResponse getCycle(Integer cycleId) {
        AppraisalCycle cycle = getCycleEntity(cycleId);
        return mapCycle(cycle);
    }


    @Override
    public AppraisalCycleResponse updateDraftCycle(Integer cycleId, AppraisalCycleRequest request) {
        validateCycleRequest(request);

        AppraisalCycle cycle = getCycleEntity(cycleId);
        if (cycle.getStatus() != AppraisalCycleStatus.DRAFT) {
            throw new BadRequestException("Only draft cycle can be edited.");
        }
        if (Boolean.TRUE.equals(cycle.getLocked())) {
            throw new BadRequestException("Locked cycle cannot be edited.");
        }

        AppraisalFormTemplate template = templateRepository.findById(request.getTemplateId())
                .orElseThrow(() -> new ResourceNotFoundException("Appraisal template not found with id: " + request.getTemplateId()));
        CycleDates dates = calculateCycleDates(request);
        cycleRepository.findByCycleTypeAndCycleYearAndPeriodNo(request.getCycleType(), dates.cycleYear(), dates.periodNo())
                .filter(existing -> !existing.getId().equals(cycleId))
                .ifPresent(existing -> {
                    throw new DuplicateResourceException("Appraisal cycle already exists for "
                            + request.getCycleType() + " " + dates.cycleYear() + " period " + dates.periodNo());
                });

        cycle.setCycleName(resolveCycleName(request, dates));
        cycle.setDescription(request.getDescription());
        cycle.setTemplate(template);
        cycle.setCycleType(request.getCycleType());
        cycle.setCycleYear(dates.cycleYear());
        cycle.setPeriodNo(dates.periodNo());
        cycle.setStartDate(dates.startDate());
        cycle.setEndDate(dates.endDate());
        cycle.setSubmissionDeadline(request.getSubmissionDeadline());
        cycle.getCycleDepartments().clear();
        applyCycleDepartments(cycle, request, template);

        return mapCycle(cycleRepository.save(cycle));
    }

    @Override
    @Transactional(readOnly = true)
    public List<AppraisalCycleResponse> getCycles(AppraisalCycleStatus status) {
        List<AppraisalCycle> cycles = status == null ? cycleRepository.findAll() : cycleRepository.findByStatus(status);
        return cycles.stream().map(this::mapCycle).toList();
    }

    @Override
    public AppraisalCycleResponse activateCycle(Integer cycleId) {
        AppraisalCycle cycle = getCycleEntity(cycleId);
        if (Boolean.TRUE.equals(cycle.getLocked())) {
            throw new BadRequestException("Locked cycle cannot be activated.");
        }
        if (cycle.getStatus() != AppraisalCycleStatus.DRAFT) {
            throw new BadRequestException("Only draft cycle can be activated.");
        }
        cycle.setStatus(AppraisalCycleStatus.ACTIVE);
        cycle.setActivatedAt(new Date());
        return mapCycle(cycleRepository.save(cycle));
    }

    @Override
    public AppraisalCycleResponse lockCycle(Integer cycleId) {
        AppraisalCycle cycle = getCycleEntity(cycleId);
        cycle.setLocked(true);
        cycle.setStatus(AppraisalCycleStatus.LOCKED);
        return mapCycle(cycleRepository.save(cycle));
    }

    @Override
    public AppraisalCycleResponse completeCycle(Integer cycleId) {
        AppraisalCycle cycle = getCycleEntity(cycleId);
        cycle.setStatus(AppraisalCycleStatus.COMPLETED);
        cycle.setCompletedAt(new Date());
        cycle.setLocked(true);
        return mapCycle(cycleRepository.save(cycle));
    }

    @Override
    public AppraisalCycleResponse reuseCycle(Integer cycleId, AppraisalCycleRequest overrideRequest, Integer createdByUserId) {
        AppraisalCycle source = getCycleEntity(cycleId);
        AppraisalCycleRequest request = overrideRequest == null ? new AppraisalCycleRequest() : overrideRequest;
        request.setTemplateId(request.getTemplateId() != null ? request.getTemplateId() : source.getTemplate().getId());
        request.setCycleType(request.getCycleType() != null ? request.getCycleType() : source.getCycleType());
        request.setCycleYear(request.getCycleYear() != null ? request.getCycleYear() : source.getCycleYear() + 1);
        request.setPeriodNo(request.getPeriodNo() != null ? request.getPeriodNo() : source.getPeriodNo());
        request.setCycleName(request.getCycleName());
        request.setDescription(request.getDescription() != null ? request.getDescription() : source.getDescription());
        if (request.getSubmissionDeadline() == null) {
            throw new BadRequestException("Submission deadline is required when re-using a cycle.");
        }
        return createCycle(request, createdByUserId);
    }

    private AppraisalCycle getCycleEntity(Integer cycleId) {
        return cycleRepository.findById(cycleId)
                .orElseThrow(() -> new ResourceNotFoundException("Appraisal cycle not found with id: " + cycleId));
    }

    private void validateCycleRequest(AppraisalCycleRequest request) {
        if (request == null) {
            throw new BadRequestException("Cycle request is required.");
        }
        if (request.getTemplateId() == null) {
            throw new BadRequestException("Template id is required.");
        }
        if (request.getCycleType() == null) {
            throw new BadRequestException("Cycle type is required.");
        }
        if (request.getSubmissionDeadline() == null) {
            throw new BadRequestException("Submission deadline is required.");
        }
        if (request.getCycleType() == AppraisalCycleType.ANNUAL && request.getCycleYear() == null) {
            throw new BadRequestException("Cycle year is required for annual appraisal cycle.");
        }
        if (request.getCycleType() == AppraisalCycleType.SEMI_ANNUAL && request.getStartDate() == null) {
            throw new BadRequestException("Start date is required for semi-annual appraisal cycle.");
        }
    }

    private CycleDates calculateCycleDates(AppraisalCycleRequest request) {
        if (request.getCycleType() == AppraisalCycleType.ANNUAL) {
            int year = request.getCycleYear();
            return new CycleDates(
                    year,
                    1,
                    LocalDate.of(year, 1, 1),
                    LocalDate.of(year, 12, 31)
            );
        }

        LocalDate startDate = request.getStartDate();
        LocalDate endDate = startDate.plusMonths(6).minusDays(1);
        int periodNo = request.getPeriodNo() != null ? request.getPeriodNo() : (startDate.getMonthValue() <= 6 ? 1 : 2);
        return new CycleDates(startDate.getYear(), periodNo, startDate, endDate);
    }

    private String resolveCycleName(AppraisalCycleRequest request, CycleDates dates) {
        if (request.getCycleName() != null && !request.getCycleName().isBlank()) {
            return request.getCycleName().trim();
        }
        if (request.getCycleType() == AppraisalCycleType.ANNUAL) {
            return dates.cycleYear() + " Annual Appraisal Cycle";
        }
        return dates.cycleYear() + " Semi-Annual Appraisal Cycle P" + dates.periodNo();
    }

    private void applyCycleDepartments(AppraisalCycle cycle, AppraisalCycleRequest request, AppraisalFormTemplate template) {
        List<Integer> departmentIds = new ArrayList<>();
        if (request.getDepartmentIds() != null && !request.getDepartmentIds().isEmpty()) {
            departmentIds.addAll(request.getDepartmentIds());
        } else if (Boolean.TRUE.equals(template.getTargetAllDepartments())) {
            departmentIds.addAll(departmentRepository.findAll().stream()
                    .filter(department -> department.getStatus() == null || department.getStatus())
                    .map(Department::getId)
                    .toList());
        } else if (template.getTargetDepartments() != null) {
            departmentIds.addAll(template.getTargetDepartments().stream()
                    .map(target -> target.getDepartment().getId())
                    .toList());
        }

        if (departmentIds.isEmpty()) {
            throw new BadRequestException("Cycle must target at least one department.");
        }

        for (Integer departmentId : departmentIds.stream().distinct().toList()) {
            Department department = departmentRepository.findById(departmentId)
                    .orElseThrow(() -> new ResourceNotFoundException("Department not found with id: " + departmentId));
            AppraisalCycleDepartment target = new AppraisalCycleDepartment();
            target.setCycle(cycle);
            target.setDepartment(department);
            cycle.getCycleDepartments().add(target);
        }
    }

    private AppraisalCycleResponse mapCycle(AppraisalCycle cycle) {
        AppraisalCycleResponse response = new AppraisalCycleResponse();
        response.setId(cycle.getId());
        response.setCycleName(cycle.getCycleName());
        response.setDescription(cycle.getDescription());
        response.setTemplateId(cycle.getTemplate() != null ? cycle.getTemplate().getId() : null);
        response.setTemplateName(cycle.getTemplate() != null ? cycle.getTemplate().getTemplateName() : null);
        response.setCycleType(cycle.getCycleType());
        response.setCycleYear(cycle.getCycleYear());
        response.setPeriodNo(cycle.getPeriodNo());
        response.setStartDate(cycle.getStartDate());
        response.setEndDate(cycle.getEndDate());
        response.setSubmissionDeadline(cycle.getSubmissionDeadline());
        response.setStatus(cycle.getStatus());
        response.setLocked(cycle.getLocked());
        response.setActivatedAt(cycle.getActivatedAt());
        response.setCompletedAt(cycle.getCompletedAt());
        if (cycle.getCycleDepartments() != null) {
            cycle.getCycleDepartments().forEach(target -> {
                if (target.getDepartment() != null) {
                    response.getDepartmentIds().add(target.getDepartment().getId());
                    response.getDepartmentNames().add(target.getDepartment().getDepartmentName());
                }
            });
        }
        return response;
    }

    private record CycleDates(Integer cycleYear, Integer periodNo, LocalDate startDate, LocalDate endDate) {}
}
