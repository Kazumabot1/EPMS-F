import { useEffect, useMemo, useState } from 'react';
import { feedbackCampaignApi } from '../../../api/feedbackCampaignApi';
import type {
  FeedbackCampaign,
  EvaluatorConfigInput,
  FeedbackAssignmentGenerationResponse,
  FeedbackRelationshipType,
  ManualAssignmentInput,
} from '../../../types/feedbackCampaign';

interface Props {
  campaign: FeedbackCampaign | null;
  targetIds: number[];
  evalConfig: EvaluatorConfigInput;
  onAssignmentsGenerated: (result: FeedbackAssignmentGenerationResponse) => void;
}

const relationshipOptions: FeedbackRelationshipType[] = ['MANAGER', 'PEER', 'SUBORDINATE', 'SELF'];

export default function AssignmentPreviewTab({ campaign, targetIds, evalConfig, onAssignmentsGenerated }: Props) {
  const [generating, setGenerating] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [result, setResult] = useState<FeedbackAssignmentGenerationResponse | null>(null);
  const [error, setError] = useState('');
  const [manualForm, setManualForm] = useState<ManualAssignmentInput>({
    targetEmployeeId: targetIds[0] ?? 0,
    evaluatorEmployeeId: 0,
    relationshipType: 'PEER',
  });

  useEffect(() => {
    if (!campaign) return;
    setManualForm((current) => ({
      ...current,
      targetEmployeeId: current.targetEmployeeId || targetIds[0] || 0,
    }));
  }, [campaign, targetIds]);

  useEffect(() => {
    if (!campaign) return;
    setError('');
    setLoadingPreview(true);
    feedbackCampaignApi.getAssignmentPreview(campaign.id)
        .then((preview) => setResult(preview))
        .catch(() => {
          // Preview is best-effort before first generation; keep the tab usable.
        })
        .finally(() => setLoadingPreview(false));
  }, [campaign?.id]);

  const assignmentsByTarget = useMemo(() => {
    const grouped = new Map<number, NonNullable<FeedbackAssignmentGenerationResponse['assignmentDetails']>>();
    for (const assignment of result?.assignmentDetails ?? []) {
      const group = grouped.get(assignment.targetEmployeeId) ?? [];
      group.push(assignment);
      grouped.set(assignment.targetEmployeeId, group);
    }
    return grouped;
  }, [result]);

  if (!campaign) {
    return (
        <div className="hfd-locked-overlay">
          <i className="bi bi-lock" />
          <h3>Complete Previous Steps</h3>
          <p>Create a campaign and configure targets/evaluators first.</p>
        </div>
    );
  }

  const isDraft = campaign.status === 'DRAFT';
  const configLabels = [
    evalConfig.includeManager && 'Manager',
    evalConfig.includeSelf && 'Self',
    evalConfig.includeSubordinates && 'Subordinates',
    evalConfig.includeDepartmentPeers && 'Department Peers',
    evalConfig.includeTeamPeers && 'Team Peers',
    evalConfig.includeProjectPeers && 'Project Peers',
    evalConfig.includeCrossTeamPeers && 'Other-Team Peers',
  ].filter(Boolean).join(', ');

  const estimatedPerTarget =
      evalConfig.peerCount +
      (evalConfig.includeManager ? 1 : 0) +
      (evalConfig.includeSelf ? 1 : 0) +
      (evalConfig.includeSubordinates ? 1 : 0);

  const updateResult = (res: FeedbackAssignmentGenerationResponse) => {
    setResult(res);
    onAssignmentsGenerated(res);
  };

  const handleGenerate = async () => {
    setError('');
    setGenerating(true);
    try {
      const res = await feedbackCampaignApi.generateAssignments(campaign.id, evalConfig);
      updateResult(res);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleAddManual = async () => {
    if (!manualForm.targetEmployeeId || !manualForm.evaluatorEmployeeId) {
      setError('Choose a target employee and enter an evaluator employee ID.');
      return;
    }
    setError('');
    try {
      const res = await feedbackCampaignApi.addManualAssignment(campaign.id, manualForm);
      updateResult(res);
      setManualForm((current) => ({ ...current, evaluatorEmployeeId: 0 }));
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleRemove = async (assignmentId: number) => {
    setError('');
    try {
      const res = await feedbackCampaignApi.removeAssignment(campaign.id, assignmentId);
      updateResult(res);
    } catch (e: any) {
      setError(e.message);
    }
  };

  return (
      <div>
        <div className="hfd-card-header">
          <div className="hfd-card-title">
            <i className="bi bi-clipboard-check" />
            <div>
              <h2>Assignment Preview & Manual Override</h2>
              <p>Generate, inspect, remove, or manually add evaluators before campaign activation</p>
            </div>
          </div>
        </div>

        {error && <div className="hfd-alert hfd-alert-error"><i className="bi bi-exclamation-triangle" />{error}</div>}
        {loadingPreview && <div className="hfd-alert"><i className="bi bi-arrow-repeat" />Loading existing assignment preview...</div>}
        {!isDraft && (
            <div className="hfd-alert hfd-alert-warning">
              <i className="bi bi-lock-fill" />
              Manual evaluator changes are locked because this campaign is {campaign.status}.
            </div>
        )}

        <div style={{ background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: 12, padding: 18, marginBottom: 20 }}>
          <h4 style={{ margin: '0 0 14px', fontSize: '0.9rem', fontWeight: 700, color: '#374151' }}>
            <i className="bi bi-info-circle" style={{ marginRight: 6, color: '#6366f1' }} />Configuration Summary
          </h4>
          <div className="hfd-grid-2" style={{ gap: 12 }}>
            {[
              ['Campaign', campaign.name],
              ['Status', campaign.status],
              ['Start Date', campaign.startDate],
              ['End Date', campaign.endDate],
              ['Target Employees', String(targetIds.length)],
              ['Evaluator Sources', configLabels || '—'],
              ['Peer Count / Target', String(evalConfig.peerCount)],
              ['Estimated Evaluators', String(targetIds.length * estimatedPerTarget)],
            ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f1f5f9', fontSize: '0.88rem' }}>
                  <span style={{ color: '#6b7280' }}>{k}</span>
                  <strong style={{ color: '#1f2937' }}>{v}</strong>
                </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 18 }}>
          <button
              id="btn-generate-assignments"
              className="hfd-btn hfd-btn-success"
              onClick={handleGenerate}
              disabled={generating || targetIds.length === 0 || !isDraft}
          >
            {generating ? <><i className="bi bi-arrow-repeat" /> Regenerating...</> : <><i className="bi bi-lightning-charge-fill" /> Generate / Regenerate Assignments</>}
          </button>
        </div>

        {result && (
            <>
              <div className="hfd-stat-row">
                <div className="hfd-stat-pill"><div className="val">{result.totalTargets}</div><div className="lbl">Total Targets</div></div>
                <div className="hfd-stat-pill"><div className="val">{result.totalEvaluatorsGenerated}</div><div className="lbl">Current Assignments</div></div>
                <div className="hfd-stat-pill"><div className="val">{result.assignmentDetails?.filter(a => a.selectionMethod === 'MANUAL').length ?? 0}</div><div className="lbl">Manual Assignments</div></div>
              </div>

              {result.warnings.length > 0 && (
                  <div className="hfd-warning-box">
                    <i className="bi bi-exclamation-triangle-fill" />
                    <strong>Warnings:</strong>
                    <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>
                      {result.warnings.map((w, i) => <li key={i}>{w}</li>)}
                    </ul>
                  </div>
              )}

              {isDraft && (
                  <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 16, marginTop: 18 }}>
                    <h4 style={{ margin: '0 0 12px' }}>Add Manual Evaluator</h4>
                    <div className="hfd-grid-2" style={{ gap: 12 }}>
                      <label>
                        <span>Target Employee</span>
                        <select
                            className="form-select"
                            value={manualForm.targetEmployeeId}
                            onChange={(event) => setManualForm({ ...manualForm, targetEmployeeId: Number(event.target.value) })}
                        >
                          {targetIds.map(id => <option key={id} value={id}>Employee #{id}</option>)}
                        </select>
                      </label>
                      <label>
                        <span>Evaluator Employee ID</span>
                        <input
                            className="form-control"
                            type="number"
                            min={1}
                            value={manualForm.evaluatorEmployeeId || ''}
                            onChange={(event) => setManualForm({ ...manualForm, evaluatorEmployeeId: Number(event.target.value) })}
                            placeholder="e.g. 1024"
                        />
                      </label>
                      <label>
                        <span>Relationship</span>
                        <select
                            className="form-select"
                            value={manualForm.relationshipType}
                            onChange={(event) => setManualForm({ ...manualForm, relationshipType: event.target.value as FeedbackRelationshipType })}
                        >
                          {relationshipOptions.map(option => <option key={option} value={option}>{option}</option>)}
                        </select>
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 22 }}>
                        <input
                            type="checkbox"
                            checked={manualForm.anonymous ?? false}
                            onChange={(event) => setManualForm({ ...manualForm, anonymous: event.target.checked })}
                        />
                        Anonymous override
                      </label>
                    </div>
                    <button className="hfd-btn hfd-btn-primary" onClick={handleAddManual} style={{ marginTop: 12 }}>
                      <i className="bi bi-plus-circle" /> Add Evaluator
                    </button>
                  </div>
              )}

              <h4 style={{ margin: '20px 0 10px', fontSize: '0.9rem', fontWeight: 700, color: '#374151' }}>
                Target Summary
              </h4>
              <div className="hfd-table-wrap">
                <table className="hfd-preview-table">
                  <thead>
                  <tr>
                    <th>Target Emp ID</th>
                    <th>Manager</th>
                    <th>Self</th>
                    <th>Subordinate</th>
                    <th>Peer</th>
                    <th>Auto</th>
                    <th>Manual</th>
                    <th>Total</th>
                  </tr>
                  </thead>
                  <tbody>
                  {result.requests.map(r => (
                      <tr key={r.requestId}>
                        <td>#{r.targetEmployeeId}</td>
                        <td>{r.managerAssignments}</td>
                        <td>{r.selfAssignments ?? 0}</td>
                        <td>{r.subordinateAssignments ?? 0}</td>
                        <td>{r.peerAssignments}</td>
                        <td>{r.autoAssignments ?? 0}</td>
                        <td>{r.manualAssignments ?? 0}</td>
                        <td><strong>{r.totalAssignments}</strong></td>
                      </tr>
                  ))}
                  </tbody>
                </table>
              </div>

              <h4 style={{ margin: '20px 0 10px', fontSize: '0.9rem', fontWeight: 700, color: '#374151' }}>
                Assignment Details
              </h4>
              <div className="hfd-table-wrap">
                <table className="hfd-preview-table">
                  <thead>
                  <tr>
                    <th>Target</th>
                    <th>Evaluator</th>
                    <th>Relationship</th>
                    <th>Method</th>
                    <th>Status</th>
                    <th>Anonymous</th>
                    <th>Action</th>
                  </tr>
                  </thead>
                  <tbody>
                  {(result.assignmentDetails ?? []).map(assignment => (
                      <tr key={assignment.assignmentId}>
                        <td>{assignment.targetEmployeeName ?? `Employee #${assignment.targetEmployeeId}`}</td>
                        <td>{assignment.evaluatorEmployeeName ?? `Employee #${assignment.evaluatorEmployeeId}`}</td>
                        <td>{assignment.relationshipType}</td>
                        <td>{assignment.selectionMethod}</td>
                        <td>{assignment.status}</td>
                        <td>{assignment.anonymous ? 'Yes' : 'No'}</td>
                        <td>
                          <button
                              className="hfd-btn hfd-btn-outline"
                              disabled={!isDraft || assignment.status === 'SUBMITTED'}
                              onClick={() => handleRemove(assignment.assignmentId)}
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                  ))}
                  {(result.assignmentDetails ?? []).length === 0 && (
                      <tr><td colSpan={7}>No evaluator assignments yet.</td></tr>
                  )}
                  </tbody>
                </table>
              </div>

              {Array.from(assignmentsByTarget.entries()).some(([, assignments]) => assignments.length === 0) ? (
                  <div className="hfd-warning-box" style={{ marginTop: 14 }}>
                    Some targets still have no evaluators. Add manual evaluators or regenerate before activation.
                  </div>
              ) : null}
            </>
        )}

        {!result && (
            <div className="hfd-alert" style={{ marginTop: 16 }}>
              Generate assignments to see target-level counts and evaluator detail rows. HR can then remove wrong evaluators or add manual overrides before activation.
            </div>
        )}
      </div>
  );
}
