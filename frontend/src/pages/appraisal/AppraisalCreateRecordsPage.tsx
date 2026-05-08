import { useEffect, useState } from 'react';
import { appraisalCycleService } from '../../services/appraisalService';
import type {
  AppraisalCycleRequest,
  AppraisalCycleResponse,
} from '../../types/appraisal';
import './appraisal.css';

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

const buildReusePayload = (cycle: AppraisalCycleResponse): AppraisalCycleRequest => {
  const nextYear = cycle.cycleYear + 1;
  const isAnnual = cycle.cycleType === 'ANNUAL';
  const startDate = isAnnual ? `${nextYear}-01-01` : `${nextYear}-01-01`;
  const deadline = isAnnual ? `${nextYear}-12-15` : `${nextYear}-06-15`;

  return {
    cycleName: `${nextYear} ${isAnnual ? 'Annual' : 'Semi-Annual'} Appraisal`,
    templateId: cycle.templateId,
    cycleType: cycle.cycleType,
    cycleYear: nextYear,
    periodNo: isAnnual ? 1 : cycle.periodNo ?? 1,
    startDate,
    submissionDeadline: deadline,
    departmentIds: cycle.departmentIds ?? [],
  };
};

const AppraisalCreateRecordsPage = () => {
  const [cycles, setCycles] = useState<AppraisalCycleResponse[]>([]);
  const [selectedCycle, setSelectedCycle] = useState<AppraisalCycleResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const cycleList = await appraisalCycleService.list();
      setCycles(cycleList);
      setSelectedCycle((previous) => previous ? cycleList.find((cycle) => cycle.id === previous.id) ?? null : null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

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
      'Appraisal re-used as a new draft record.',
    );
  };

  return (
    <div className="appraisal-page">
      <div className="appraisal-page-header">
        <div>
          <h1>Appraisal Create Records</h1>
          <p>Manage appraisal records created from template form records.</p>
        </div>
        <button className="appraisal-button secondary" type="button" disabled={loading} onClick={() => void loadData()}>
          Refresh
        </button>
      </div>

      {message && <div className="appraisal-card appraisal-message-card">{message}</div>}

      <div className="appraisal-card">
        <div className="appraisal-form-block-header">
          <div>
            <h2>Appraisal Create Record List</h2>
            <p className="appraisal-muted">Created appraisal records are kept as history. Active records are visible to Project Managers.</p>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="appraisal-table appraisal-cycle-record-table">
            <thead>
              <tr>
                <th>Appraisal Name</th>
                <th>Cycle Type</th>
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
                    <div className="appraisal-empty">No appraisal create records yet.</div>
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
                        <button className="appraisal-button success" type="button" onClick={() => runAction(() => appraisalCycleService.activate(cycle.id), 'Appraisal activated.')}>Active</button>
                      )}
                      {cycle.status === 'ACTIVE' && (
                        <button className="appraisal-button warning" type="button" onClick={() => runAction(() => appraisalCycleService.lock(cycle.id), 'Appraisal locked.')}>Lock</button>
                      )}
                      {cycle.status !== 'COMPLETED' && (
                        <button className="appraisal-button secondary" type="button" onClick={() => runAction(() => appraisalCycleService.complete(cycle.id), 'Appraisal completed.')}>Complete</button>
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
              <p className="appraisal-muted">Read-only appraisal detail</p>
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

export default AppraisalCreateRecordsPage;
