import { useEffect, useMemo, useState } from 'react';
import { appraisalWorkflowService } from '../../services/appraisalService';
import type { EmployeeAppraisalFormResponse } from '../../types/appraisal';
import AppraisalFormView from '../../components/appraisal/AppraisalFormView';
import './appraisal.css';

interface AppraisalHistoryListPageProps {
  role: 'pm' | 'dept-head' | 'employee';
}

const titleByRole = {
  pm: 'Review History List',
  'dept-head': 'Review Check Record',
  employee: 'Performance Appraisal Cycle',
};

const descriptionByRole = {
  pm: 'Employee appraisal records submitted by Manager. Records are view-only.',
  'dept-head': 'Employee appraisal records checked by Dept Head and sent to HR.',
  employee: 'Completed appraisal forms approved by HR and sent to you.',
};

const AppraisalHistoryListPage = ({ role }: AppraisalHistoryListPageProps) => {
  const [forms, setForms] = useState<EmployeeAppraisalFormResponse[]>([]);
  const [selected, setSelected] = useState<EmployeeAppraisalFormResponse | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = role === 'pm'
          ? await appraisalWorkflowService.getPmHistory()
          : role === 'dept-head'
            ? await appraisalWorkflowService.getDeptHeadHistory()
            : await appraisalWorkflowService.getEmployeeForms();
        setForms(data);
        setSelected(null);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [role]);

  const stats = useMemo(() => ({
    total: forms.length,
  }), [forms]);

  return (
    <div className="appraisal-page appraisal-dashboard-page">
      <div className="appraisal-dashboard-hero appraisal-history-hero">
        <span className="appraisal-dashboard-orb one" />
        <span className="appraisal-dashboard-orb two" />
        <div className="appraisal-dashboard-hero-content">
          <div>
            <p className="appraisal-dashboard-kicker">Appraisal Records</p>
            <h1>{titleByRole[role]}</h1>
            <p>{descriptionByRole[role]}</p>
          </div>
          <div className="appraisal-hero-stat-stack">
            <div className="appraisal-hero-stat-card"><strong>{stats.total}</strong><span>Total Records</span></div>
          </div>
        </div>
      </div>

      <div className="appraisal-card">
        <div className="appraisal-form-block-header">
          <div>
            <h2>{role === 'pm' ? 'Manager Reviewed Employee Records' : role === 'dept-head' ? 'Dept Head Checked Records' : 'Completed Appraisal Records'}</h2>
            <p className="appraisal-muted">Click any record row to view the full appraisal cycle form in a modern box.</p>
          </div>
          {loading && <span className="appraisal-muted">Loading...</span>}
        </div>

        <div className="appraisal-template-table-wrap">
          <table className="appraisal-template-table appraisal-cycle-record-table appraisal-modern-record-table">
            <thead>
              <tr>
                <th>Appraisal Name</th>
                <th>Employee</th>
                <th>Position</th>
                <th>Department</th>
                <th>Review Date Time</th>
                <th>Score</th>
              </tr>
            </thead>
            <tbody>
              {forms.length === 0 && !loading ? (
                <tr>
                  <td colSpan={6}><div className="appraisal-empty">No records found.</div></td>
                </tr>
              ) : forms.map((form) => (
                <tr
                  key={form.id}
                  className={`appraisal-clickable-row ${selected?.id === form.id ? 'appraisal-selected-row' : ''}`}
                  onClick={() => setSelected(form)}
                  title="Open appraisal form"
                >
                  <td><strong>{form.cycleName}</strong><p className="appraisal-muted">Form #{form.id}</p></td>
                  <td><strong>{form.employeeName}</strong><p className="appraisal-muted">{form.employeeCode || '-'}</p></td>
                  <td>{form.positionName || '-'}</td>
                  <td>{form.departmentName}</td>
                  <td>{formatDateTime(reviewDateTime(role, form))}</td>
                  <td>{formatPercent(form.scorePercent)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selected ? (
        <AppraisalFormView form={selected} mode={role === 'employee' ? 'employee' : 'readonly'} />
      ) : (
        <div className="appraisal-empty">Open a record to view the full appraisal cycle form.</div>
      )}
    </div>
  );
};

const reviewDateTime = (role: AppraisalHistoryListPageProps['role'], form: EmployeeAppraisalFormResponse) => {
  if (role === 'pm') return form.pmSubmittedAt;
  if (role === 'dept-head') return form.deptHeadSubmittedAt;
  return form.hrApprovedAt;
};

const formatDateTime = (value?: string | null) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
};

const formatPercent = (value?: number | null) => {
  if (value === undefined || value === null || Number.isNaN(value)) return '-';
  return `${Math.round(value)}%`;
};

export default AppraisalHistoryListPage;
