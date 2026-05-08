import { useEffect, useMemo, useState } from 'react';
import { appraisalCycleService, appraisalWorkflowService } from '../../services/appraisalService';
import { getAllEmployees } from '../../services/employeeService';
import type { Employee } from '../../services/employeeService';
import type { AppraisalCycleResponse, EmployeeAppraisalFormResponse, PmAppraisalSubmitRequest } from '../../types/appraisal';
import AppraisalFormView from '../../components/appraisal/AppraisalFormView';
import './appraisal.css';

const EmployeePerformanceReviewPage = () => {
  const [cycles, setCycles] = useState<AppraisalCycleResponse[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedCycleId, setSelectedCycleId] = useState<number>(0);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number>(0);
  const [form, setForm] = useState<EmployeeAppraisalFormResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const selectedCycle = useMemo(() => cycles.find((cycle) => cycle.id === selectedCycleId), [cycles, selectedCycleId]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [activeCycles, employeeList] = await Promise.all([
          appraisalCycleService.getActiveForPm(),
          getAllEmployees(false),
        ]);
        setCycles(activeCycles);
        setEmployees(employeeList);
        if (activeCycles[0]) setSelectedCycleId(activeCycles[0].id);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const startDraft = async () => {
    if (!selectedCycleId || !selectedEmployeeId) return;
    setLoading(true);
    setMessage('');
    try {
      const draft = await appraisalWorkflowService.createPmDraft(selectedCycleId, selectedEmployeeId);
      setForm(draft);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to create PM draft.');
    } finally {
      setLoading(false);
    }
  };

  const submitPm = async (payload: PmAppraisalSubmitRequest) => {
    if (!form) return;
    setLoading(true);
    try {
      const updated = await appraisalWorkflowService.submitPmReview(form.id, payload);
      setForm(updated);
      setMessage('PM review submitted to Dept Head.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Submit failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="appraisal-page">
      <div className="appraisal-page-header">
        <div>
          <h1>Employee Performance Review</h1>
          <p>Select an active appraisal cycle and employee, then submit ratings to Dept Head.</p>
        </div>
      </div>

      {message && <div className="appraisal-card" style={{ marginBottom: 14 }}>{message}</div>}

      <div className="appraisal-grid">
        <div className="appraisal-card">
          <h2>Active Cycle & Employee</h2>
          <div className="appraisal-form">
            <label className="appraisal-field">
              <span>Active Cycle</span>
              <select value={selectedCycleId} onChange={(e) => setSelectedCycleId(Number(e.target.value))}>
                <option value={0}>Select cycle</option>
                {cycles.map((cycle) => (
                  <option key={cycle.id} value={cycle.id}>{cycle.cycleName}</option>
                ))}
              </select>
            </label>
            {selectedCycle && (
              <div className="appraisal-review-block">
                <p><strong>Type:</strong> {selectedCycle.cycleType}</p>
                <p><strong>Template:</strong> {selectedCycle.templateName}</p>
                <p><strong>Deadline:</strong> {selectedCycle.submissionDeadline}</p>
              </div>
            )}
            <label className="appraisal-field">
              <span>Employee</span>
              <select value={selectedEmployeeId} onChange={(e) => setSelectedEmployeeId(Number(e.target.value))}>
                <option value={0}>Search/select employee</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>{employee.name} - {employee.department || 'No department'}</option>
                ))}
              </select>
            </label>
            <button className="appraisal-button primary" type="button" disabled={loading || !selectedCycleId || !selectedEmployeeId} onClick={startDraft}>
              Open Form Template
            </button>
          </div>
        </div>

        <div>
          {form ? (
            <AppraisalFormView form={form} mode="pm" busy={loading} onPmSubmit={submitPm} />
          ) : (
            <div className="appraisal-empty">Choose cycle and employee to open the appraisal form template.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmployeePerformanceReviewPage;
