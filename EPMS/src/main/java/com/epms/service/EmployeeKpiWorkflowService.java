package com.epms.service;

import com.epms.dto.EmployeeKpiResultDto;
import com.epms.dto.HrEmployeeKpiRowDto;
import com.epms.dto.ManagerKpiAssignmentDto;
import com.epms.dto.ManagerKpiTemplateSummaryDto;
import com.epms.dto.UpdateEmployeeKpiScoresRequest;
import com.epms.dto.UseKpiDepartmentRequest;
import com.epms.dto.UseKpiTemplateResultDto;

import java.util.List;

public interface EmployeeKpiWorkflowService {

    UseKpiTemplateResultDto useTemplateForDepartment(Integer kpiFormId, UseKpiDepartmentRequest request);

    List<ManagerKpiTemplateSummaryDto> listKpiTemplatesForManagerDepartment();

    List<ManagerKpiAssignmentDto> listDepartmentAssignmentsForManager(Integer kpiFormId);

    ManagerKpiAssignmentDto updateScores(Integer employeeKpiFormId, UpdateEmployeeKpiScoresRequest request);

    UseKpiTemplateResultDto finalizeDepartmentKpi(Integer kpiFormId);

    List<EmployeeKpiResultDto> listFinalizedForCurrentEmployee();

    /**
     * Finalizes employee KPI assignments whose template period has ended and every line is scored.
     *
     * @return number of assignments newly finalized in this run
     */
    int runAutoFinalizePastDueAssignments();

    List<HrEmployeeKpiRowDto> listFinalizedForHr();

    /** Assigned / in-progress KPI forms (scores as entered by managers; not yet finalized). */
    List<HrEmployeeKpiRowDto> listInProgressForHr();
}
