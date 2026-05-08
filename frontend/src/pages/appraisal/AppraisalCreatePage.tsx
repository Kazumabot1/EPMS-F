import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { fetchDepartments } from '../../services/departmentService';
import type { Department } from '../../services/departmentService';
import { appraisalCycleService, appraisalTemplateService } from '../../services/appraisalService';
import type {
  AppraisalCycleRequest,
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
  cycleName: `${currentYear} Annual Appraisal`,
  templateId: 0,
  cycleType: 'ANNUAL',
  cycleYear: currentYear,
  periodNo: 1,
  startDate: `${currentYear}-01-01`,
  submissionDeadline: `${currentYear}-12-15`,
  departmentIds: [],
});

const AppraisalCreatePage = () => {
  const [searchParams] = useSearchParams();
  const preselectedTemplateId = Number(searchParams.get('templateId') || 0);
  const [templates, setTemplates] = useState<AppraisalTemplateResponse[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [cycleForm, setCycleForm] = useState<AppraisalCycleRequest>(() => emptyCycle());
  const [targetAllDepartments, setTargetAllDepartments] = useState(true);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const endDate = useMemo(() => getEndDate(cycleForm), [cycleForm]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [templateList, departmentList] = await Promise.all([
        appraisalTemplateService.list(),
        fetchDepartments(),
      ]);
      setTemplates(templateList);
      setDepartments(departmentList.filter((department) => department.status !== false));
      if (preselectedTemplateId) {
        const selectedTemplate = templateList.find((template) => template.id === preselectedTemplateId);
        if (selectedTemplate) {
          setCycleForm((previous) => ({ ...previous, templateId: selectedTemplate.id }));
          setMessage(`Template selected: ${selectedTemplate.templateName} (v${selectedTemplate.versionNo ?? 1}).`);
        } else {
          setMessage('Selected template form record was not found. Please choose another template.');
        }
      }
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
        cycleName: `${previous.cycleYear} ${cycleType === 'ANNUAL' ? 'Annual' : 'Semi-Annual'} Appraisal`,
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
      cycleName: previous.cycleType === 'ANNUAL' ? `${cycleYear} Annual Appraisal` : previous.cycleName,
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
    if (!cycleForm.cycleName.trim()) return 'Appraisal name is required.';
    if (!cycleForm.templateId) return 'Select a template form record.';
    if (!cycleForm.startDate) return 'Start date is required.';
    if (!cycleForm.submissionDeadline) return 'Submission deadline is required.';
    if (!targetAllDepartments && cycleForm.departmentIds.length === 0) return 'Select at least one department or choose all departments.';
    return '';
  };

  const createAppraisal = async () => {
    const validationMessage = validateCycle();
    if (validationMessage) {
      setMessage(validationMessage);
      return;
    }

    setLoading(true);
    setMessage('');
    try {
      await appraisalCycleService.create({
        ...cycleForm,
        cycleName: cycleForm.cycleName.trim(),
        cycleYear: cycleForm.cycleType === 'ANNUAL'
          ? cycleForm.cycleYear
          : Number(cycleForm.startDate?.slice(0, 4)) || cycleForm.cycleYear,
        periodNo: getPeriodNo(cycleForm.cycleType, cycleForm.startDate),
        departmentIds: targetAllDepartments ? [] : cycleForm.departmentIds,
      });
      setMessage('Appraisal created as draft record. You can manage it in Appraisal Create Records.');
      setCycleForm(emptyCycle());
      setTargetAllDepartments(true);
      await loadData();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Action failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="appraisal-page">
      <div className="appraisal-page-header">
        <div>
          <h1>Appraisal Create</h1>
          <p>Create an appraisal by selecting cycle setup, departments, and any reusable template form record.</p>
        </div>
      </div>

      {message && <div className="appraisal-card appraisal-message-card">{message}</div>}

      <div className="appraisal-card appraisal-cycle-create-card">
        <div className="appraisal-form-block-header">
          <div>
            <h2>Create Appraisal</h2>
            <p className="appraisal-muted">Choose the appraisal setup, target departments, and a reusable general template form record.</p>
          </div>
          <button className="appraisal-button secondary" type="button" disabled={loading} onClick={() => void loadData()}>
            Refresh Data
          </button>
        </div>

        <div className="appraisal-inline-grid three">
          <label className="appraisal-field">
            <span>Appraisal Name</span>
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
                <option key={template.id} value={template.id}>{template.templateName} (v{template.versionNo ?? 1})</option>
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
          <button className="appraisal-button primary" type="button" disabled={loading} onClick={() => void createAppraisal()}>
            Create Appraisal
          </button>
        </div>
      </div>
    </div>
  );
};

export default AppraisalCreatePage;
