package com.epms.service.impl;

import com.epms.dto.appraisal.*;
import com.epms.entity.*;
import com.epms.entity.enums.*;
import com.epms.exception.BadRequestException;
import com.epms.exception.ResourceNotFoundException;
import com.epms.repository.*;
import com.epms.service.EmployeeAppraisalWorkflowService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class EmployeeAppraisalWorkflowServiceImpl implements EmployeeAppraisalWorkflowService {

    private final AppraisalCycleRepository cycleRepository;
    private final AppraisalFormCriteriaRepository criteriaRepository;
    private final AppraisalReviewRepository reviewRepository;
    private final AppraisalScoreBandRepository scoreBandRepository;
    private final AppraisalSectionRepository sectionRepository;
    private final EmployeeAppraisalFormRepository formRepository;
    private final EmployeeAppraisalCriteriaRatingRepository ratingRepository;
    private final EmployeeAppraisalHistoryRepository historyRepository;
    private final EmployeeRepository employeeRepository;
    private final DepartmentRepository departmentRepository;
    private final UserRepository userRepository;

    @Override
    public EmployeeAppraisalFormResponse createPmDraft(Integer cycleId, Integer employeeId, Integer pmUserId) {
        AppraisalCycle cycle = getActiveCycle(cycleId);

        Employee employee = employeeRepository.findWithDepartmentsById(employeeId)
                .orElseThrow(() -> new ResourceNotFoundException("Employee not found with id: " + employeeId));

        User managerUser = getUser(pmUserId);
        User employeeUser = userRepository.findActiveByEmployeeId(employeeId).orElse(null);

        Department department = resolveEmployeeDepartment(employee, employeeUser);

        ensureCycleTargetsDepartment(cycle, department.getId());

        Optional<EmployeeAppraisalForm> existing = formRepository.findByCycleIdAndEmployeeId(cycleId, employeeId);
        if (existing.isPresent()) {
            return mapForm(existing.get());
        }

        EmployeeAppraisalForm form = new EmployeeAppraisalForm();
        form.setCycle(cycle);
        form.setEmployee(employee);
        form.setDepartment(department);
        form.setProjectManager(managerUser);
        form.setEmployeeNameSnapshot(resolveEmployeeName(employee, employeeUser));
        form.setEmployeeCodeSnapshot(employeeUser != null ? employeeUser.getEmployeeCode() : null);
        form.setDepartmentNameSnapshot(department.getDepartmentName());
        form.setPositionSnapshot(employee.getPosition() != null ? employee.getPosition().getPositionTitle() : null);
        form.setAssessmentDate(cycle.getStartDate());
        form.setEffectiveDate(cycle.getEndDate());
        form.setStatus(EmployeeAppraisalStatus.PM_DRAFT);
        form.setVisibleToEmployee(false);
        form.setLocked(false);

        EmployeeAppraisalForm saved = formRepository.save(form);

        addHistory(
                saved,
                null,
                EmployeeAppraisalStatus.PM_DRAFT,
                managerUser,
                "CREATE_MANAGER_DRAFT",
                "Manager draft created."
        );

        return mapForm(saved);
    }

    @Override
    public EmployeeAppraisalFormResponse submitPmReview(
            Integer employeeAppraisalFormId,
            PmAppraisalSubmitRequest request,
            Integer pmUserId
    ) {
        if (request == null || request.getRatings() == null || request.getRatings().isEmpty()) {
            throw new BadRequestException("Manager ratings are required.");
        }

        EmployeeAppraisalForm form = getFormEntity(employeeAppraisalFormId);

        if (form.getStatus() != EmployeeAppraisalStatus.PM_DRAFT
                && form.getStatus() != EmployeeAppraisalStatus.RETURNED) {
            throw new BadRequestException("Only manager draft or returned forms can be submitted by Manager.");
        }

        User managerUser = getUser(pmUserId);

        form.setProjectManager(managerUser);
        form.setAssessmentDate(form.getCycle() != null ? form.getCycle().getStartDate() : form.getAssessmentDate());
        form.setEffectiveDate(form.getCycle() != null ? form.getCycle().getEndDate() : form.getEffectiveDate());

        savePmRatings(form, request.getRatings());
        recalculateScore(form);

        upsertReview(
                form,
                AppraisalReviewStage.PM,
                managerUser,
                request.getRecommendation(),
                request.getComment(),
                AppraisalDecision.APPROVED
        );

        EmployeeAppraisalStatus previousStatus = form.getStatus();

        form.setStatus(EmployeeAppraisalStatus.DEPT_HEAD_PENDING);
        form.setPmSubmittedAt(new Date());

        EmployeeAppraisalForm saved = formRepository.save(form);

        addHistory(
                saved,
                previousStatus,
                EmployeeAppraisalStatus.DEPT_HEAD_PENDING,
                managerUser,
                "SUBMIT_TO_DEPT_HEAD",
                "Manager submitted appraisal to Dept Head."
        );

        return mapForm(saved);
    }

    @Override
    public EmployeeAppraisalFormResponse submitDeptHeadReview(
            Integer employeeAppraisalFormId,
            AppraisalReviewSubmitRequest request,
            Integer deptHeadUserId
    ) {
        EmployeeAppraisalForm form = getFormEntity(employeeAppraisalFormId);

        if (form.getStatus() != EmployeeAppraisalStatus.DEPT_HEAD_PENDING) {
            throw new BadRequestException("Only Dept Head pending forms can be reviewed by Dept Head.");
        }

        User deptHead = getUser(deptHeadUserId);

        form.setDepartmentHead(deptHead);

        upsertReview(
                form,
                AppraisalReviewStage.DEPT_HEAD,
                deptHead,
                safeRecommendation(request),
                safeComment(request),
                AppraisalDecision.APPROVED
        );

        EmployeeAppraisalStatus previousStatus = form.getStatus();

        form.setStatus(EmployeeAppraisalStatus.HR_PENDING);
        form.setDeptHeadSubmittedAt(new Date());

        EmployeeAppraisalForm saved = formRepository.save(form);

        addHistory(
                saved,
                previousStatus,
                EmployeeAppraisalStatus.HR_PENDING,
                deptHead,
                "SUBMIT_TO_HR",
                "Dept Head reviewed and submitted appraisal to HR."
        );

        return mapForm(saved);
    }

    @Override
    public EmployeeAppraisalFormResponse approveByHr(
            Integer employeeAppraisalFormId,
            AppraisalReviewSubmitRequest request,
            Integer hrUserId
    ) {
        EmployeeAppraisalForm form = getFormEntity(employeeAppraisalFormId);

        if (form.getStatus() != EmployeeAppraisalStatus.HR_PENDING) {
            throw new BadRequestException("Only HR pending forms can be approved by HR.");
        }

        User hrUser = getUser(hrUserId);

        upsertReview(
                form,
                AppraisalReviewStage.HR,
                hrUser,
                safeRecommendation(request),
                safeComment(request),
                AppraisalDecision.APPROVED
        );

        EmployeeAppraisalStatus previousStatus = form.getStatus();

        form.setStatus(EmployeeAppraisalStatus.COMPLETED);
        form.setHrApprovedAt(new Date());
        form.setVisibleToEmployee(true);
        form.setLocked(true);

        EmployeeAppraisalForm saved = formRepository.save(form);

        addHistory(
                saved,
                previousStatus,
                EmployeeAppraisalStatus.COMPLETED,
                hrUser,
                "HR_APPROVE",
                "HR approved appraisal. Employee can view the form."
        );

        return mapForm(saved);
    }

    @Override
    public EmployeeAppraisalFormResponse returnToPm(
            Integer employeeAppraisalFormId,
            String note,
            Integer actionByUserId
    ) {
        EmployeeAppraisalForm form = getFormEntity(employeeAppraisalFormId);

        if (form.getStatus() != EmployeeAppraisalStatus.DEPT_HEAD_PENDING
                && form.getStatus() != EmployeeAppraisalStatus.HR_PENDING) {
            throw new BadRequestException("Only Dept Head pending or HR pending forms can be returned to Manager.");
        }

        User user = getUser(actionByUserId);
        EmployeeAppraisalStatus previousStatus = form.getStatus();

        form.setStatus(EmployeeAppraisalStatus.RETURNED);
        form.setLocked(false);

        EmployeeAppraisalForm saved = formRepository.save(form);

        addHistory(
                saved,
                previousStatus,
                EmployeeAppraisalStatus.RETURNED,
                user,
                "RETURN_TO_MANAGER",
                note
        );

        return mapForm(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public EmployeeAppraisalFormResponse getForm(Integer employeeAppraisalFormId) {
        return mapForm(getFormEntity(employeeAppraisalFormId));
    }

    @Override
    @Transactional(readOnly = true)
    public List<EmployeeAppraisalFormResponse> getPmHistory(Integer pmUserId) {
        return formRepository.findByProjectManagerIdOrderByUpdatedAtDesc(pmUserId)
                .stream()
                .map(this::mapForm)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<EmployeeAppraisalFormResponse> getDeptHeadQueue(Integer departmentId) {
        return formRepository.findByDepartmentIdAndStatus(
                        departmentId,
                        EmployeeAppraisalStatus.DEPT_HEAD_PENDING
                )
                .stream()
                .map(this::mapForm)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<EmployeeAppraisalFormResponse> getDeptHeadHistory(Integer deptHeadUserId) {
        return formRepository.findByDepartmentHeadIdOrderByUpdatedAtDesc(deptHeadUserId)
                .stream()
                .map(this::mapForm)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<EmployeeAppraisalFormResponse> getHrReviewQueue() {
        return formRepository.findByStatus(EmployeeAppraisalStatus.HR_PENDING)
                .stream()
                .map(this::mapForm)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<EmployeeAppraisalFormResponse> getEmployeeVisibleForms(Integer employeeId) {
        return formRepository.findByEmployeeIdAndVisibleToEmployeeTrueOrderByHrApprovedAtDesc(employeeId)
                .stream()
                .map(this::mapForm)
                .toList();
    }

    private AppraisalCycle getActiveCycle(Integer cycleId) {
        AppraisalCycle cycle = cycleRepository.findById(cycleId)
                .orElseThrow(() -> new ResourceNotFoundException("Appraisal cycle not found with id: " + cycleId));

        if (cycle.getStatus() != AppraisalCycleStatus.ACTIVE) {
            throw new BadRequestException("Only active appraisal cycles can be used for Manager review.");
        }

        if (Boolean.TRUE.equals(cycle.getLocked())) {
            throw new BadRequestException("Locked appraisal cycles cannot be used for Manager review.");
        }

        return cycle;
    }

    private EmployeeAppraisalForm getFormEntity(Integer formId) {
        return formRepository.findById(formId)
                .orElseThrow(() -> new ResourceNotFoundException("Employee appraisal form not found with id: " + formId));
    }

    private User getUser(Integer userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userId));
    }

    private Department resolveEmployeeDepartment(Employee employee, User employeeUser) {
        if (employeeUser != null && employeeUser.getDepartmentId() != null) {
            return departmentRepository.findById(employeeUser.getDepartmentId())
                    .orElseThrow(() -> new ResourceNotFoundException(
                            "Employee department not found with id: " + employeeUser.getDepartmentId()
                    ));
        }

        if (employee.getEmployeeDepartments() != null) {
            return employee.getEmployeeDepartments()
                    .stream()
                    .filter(employeeDepartment -> employeeDepartment.getEnddate() == null)
                    .map(this::resolveWorkingDepartment)
                    .filter(Objects::nonNull)
                    .findFirst()
                    .orElseThrow(() -> new BadRequestException("Employee has no active department."));
        }

        throw new BadRequestException("Employee has no active department.");
    }

    private Department resolveWorkingDepartment(EmployeeDepartment employeeDepartment) {
        if (employeeDepartment == null) {
            return null;
        }

        if (employeeDepartment.getParentDepartment() != null) {
            return employeeDepartment.getParentDepartment();
        }

        return employeeDepartment.getCurrentDepartment();
    }

    private void ensureCycleTargetsDepartment(AppraisalCycle cycle, Integer departmentId) {
        boolean matched = cycle.getCycleDepartments() != null
                && cycle.getCycleDepartments()
                .stream()
                .anyMatch(target ->
                        target.getDepartment() != null
                                && Objects.equals(target.getDepartment().getId(), departmentId)
                );

        if (!matched) {
            throw new BadRequestException("This appraisal cycle is not assigned to the employee department.");
        }
    }

    private String resolveEmployeeName(Employee employee, User employeeUser) {
        if (employeeUser != null
                && employeeUser.getFullName() != null
                && !employeeUser.getFullName().isBlank()) {
            return employeeUser.getFullName();
        }

        return ((employee.getFirstName() != null ? employee.getFirstName() : "") + " "
                + (employee.getLastName() != null ? employee.getLastName() : "")).trim();
    }

    private void savePmRatings(EmployeeAppraisalForm form, List<AppraisalRatingInput> ratings) {
        List<AppraisalFormCriteria> templateCriteria =
                criteriaRepository.findActiveCriteriaByTemplateId(form.getCycle().getTemplate().getId());

        Map<Integer, AppraisalFormCriteria> criteriaById = templateCriteria
                .stream()
                .collect(Collectors.toMap(AppraisalFormCriteria::getId, Function.identity()));

        ratingRepository.deleteByEmployeeAppraisalFormId(form.getId());

        for (AppraisalRatingInput input : ratings) {
            if (input.getCriteriaId() == null || !criteriaById.containsKey(input.getCriteriaId())) {
                throw new BadRequestException("Invalid criteria id for this template: " + input.getCriteriaId());
            }

            AppraisalFormCriteria criteria = criteriaById.get(input.getCriteriaId());

            if (input.getRatingValue() == null) {
                throw new BadRequestException("Rating value is required for criteria id: " + input.getCriteriaId());
            }

            if (input.getRatingValue() < 1 || input.getRatingValue() > criteria.getMaxRating()) {
                throw new BadRequestException(
                        "Rating value must be between 1 and "
                                + criteria.getMaxRating()
                                + " for criteria id: "
                                + input.getCriteriaId()
                );
            }

            EmployeeAppraisalCriteriaRating rating = new EmployeeAppraisalCriteriaRating();
            rating.setEmployeeAppraisalForm(form);
            rating.setCriteria(criteria);
            rating.setRatingValue(input.getRatingValue());
            rating.setComment(input.getComment());

            ratingRepository.save(rating);
        }
    }

    private void recalculateScore(EmployeeAppraisalForm form) {
        List<EmployeeAppraisalCriteriaRating> ratings =
                ratingRepository.findByEmployeeAppraisalFormId(form.getId());

        int totalPoints = ratings
                .stream()
                .mapToInt(EmployeeAppraisalCriteriaRating::getRatingValue)
                .sum();

        int maxPossible = ratings
                .stream()
                .map(EmployeeAppraisalCriteriaRating::getCriteria)
                .filter(Objects::nonNull)
                .mapToInt(criteria -> criteria.getMaxRating() != null ? criteria.getMaxRating() : 5)
                .sum();

        int answeredCount = ratings.size();

        double scorePercent = maxPossible > 0
                ? (totalPoints * 100.0) / maxPossible
                : 0.0;

        int roundedScore = (int) Math.round(scorePercent);

        form.setTotalPoints(totalPoints);
        form.setAnsweredCriteriaCount(answeredCount);
        form.setScorePercent(Math.round(scorePercent * 100.0) / 100.0);
        form.setPerformanceLabel(
                scoreBandRepository.findBandForScore(roundedScore)
                        .map(AppraisalScoreBand::getLabel)
                        .orElse(resolveFallbackLabel(roundedScore))
        );
    }

    private String resolveFallbackLabel(int roundedScore) {
        if (roundedScore >= 86) {
            return "Outstanding";
        }

        if (roundedScore >= 71) {
            return "Exceeds Requirements";
        }

        if (roundedScore >= 60) {
            return "Meet Requirement";
        }

        if (roundedScore >= 40) {
            return "Need Improvement";
        }

        return "Unsatisfactory";
    }

    private void upsertReview(
            EmployeeAppraisalForm form,
            AppraisalReviewStage stage,
            User reviewer,
            String recommendation,
            String comment,
            AppraisalDecision decision
    ) {
        AppraisalReview review = reviewRepository
                .findByEmployeeAppraisalFormIdAndReviewStage(form.getId(), stage)
                .orElseGet(AppraisalReview::new);

        review.setEmployeeAppraisalForm(form);
        review.setReviewStage(stage);
        review.setReviewerUser(reviewer);
        review.setRecommendation(recommendation);
        review.setComment(comment);
        review.setDecision(decision);
        review.setSubmittedAt(new Date());

        reviewRepository.save(review);
    }

    private void addHistory(
            EmployeeAppraisalForm form,
            EmployeeAppraisalStatus from,
            EmployeeAppraisalStatus to,
            User user,
            String actionName,
            String note
    ) {
        EmployeeAppraisalHistory history = new EmployeeAppraisalHistory();

        history.setEmployeeAppraisalForm(form);
        history.setFromStatus(from);
        history.setToStatus(to);
        history.setActionByUser(user);
        history.setActionName(actionName);
        history.setNote(note);

        historyRepository.save(history);
    }

    private String safeRecommendation(AppraisalReviewSubmitRequest request) {
        return request != null ? request.getRecommendation() : null;
    }

    private String safeComment(AppraisalReviewSubmitRequest request) {
        return request != null ? request.getComment() : null;
    }

    private EmployeeAppraisalFormResponse mapForm(EmployeeAppraisalForm form) {
        EmployeeAppraisalFormResponse response = new EmployeeAppraisalFormResponse();

        response.setId(form.getId());
        response.setCycleId(form.getCycle() != null ? form.getCycle().getId() : null);
        response.setCycleName(form.getCycle() != null ? form.getCycle().getCycleName() : null);
        response.setEmployeeId(form.getEmployee() != null ? form.getEmployee().getId() : null);
        response.setEmployeeName(form.getEmployeeNameSnapshot());
        response.setEmployeeCode(form.getEmployeeCodeSnapshot());
        response.setDepartmentId(form.getDepartment() != null ? form.getDepartment().getId() : null);
        response.setDepartmentName(form.getDepartmentNameSnapshot());
        response.setPositionName(form.getPositionSnapshot());
        response.setAssessmentDate(form.getAssessmentDate());
        response.setEffectiveDate(form.getEffectiveDate());
        response.setStatus(form.getStatus());
        response.setTotalPoints(form.getTotalPoints());
        response.setAnsweredCriteriaCount(form.getAnsweredCriteriaCount());
        response.setScorePercent(form.getScorePercent());
        response.setPerformanceLabel(form.getPerformanceLabel());
        response.setVisibleToEmployee(form.getVisibleToEmployee());
        response.setLocked(form.getLocked());
        response.setPmSubmittedAt(form.getPmSubmittedAt());
        response.setDeptHeadSubmittedAt(form.getDeptHeadSubmittedAt());
        response.setHrApprovedAt(form.getHrApprovedAt());

        response.setSections(mapSectionsWithRatings(form));

        response.setReviews(
                reviewRepository.findByEmployeeAppraisalFormIdOrderByCreatedAtAsc(form.getId())
                        .stream()
                        .map(this::mapReview)
                        .toList()
        );

        return response;
    }

    private List<AppraisalSectionResponse> mapSectionsWithRatings(EmployeeAppraisalForm form) {
        Integer templateId = form.getCycle().getTemplate().getId();

        Map<Integer, EmployeeAppraisalCriteriaRating> ratingsByCriteriaId =
                ratingRepository.findByEmployeeAppraisalFormId(form.getId())
                        .stream()
                        .collect(Collectors.toMap(
                                rating -> rating.getCriteria().getId(),
                                Function.identity()
                        ));

        return sectionRepository.findByTemplateIdWithCriteria(templateId)
                .stream()
                .filter(section -> section.getActive() == null || section.getActive())
                .sorted(Comparator.comparing(
                        AppraisalSection::getSortOrder,
                        Comparator.nullsLast(Integer::compareTo)
                ))
                .map(section -> {
                    AppraisalSectionResponse sectionResponse = new AppraisalSectionResponse();

                    sectionResponse.setId(section.getId());
                    sectionResponse.setSectionName(section.getSectionName());
                    sectionResponse.setDescription(section.getDescription());
                    sectionResponse.setSortOrder(section.getSortOrder());
                    sectionResponse.setActive(section.getActive());

                    sectionResponse.setCriteria(
                            section.getCriteria()
                                    .stream()
                                    .filter(criteria -> criteria.getActive() == null || criteria.getActive())
                                    .sorted(Comparator.comparing(
                                            AppraisalFormCriteria::getSortOrder,
                                            Comparator.nullsLast(Integer::compareTo)
                                    ))
                                    .map(criteria -> {
                                        EmployeeAppraisalCriteriaRating rating =
                                                ratingsByCriteriaId.get(criteria.getId());

                                        return new AppraisalCriterionResponse(
                                                criteria.getId(),
                                                criteria.getCriteriaText(),
                                                criteria.getDescription(),
                                                criteria.getSortOrder(),
                                                criteria.getMaxRating(),
                                                criteria.getRatingRequired(),
                                                criteria.getActive(),
                                                rating != null ? rating.getRatingValue() : null,
                                                rating != null ? rating.getComment() : null
                                        );
                                    })
                                    .toList()
                    );

                    return sectionResponse;
                })
                .toList();
    }

    private AppraisalReviewResponse mapReview(AppraisalReview review) {
        return new AppraisalReviewResponse(
                review.getId(),
                review.getReviewStage(),
                review.getReviewerUser() != null ? review.getReviewerUser().getId() : null,
                review.getReviewerUser() != null ? review.getReviewerUser().getFullName() : null,
                review.getRecommendation(),
                review.getComment(),
                review.getDecision(),
                review.getSubmittedAt()
        );
    }
}