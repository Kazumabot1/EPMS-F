import { useEffect, useMemo, useState } from 'react';
import { fetchDepartments } from '../../services/departmentService';
import type { Department } from '../../services/departmentService';
import { appraisalCycleService, appraisalTemplateService } from '../../services/appraisalService';
import type {
  AppraisalCycleRequest,
  AppraisalCycleResponse,
  AppraisalCycleType,
  AppraisalTemplateResponse,
} from '../../types/appraisal';
import './appraisal.css';

const currentYear = new Date().getFullYear();

const displayDate = (value?: string | null) => {
  if (!value) return '-';
  const [year, month, day] = value.slice(0, 10).split('-');
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
};

const statusClass = (status: string) => {
  if (status === 'ACTIVE') return 'green';
  if (status === 'LOCKED') return 'amber';
  if (status === 'COMPLETED') return 'gray';
  return '';
};

const addMonthsMinusOneDay = (value: string) => {
  if (!value) return '';
  const date = new Date(`${value}T00:00:00`);
  date.setMonth(date.getMonth() + 6);
  date.setDate(date.getDate() - 1);
  return date.toISOString().slice(0, 10);
};

const getEndDate = (request: AppraisalCycleRequest) => (
  request.cycleType === 'ANNUAL'
    ? `${request.cycleYear}-12-31`
    : addMonthsMinusOneDay(request.startDate ?? '')
);

const getPeriodNo = (cycleType: AppraisalCycleType, startDate?: string | null) => {
  if (cycleType === 'ANNUAL') return 1;
  const month = Number(startDate?.slice(5, 7));
  return month && month <= 6 ? 1 : 2;
};

const emptyCycle = (): AppraisalCycleRequest => ({
  cycleName: `${currentYear} Annual Appraisal Cycle`,
  templateId: 0,
  cycleType: 'ANNUAL',
  cycleYear: currentYear,
  periodNo: 1,
  startDate: `${currentYear}-01-01`,
  submissionDeadline: `${currentYear}-12-15`,
  departmentIds: [],
});

const buildReusePayload = (cycle: AppraisalCycleResponse): AppraisalCycleRequest => {
  const nextYear = cycle.cycleYear + 1;
  const isAnnual = cycle.cycleType === 'ANNUAL';
  const startDate = isAnnual ? `${nextYear}-01-01` : `${nextYear}-01-01`;
  const deadline = isAnnual ? `${nextYear}-12-15` : `${nextYear}-06-15`;

  return {
    cycleName: `${nextYear} ${isAnnual ? 'Annual' : 'Semi-Annual'} Appraisal Cycle`,
    description: cycle.description ?? '',
    templateId: cycle.templateId,
    cycleType: cycle.cycleType,
    cycleYear: nextYear,
    periodNo: isAnnual ? 1 : cycle.periodNo ?? 1,
    startDate,
    submissionDeadline: deadline,
    departmentIds: cycle.departmentIds ?? [],
  };
};

