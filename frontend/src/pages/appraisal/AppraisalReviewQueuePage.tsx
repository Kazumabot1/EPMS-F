import { useEffect, useMemo, useState } from 'react';
import { appraisalWorkflowService } from '../../services/appraisalService';
import type { AppraisalReviewSubmitRequest, EmployeeAppraisalFormResponse } from '../../types/appraisal';
import AppraisalFormView from '../../components/appraisal/AppraisalFormView';
import './appraisal.css';

interface AppraisalReviewQueuePageProps {
  mode: 'dept-head' | 'hr';
}

const AppraisalReviewQueuePage = ({ mode }: AppraisalReviewQueuePageProps) => {
  const [forms, setForms] = useState<EmployeeAppraisalFormResponse[]>([]);
  const [selected, setSelected] = useState<EmployeeAppraisalFormResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const data = mode === 'dept-head'
        ? await appraisalWorkflowService.getDeptHeadQueue()
        : await appraisalWorkflowService.getHrQueue();
      setForms(data);
      setSelected((current) => data.find((item) => item.id === current?.id) ?? null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [mode]);

  const stats = useMemo(() => ({
    pending: forms.length,
  }), [forms]);

  const submitReview = async (payload: AppraisalReviewSubmitRequest) => {
    if (!selected) return;
    setLoading(true);
    setMessage('');
    try {
      const updated = mode === 'dept-head'
        ? await appraisalWorkflowService.submitDeptHeadReview(selected.id, payload)
        : await appraisalWorkflowService.approveByHr(selected.id, payload);
      setSelected(updated);
      setMessage(mode === 'dept-head' ? 'Dept Head review submitted to HR.' : 'HR completed the appraisal and sent it to the employee.');
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Submit failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="appraisal-page appraisal-dashboard-page">
      <div className="appraisal-dashboard-hero appraisal-review-hero">
        <span className="appraisal-dashboard-orb one" />
        <span className="appraisal-dashboard-orb two" />
        <div className="appraisal-dashboard-hero-content">
          <div>
            <p className="appraisal-dashboard-kicker">{mode === 'dept-head' ? 'Dept Head Check' : 'HR Final Review'}</p>
            <h1>{mode === 'dept-head' ? 'Manager Review Check' : 'Manager + Dept Head Review'}</h1>
            <p>{mode === 'dept-head' ? 'Open Manager submitted forms, check ratings and remarks, then submit to HR.' : 'Open forms checked by Dept Head, review both stages, sign, then submit to employee.'}</p>
          </div>
          <div className="appraisal-hero-stat-stack">
            <div className="appraisal-hero-stat-card"><strong>{stats.pending}</strong><span>Pending Forms</span></div>
          </div>
        </div>
      </div>

      {message && <div className="appraisal-card appraisal-message-card">{message}</div>}

      <div className="appraisal-card">
        <div className="appraisal-form-block-header">
          <div>
            <h2>{mode === 'dept-head' ? 'Manager Submitted Appraisal Forms' : 'Dept Head Checked Appraisal Forms'}</h2>
            <p className="appraisal-muted">Each row opens the full appraisal cycle form for checking.</p>
          </div>
          {loading && <span className="appraisal-muted">Loading...</span>}
        </div>

        <div className="appraisal-template-table-wrap">
          <table className="appraisal-template-table appraisal-cycle-record-table appraisal-modern-record-table">
            <thead>
              <tr>
                <th>Appraisal Name</th>
                <th>Employee</th>
                <th>Checked By</th>
                <th>Department</th>
                <th>Cycle Type</th>
                <th>Cycle Year</th>
                <th>Start Date</th>
                <th>End Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {forms.length === 0 && !loading ? (
                <tr>
                  <td colSpan={9}><div className="appraisal-empty">No pending forms.</div></td>
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
                  <td>{checkedByEmployeeId(mode, form)}</td>
                  <td>{form.departmentName}</td>
                  <td>{form.cycleType || '-'}</td>
                  <td>{form.cycleYear || '-'}</td>
                  <td>{formatDate(form.cycleStartDate || form.assessmentDate)}</td>
                  <td>{formatDate(form.cycleEndDate || form.effectiveDate)}</td>
                  <td><span className={statusClass(form.status)}>{form.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selected ? (
        <AppraisalFormView form={selected} mode={mode} busy={loading} onReviewSubmit={submitReview} />
      ) : (
        <div className="appraisal-empty">Open a pending form to start checking.</div>
      )}
    </div>
  );
};

const checkedByEmployeeId = (mode: AppraisalReviewQueuePageProps['mode'], form: EmployeeAppraisalFormResponse) => {
  if (mode === 'dept-head') return form.managerCheckedByEmployeeId || '-';
  return form.deptHeadCheckedByEmployeeId || '-';
};

const formatDate = (value?: string | null) => (value ? new Date(value).toLocaleDateString() : '-');

const statusClass = (status?: string | null) => {
  const normalized = status ?? '';
  if (normalized === 'COMPLETED') return 'appraisal-status green';
  if (normalized === 'RETURNED') return 'appraisal-status red';
  if (normalized === 'HR_PENDING' || normalized === 'DEPT_HEAD_PENDING') return 'appraisal-status amber';
  return 'appraisal-status gray';
};

export default AppraisalReviewQueuePage;
