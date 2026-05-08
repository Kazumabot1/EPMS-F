package com.epms.controller;

import com.epms.dto.GenericApiResponse;
import com.epms.dto.appraisal.AppraisalReturnRequest;
import com.epms.dto.appraisal.AppraisalReviewSubmitRequest;
import com.epms.dto.appraisal.AppraisalCycleResponse;
import com.epms.dto.appraisal.EmployeeAppraisalFormResponse;
import com.epms.dto.appraisal.PmAppraisalSubmitRequest;
import com.epms.entity.enums.AppraisalCycleStatus;
import com.epms.exception.BadRequestException;
import com.epms.repository.UserRepository;
import com.epms.security.SecurityUtils;
import com.epms.service.AppraisalCycleService;
import com.epms.service.EmployeeAppraisalWorkflowService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Handles the filled appraisal form workflow:
 * Manager -> Dept Head -> HR -> Employee view.
 *
 * The template structure is loaded through the employee appraisal form response.
 * Manager ratings/recommendations are returned read-only for Dept Head and HR views.
 */
@RestController
@RequestMapping("/api/appraisal/workflow")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class AppraisalWorkflowController {

    private final EmployeeAppraisalWorkflowService workflowService;
    private final AppraisalCycleService appraisalCycleService;
    private final UserRepository userRepository;


    @GetMapping("/pm/cycles/active")
    @PreAuthorize(
            "hasRole('MANAGER') "
                    + "or hasAuthority('ROLE_MANAGER') "
                    + "or authentication.principal.dashboard == 'MANAGER_DASHBOARD' "
                    + "or hasAnyRole('HR', 'ADMIN') "
                    + "or authentication.principal.dashboard == 'HR_DASHBOARD' "
                    + "or authentication.principal.dashboard == 'ADMIN_DASHBOARD'"
    )
    public ResponseEntity<GenericApiResponse<List<AppraisalCycleResponse>>> getActiveCyclesForPm() {
        List<AppraisalCycleResponse> response = appraisalCycleService.getCycles(AppraisalCycleStatus.ACTIVE);
        return ResponseEntity.ok(GenericApiResponse.success("Active appraisal cycles fetched", response));
    }

    @PostMapping("/pm/cycles/{cycleId}/employees/{employeeId}/draft")
    @PreAuthorize(
            "hasRole('MANAGER') "
                    + "or hasAuthority('ROLE_MANAGER') "
                    + "or authentication.principal.dashboard == 'MANAGER_DASHBOARD' "
                    + "or hasAnyRole('HR', 'ADMIN') "
                    + "or authentication.principal.dashboard == 'HR_DASHBOARD' "
                    + "or authentication.principal.dashboard == 'ADMIN_DASHBOARD'"
    )
    public ResponseEntity<GenericApiResponse<EmployeeAppraisalFormResponse>> createPmDraft(
            @PathVariable Integer cycleId,
            @PathVariable Integer employeeId
    ) {
        EmployeeAppraisalFormResponse response = workflowService.createPmDraft(cycleId, employeeId, SecurityUtils.currentUserId());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(GenericApiResponse.success("Manager appraisal draft ready", response));
    }

    @PostMapping("/pm/forms/{formId}/submit")
    @PreAuthorize(
            "hasRole('MANAGER') "
                    + "or hasAuthority('ROLE_MANAGER') "
                    + "or authentication.principal.dashboard == 'MANAGER_DASHBOARD' "
                    + "or hasAnyRole('HR', 'ADMIN') "
                    + "or authentication.principal.dashboard == 'HR_DASHBOARD' "
                    + "or authentication.principal.dashboard == 'ADMIN_DASHBOARD'"
    )
    public ResponseEntity<GenericApiResponse<EmployeeAppraisalFormResponse>> submitPmReview(
            @PathVariable Integer formId,
            @Valid @RequestBody PmAppraisalSubmitRequest request
    ) {
        EmployeeAppraisalFormResponse response = workflowService.submitPmReview(formId, request, SecurityUtils.currentUserId());
        return ResponseEntity.ok(GenericApiResponse.success("Manager review submitted to Dept Head", response));
    }

    @GetMapping("/pm/history")
    @PreAuthorize(
            "hasRole('MANAGER') "
                    + "or hasAuthority('ROLE_MANAGER') "
                    + "or authentication.principal.dashboard == 'MANAGER_DASHBOARD' "
                    + "or hasAnyRole('HR', 'ADMIN') "
                    + "or authentication.principal.dashboard == 'HR_DASHBOARD' "
                    + "or authentication.principal.dashboard == 'ADMIN_DASHBOARD'"
    )
    public ResponseEntity<GenericApiResponse<List<EmployeeAppraisalFormResponse>>> getPmHistory() {
        List<EmployeeAppraisalFormResponse> response = workflowService.getPmHistory(SecurityUtils.currentUserId());
        return ResponseEntity.ok(GenericApiResponse.success("Manager appraisal review history fetched", response));
    }

    @GetMapping("/dept-head/queue")
    @PreAuthorize(
            "hasRole('DEPARTMENT_HEAD') "
                    + "or hasRole('DEPARTMENTHEAD') "
                    + "or hasAuthority('ROLE_DEPARTMENT_HEAD') "
                    + "or hasAuthority('ROLE_DEPARTMENTHEAD') "
                    + "or authentication.principal.dashboard == 'DEPARTMENT_HEAD_DASHBOARD' "
                    + "or hasAnyRole('HR', 'ADMIN') "
                    + "or authentication.principal.dashboard == 'HR_DASHBOARD' "
                    + "or authentication.principal.dashboard == 'ADMIN_DASHBOARD'"
    )
    public ResponseEntity<GenericApiResponse<List<EmployeeAppraisalFormResponse>>> getDeptHeadQueue(
            @RequestParam(required = false) Integer departmentId
    ) {
        Integer resolvedDepartmentId = departmentId != null ? departmentId : SecurityUtils.currentUser().getDepartmentId();
        if (resolvedDepartmentId == null) {
            throw new BadRequestException("Department id is required for Dept Head review queue.");
        }
        List<EmployeeAppraisalFormResponse> response = workflowService.getDeptHeadQueue(resolvedDepartmentId);
        return ResponseEntity.ok(GenericApiResponse.success("Dept Head appraisal review queue fetched", response));
    }

    @PostMapping("/dept-head/forms/{formId}/submit")
    @PreAuthorize(
            "hasRole('DEPARTMENT_HEAD') "
                    + "or hasRole('DEPARTMENTHEAD') "
                    + "or hasAuthority('ROLE_DEPARTMENT_HEAD') "
                    + "or hasAuthority('ROLE_DEPARTMENTHEAD') "
                    + "or authentication.principal.dashboard == 'DEPARTMENT_HEAD_DASHBOARD' "
                    + "or hasAnyRole('HR', 'ADMIN') "
                    + "or authentication.principal.dashboard == 'HR_DASHBOARD' "
                    + "or authentication.principal.dashboard == 'ADMIN_DASHBOARD'"
    )
    public ResponseEntity<GenericApiResponse<EmployeeAppraisalFormResponse>> submitDeptHeadReview(
            @PathVariable Integer formId,
            @Valid @RequestBody AppraisalReviewSubmitRequest request
    ) {
        EmployeeAppraisalFormResponse response = workflowService.submitDeptHeadReview(formId, request, SecurityUtils.currentUserId());
        return ResponseEntity.ok(GenericApiResponse.success("Dept Head review submitted to HR", response));
    }


    @GetMapping("/dept-head/history")
    @PreAuthorize(
            "hasRole('DEPARTMENT_HEAD') "
                    + "or hasRole('DEPARTMENTHEAD') "
                    + "or hasAuthority('ROLE_DEPARTMENT_HEAD') "
                    + "or hasAuthority('ROLE_DEPARTMENTHEAD') "
                    + "or authentication.principal.dashboard == 'DEPARTMENT_HEAD_DASHBOARD' "
                    + "or hasAnyRole('HR', 'ADMIN') "
                    + "or authentication.principal.dashboard == 'HR_DASHBOARD' "
                    + "or authentication.principal.dashboard == 'ADMIN_DASHBOARD'"
    )
    public ResponseEntity<GenericApiResponse<List<EmployeeAppraisalFormResponse>>> getDeptHeadHistory() {
        List<EmployeeAppraisalFormResponse> response = workflowService.getDeptHeadHistory(SecurityUtils.currentUserId());
        return ResponseEntity.ok(GenericApiResponse.success("Dept Head appraisal review history fetched", response));
    }

    @GetMapping("/hr/queue")
    @PreAuthorize(
            "hasAnyRole('HR', 'ADMIN') "
                    + "or authentication.principal.dashboard == 'HR_DASHBOARD' "
                    + "or authentication.principal.dashboard == 'ADMIN_DASHBOARD'"
    )
    public ResponseEntity<GenericApiResponse<List<EmployeeAppraisalFormResponse>>> getHrReviewQueue() {
        List<EmployeeAppraisalFormResponse> response = workflowService.getHrReviewQueue();
        return ResponseEntity.ok(GenericApiResponse.success("HR appraisal review queue fetched", response));
    }

    @PostMapping("/hr/forms/{formId}/approve")
    @PreAuthorize(
            "hasAnyRole('HR', 'ADMIN') "
                    + "or authentication.principal.dashboard == 'HR_DASHBOARD' "
                    + "or authentication.principal.dashboard == 'ADMIN_DASHBOARD'"
    )
    public ResponseEntity<GenericApiResponse<EmployeeAppraisalFormResponse>> approveByHr(
            @PathVariable Integer formId,
            @Valid @RequestBody AppraisalReviewSubmitRequest request
    ) {
        EmployeeAppraisalFormResponse response = workflowService.approveByHr(formId, request, SecurityUtils.currentUserId());
        return ResponseEntity.ok(GenericApiResponse.success("HR approved appraisal form", response));
    }

    @PostMapping("/forms/{formId}/return-to-pm")
    @PreAuthorize(
            "hasRole('DEPARTMENT_HEAD') "
                    + "or hasRole('DEPARTMENTHEAD') "
                    + "or hasAuthority('ROLE_DEPARTMENT_HEAD') "
                    + "or hasAuthority('ROLE_DEPARTMENTHEAD') "
                    + "or authentication.principal.dashboard == 'DEPARTMENT_HEAD_DASHBOARD' "
                    + "or hasAnyRole('HR', 'ADMIN') "
                    + "or authentication.principal.dashboard == 'HR_DASHBOARD' "
                    + "or authentication.principal.dashboard == 'ADMIN_DASHBOARD'"
    )
    public ResponseEntity<GenericApiResponse<EmployeeAppraisalFormResponse>> returnToPm(
            @PathVariable Integer formId,
            @Valid @RequestBody AppraisalReturnRequest request
    ) {
        EmployeeAppraisalFormResponse response = workflowService.returnToPm(
                formId,
                request == null ? null : request.getNote(),
                SecurityUtils.currentUserId()
        );
        return ResponseEntity.ok(GenericApiResponse.success("Appraisal form returned to Manager", response));
    }

    @GetMapping("/forms/{formId}")
    public ResponseEntity<GenericApiResponse<EmployeeAppraisalFormResponse>> getForm(@PathVariable Integer formId) {
        EmployeeAppraisalFormResponse response = workflowService.getForm(formId);
        return ResponseEntity.ok(GenericApiResponse.success("Employee appraisal form fetched", response));
    }

    @GetMapping("/employee/forms")
    @PreAuthorize(
            "hasRole('EMPLOYEE') "
                    + "or authentication.principal.dashboard == 'EMPLOYEE_DASHBOARD' "
                    + "or hasAnyRole('HR', 'ADMIN') "
                    + "or authentication.principal.dashboard == 'HR_DASHBOARD' "
                    + "or authentication.principal.dashboard == 'ADMIN_DASHBOARD'"
    )
    public ResponseEntity<GenericApiResponse<List<EmployeeAppraisalFormResponse>>> getMyCompletedForms() {
        Integer employeeId = userRepository.findById(SecurityUtils.currentUserId())
                .map(user -> user.getEmployeeId())
                .orElse(null);
        if (employeeId == null) {
            throw new BadRequestException("Current user is not linked to an employee record.");
        }
        List<EmployeeAppraisalFormResponse> response = workflowService.getEmployeeVisibleForms(employeeId);
        return ResponseEntity.ok(GenericApiResponse.success("Employee completed appraisal forms fetched", response));
    }

    @GetMapping("/employee/{employeeId}/forms")
    @PreAuthorize(
            "hasAnyRole('HR', 'ADMIN') "
                    + "or authentication.principal.dashboard == 'HR_DASHBOARD' "
                    + "or authentication.principal.dashboard == 'ADMIN_DASHBOARD'"
    )
    public ResponseEntity<GenericApiResponse<List<EmployeeAppraisalFormResponse>>> getEmployeeCompletedForms(
            @PathVariable Integer employeeId
    ) {
        List<EmployeeAppraisalFormResponse> response = workflowService.getEmployeeVisibleForms(employeeId);
        return ResponseEntity.ok(GenericApiResponse.success("Employee completed appraisal forms fetched", response));
    }
}