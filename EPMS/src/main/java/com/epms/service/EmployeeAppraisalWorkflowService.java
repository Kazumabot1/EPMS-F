package com.epms.service;

import com.epms.dto.appraisal.AppraisalReviewSubmitRequest;
import com.epms.dto.appraisal.EmployeeAppraisalFormResponse;
import com.epms.dto.appraisal.PmAppraisalSubmitRequest;

import java.util.List;

public interface EmployeeAppraisalWorkflowService {

    EmployeeAppraisalFormResponse createPmDraft(Integer cycleId, Integer employeeId, Integer pmUserId);

    EmployeeAppraisalFormResponse submitPmReview(Integer employeeAppraisalFormId, PmAppraisalSubmitRequest request, Integer pmUserId);

    EmployeeAppraisalFormResponse submitDeptHeadReview(Integer employeeAppraisalFormId, AppraisalReviewSubmitRequest request, Integer deptHeadUserId);

    EmployeeAppraisalFormResponse approveByHr(Integer employeeAppraisalFormId, AppraisalReviewSubmitRequest request, Integer hrUserId);

    EmployeeAppraisalFormResponse returnToPm(Integer employeeAppraisalFormId, String note, Integer actionByUserId);

    EmployeeAppraisalFormResponse getForm(Integer employeeAppraisalFormId);

    List<EmployeeAppraisalFormResponse> getPmHistory(Integer pmUserId);

    List<EmployeeAppraisalFormResponse> getDeptHeadQueue(Integer departmentId);

    List<EmployeeAppraisalFormResponse> getDeptHeadHistory(Integer deptHeadUserId);

    List<EmployeeAppraisalFormResponse> getHrReviewQueue();

    List<EmployeeAppraisalFormResponse> getEmployeeVisibleForms(Integer employeeId);
}
