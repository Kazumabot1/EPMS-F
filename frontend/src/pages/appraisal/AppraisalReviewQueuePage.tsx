import { useEffect, useState } from 'react';
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
      setSelected((current) => data.find((item) => item.id === current?.id) ?? data[0] ?? null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [mode]);

  const submitReview = async (payload: AppraisalReviewSubmitRequest) => {
    if (!selected) return;
    setLoading(true);
    setMessage('');
    try {
      const updated = mode === 'dept-head'
        ? await appraisalWorkflowService.submitDeptHeadReview(selected.id, payload)
        : await appraisalWorkflowService.approveByHr(selected.id, payload);
      setSelected(updated);
      setMessage(mode === 'dept-head' ? 'Submitted to HR.' : 'Appraisal completed and visible to employee.');
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Submit failed.');
    } finally {
      setLoading(false);
    }
  };

  const returnToPm = async (note: string) => {
    if (!selected) return;
    setLoading(true);
    setMessage('');
    try {
      await appraisalWorkflowService.returnToPm(selected.id, { note });
      setMessage('Returned to Manager.');
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Return failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="appraisal-page">
      <div className="appraisal-page-header">
        <div>
          <h1>{mode === 'dept-head' ? 'Manager Review Check' : 'Manager + Dept Review Check'}</h1>
          <p>{mode === 'dept-head' ? 'Review manager-submitted employee forms and submit them to HR.' : 'Check Manager and Dept Head reviews, then approve completed forms.'}</p>
        </div>
      </div>

      {message && <div className="appraisal-card" style={{ marginBottom: 14 }}>{message}</div>}

      <div className="appraisal-grid">
        <div className="appraisal-card">
          <h2>{mode === 'dept-head' ? 'Manager Submitted Forms' : 'In Review Forms'}</h2>
          {forms.length === 0 && !loading ? (
            <div className="appraisal-empty">No pending forms.</div>
          ) : (
            <div className="appraisal-check-list">
              {forms.map((form) => (
                <div key={form.id} className={`appraisal-list-card ${selected?.id === form.id ? 'active' : ''}`} onClick={() => setSelected(form)}>
                  <strong>{form.employeeName}</strong>
                  <p className="appraisal-muted">{form.cycleName} - {form.departmentName}</p>
                  <span className="appraisal-status">{form.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          {selected ? (
            <AppraisalFormView form={selected} mode={mode} busy={loading} onReviewSubmit={submitReview} onReturnToPm={returnToPm} />
          ) : (
            <div className="appraisal-empty">Select a pending form to check.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AppraisalReviewQueuePage;