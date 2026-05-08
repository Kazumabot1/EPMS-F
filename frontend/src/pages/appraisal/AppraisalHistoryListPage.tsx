import { useEffect, useState } from 'react';
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
  pm: 'Forms that you have submitted as Manager.',
  'dept-head': 'Employee forms that you have checked and sent to HR.',
  employee: 'Completed appraisal forms approved by HR.',
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
        setSelected(data[0] ?? null);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [role]);

  return (
    <div className="appraisal-page">
      <div className="appraisal-page-header">
        <div>
          <h1>{titleByRole[role]}</h1>
          <p>{descriptionByRole[role]}</p>
        </div>
      </div>

      <div className="appraisal-grid">
        <div className="appraisal-card">
          <h2>Records</h2>
          {loading && <p className="appraisal-muted">Loading...</p>}
          {forms.length === 0 && !loading ? (
            <div className="appraisal-empty">No records found.</div>
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
            <AppraisalFormView form={selected} mode={role === 'employee' ? 'employee' : 'readonly'} />
          ) : (
            <div className="appraisal-empty">Select a record to view details.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AppraisalHistoryListPage;