const AppraisalCyclesPage = () => {
  const [cycles, setCycles] = useState<AppraisalCycleResponse[]>([]);
  const [templates, setTemplates] = useState<AppraisalTemplateResponse[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [cycleForm, setCycleForm] = useState<AppraisalCycleRequest>(() => emptyCycle());
  const [targetAllDepartments, setTargetAllDepartments] = useState(true);
  const [selectedCycle, setSelectedCycle] = useState<AppraisalCycleResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const endDate = useMemo(() => getEndDate(cycleForm), [cycleForm]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [cycleList, templateList, departmentList] = await Promise.all([
        appraisalCycleService.list(),
        appraisalTemplateService.list(),
        fetchDepartments(),
      ]);
      setCycles(cycleList);
      setTemplates(templateList.filter((template) => template.status !== 'ARCHIVED'));
      setDepartments(departmentList.filter((department) => department.status !== false));
      setSelectedCycle((previous) => previous ? cycleList.find((cycle) => cycle.id === previous.id) ?? null : null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const setCycleType = (cycleType: AppraisalCycleType) => {
    setCycleForm((previous) => {
      const startDate = cycleType === 'ANNUAL' ? `${previous.cycleYear}-01-01` : previous.startDate || `${previous.cycleYear}-01-01`;
      return {
        ...previous,
        cycleType,
        startDate,
        periodNo: getPeriodNo(cycleType, startDate),
        cycleName: `${previous.cycleYear} ${cycleType === 'ANNUAL' ? 'Annual' : 'Semi-Annual'} Appraisal Cycle`,
      };
    });
  };

  const setStartDate = (startDate: string) => {
    setCycleForm((previous) => {
      const nextYear = Number(startDate.slice(0, 4)) || previous.cycleYear;
      return {
        ...previous,
        startDate,
        cycleYear: nextYear,
        periodNo: getPeriodNo(previous.cycleType, startDate),
      };
    });
  };

  const setCycleYear = (cycleYear: number) => {
    setCycleForm((previous) => ({
      ...previous,
      cycleYear,
      startDate: previous.cycleType === 'ANNUAL' ? `${cycleYear}-01-01` : previous.startDate,
      cycleName: previous.cycleType === 'ANNUAL' ? `${cycleYear} Annual Appraisal Cycle` : previous.cycleName,
    }));
  };

  const toggleDepartment = (departmentId: number) => {
    setCycleForm((previous) => {
      const hasDepartment = previous.departmentIds.includes(departmentId);
      return {
        ...previous,
        departmentIds: hasDepartment
          ? previous.departmentIds.filter((id) => id !== departmentId)
          : [...previous.departmentIds, departmentId],
      };
    });
  };

  const validateCycle = () => {
    if (!cycleForm.cycleName.trim()) return 'Cycle name is required.';
    if (!cycleForm.templateId) return 'Select a template form record.';
    if (!cycleForm.startDate) return 'Start date is required.';
    if (!cycleForm.submissionDeadline) return 'Submission deadline is required.';
    if (!targetAllDepartments && cycleForm.departmentIds.length === 0) return 'Select at least one department or choose all departments.';
    return '';
  };

  const createCycle = async () => {
    const validationMessage = validateCycle();
    if (validationMessage) {
      setMessage(validationMessage);
      return;
    }

    await runAction(
      () => appraisalCycleService.create({
        ...cycleForm,
        cycleName: cycleForm.cycleName.trim(),
        cycleYear: cycleForm.cycleType === 'ANNUAL'
          ? cycleForm.cycleYear
          : Number(cycleForm.startDate?.slice(0, 4)) || cycleForm.cycleYear,
        periodNo: getPeriodNo(cycleForm.cycleType, cycleForm.startDate),
        departmentIds: targetAllDepartments ? [] : cycleForm.departmentIds,
      }),
      'Appraisal cycle created as draft record.',
    );
    setCycleForm(emptyCycle());
    setTargetAllDepartments(true);
  };

  const runAction = async (action: () => Promise<unknown>, doneMessage: string) => {
    setLoading(true);
    setMessage('');
    try {
      await action();
      setMessage(doneMessage);
      await loadData();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Action failed.');
    } finally {
      setLoading(false);
    }
  };

  const reuseCycle = async (cycle: AppraisalCycleResponse) => {
    await runAction(
      () => appraisalCycleService.reuse(cycle.id, buildReusePayload(cycle)),
      'Cycle re-used as a new draft record.',
    );
  };

  return (
    <div className="appraisal-page">
      <div className="appraisal-page-header">
        <div>
          <h1>Appraisal Cycle Records</h1>
          <p>Create cycle records by selecting an existing template form record.</p>
        </div>
      </div>

      {message && <div className="appraisal-card appraisal-message-card">{message}</div>}

      <div className="appraisal-card appraisal-cycle-create-card">
        <div className="appraisal-form-block-header">
          <div>
            <h2>Create Appraisal Cycle</h2>
            <p className="appraisal-muted">Choose cycle setup, target departments, and the template form record to use.</p>
          </div>
        </div>

        <div className="appraisal-inline-grid three">
          <label className="appraisal-field">
            <span>Cycle Name</span>
            <input value={cycleForm.cycleName} onChange={(e) => setCycleForm({ ...cycleForm, cycleName: e.target.value })} />
          </label>
          <label className="appraisal-field">
            <span>Cycle Type</span>
            <select value={cycleForm.cycleType} onChange={(e) => setCycleType(e.target.value as AppraisalCycleType)}>
              <option value="ANNUAL">Annual</option>
              <option value="SEMI_ANNUAL">Semi-Annual</option>
            </select>
          </label>
          <label className="appraisal-field">
            <span>Template Form Record</span>
            <select value={cycleForm.templateId} onChange={(e) => setCycleForm({ ...cycleForm, templateId: Number(e.target.value) })}>
              <option value={0}>Select template form record</option>
              {templates.map((template) => (
                <option key={template.id} value={template.id}>{template.templateName}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="appraisal-inline-grid four">
          <label className="appraisal-field">
            <span>Cycle Year</span>
            <input type="number" value={cycleForm.cycleYear} onChange={(e) => setCycleYear(Number(e.target.value))} />
          </label>
          <label className="appraisal-field">
            <span>Start Date</span>
            <input type="date" value={cycleForm.startDate ?? ''} onChange={(e) => setStartDate(e.target.value)} />
            <small>{displayDate(cycleForm.startDate)}</small>
          </label>
          <label className="appraisal-field">
            <span>End Date</span>
            <input disabled value={displayDate(endDate)} />
            <small>System calculated</small>
          </label>
          <label className="appraisal-field">
            <span>Submission Deadline</span>
            <input type="date" value={cycleForm.submissionDeadline} onChange={(e) => setCycleForm({ ...cycleForm, submissionDeadline: e.target.value })} />
            <small>{displayDate(cycleForm.submissionDeadline)}</small>
          </label>
        </div>


        <div className="appraisal-department-box">
          <label className="appraisal-checkbox-line">
            <input
              type="checkbox"
              checked={targetAllDepartments}
              onChange={(e) => {
                setTargetAllDepartments(e.target.checked);
                if (e.target.checked) {
                  setCycleForm((previous) => ({ ...previous, departmentIds: [] }));
                }
              }}
            />
            <span>All Departments</span>
          </label>

          {!targetAllDepartments && (
            <div className="appraisal-pill-list department-select-list">
              {departments.map((department) => (
                <label key={department.id} className="appraisal-pill selectable">
                  <input
                    type="checkbox"
                    checked={cycleForm.departmentIds.includes(department.id)}
                    onChange={() => toggleDepartment(department.id)}
                  />
                  {department.departmentName}
                </label>
              ))}
            </div>
          )}
        </div>

        <div className="appraisal-button-row final-actions">
          <button className="appraisal-button secondary" type="button" onClick={() => { setCycleForm(emptyCycle()); setTargetAllDepartments(true); }}>Cancel</button>
          <button className="appraisal-button primary" type="button" disabled={loading} onClick={() => void createCycle()}>
            Create Cycle
          </button>
        </div>
      </div>

      <div className="appraisal-card">
        <div className="appraisal-form-block-header">
          <div>
            <h2>Appraisal Cycle Record List</h2>
            <p className="appraisal-muted">Created appraisal cycle records are kept as history. Active cycles are visible to Project Managers.</p>
          </div>
          <button className="appraisal-button secondary" type="button" disabled={loading} onClick={() => void loadData()}>
            Refresh
          </button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="appraisal-table appraisal-cycle-record-table">
            <thead>
              <tr>
                <th>Cycle Name</th>
                <th>Form Type</th>
                <th>Start Date</th>
                <th>End Date</th>
                <th>Submission Deadline</th>
                <th>Status</th>
                <th>Locked</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {cycles.length === 0 && (
                <tr>
                  <td colSpan={8}>
                    <div className="appraisal-empty">No appraisal cycle records yet.</div>
                  </td>
                </tr>
              )}
              {cycles.map((cycle) => (
                <tr key={cycle.id}>
                  <td>
                    <strong>{cycle.cycleName}</strong><br />
                    <span className="appraisal-muted">Template: {cycle.templateName}</span><br />
                    <span className="appraisal-muted">Departments: {cycle.departmentNames?.join(', ') || '-'}</span>
                  </td>
                  <td>{cycle.cycleType.replace('_', '-')}</td>
                  <td>{displayDate(cycle.startDate)}</td>
                  <td>{displayDate(cycle.endDate)}</td>
                  <td>{displayDate(cycle.submissionDeadline)}</td>
                  <td><span className={`appraisal-status ${statusClass(cycle.status)}`}>{cycle.status}</span></td>
                  <td>{cycle.locked ? 'Yes' : 'No'}</td>
                  <td>
                    <div className="appraisal-button-row record-actions">
                      <button className="appraisal-button ghost" type="button" onClick={() => setSelectedCycle(cycle)}>View Form</button>
                      {cycle.status === 'DRAFT' && (
                        <button className="appraisal-button success" type="button" onClick={() => runAction(() => appraisalCycleService.activate(cycle.id), 'Cycle activated.')}>Active</button>
                      )}
                      {cycle.status === 'ACTIVE' && (
                        <button className="appraisal-button warning" type="button" onClick={() => runAction(() => appraisalCycleService.lock(cycle.id), 'Cycle locked.')}>Lock</button>
                      )}
                      {cycle.status !== 'COMPLETED' && (
                        <button className="appraisal-button secondary" type="button" onClick={() => runAction(() => appraisalCycleService.complete(cycle.id), 'Cycle completed.')}>Complete</button>
                      )}
                      <button className="appraisal-button ghost" type="button" onClick={() => reuseCycle(cycle)}>Re-use</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedCycle && (
        <div className="appraisal-card appraisal-cycle-view-card">
          <div className="appraisal-form-block-header">
            <div>
              <h2>{selectedCycle.cycleName}</h2>
              <p className="appraisal-muted">Read-only cycle detail</p>
            </div>
            <button className="appraisal-button ghost" type="button" onClick={() => setSelectedCycle(null)}>Close</button>
          </div>
          <div className="appraisal-detail-grid">
            <div><strong>Template</strong><span>{selectedCycle.templateName}</span></div>
            <div><strong>Type</strong><span>{selectedCycle.cycleType.replace('_', '-')}</span></div>
            <div><strong>Start Date</strong><span>{displayDate(selectedCycle.startDate)}</span></div>
            <div><strong>End Date</strong><span>{displayDate(selectedCycle.endDate)}</span></div>
            <div><strong>Submission Deadline</strong><span>{displayDate(selectedCycle.submissionDeadline)}</span></div>
            <div><strong>Status</strong><span>{selectedCycle.status}</span></div>
            <div><strong>Locked</strong><span>{selectedCycle.locked ? 'Yes' : 'No'}</span></div>
            <div><strong>Departments</strong><span>{selectedCycle.departmentNames?.join(', ') || '-'}</span></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AppraisalCyclesPage;
