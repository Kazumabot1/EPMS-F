import { useState } from 'react';
import { feedbackCampaignApi } from '../../../api/feedbackCampaignApi';
import type { FeedbackCampaign, EvaluatorConfigInput, FeedbackAssignmentGenerationResponse } from '../../../types/feedbackCampaign';

interface Props {
  campaign: FeedbackCampaign | null;
  targetIds: number[];
  evalConfig: EvaluatorConfigInput;
  onAssignmentsGenerated: (result: FeedbackAssignmentGenerationResponse) => void;
}

export default function AssignmentPreviewTab({ campaign, targetIds, evalConfig, onAssignmentsGenerated }: Props) {
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<FeedbackAssignmentGenerationResponse | null>(null);
  const [error, setError] = useState('');

  if (!campaign) {
    return (
      <div className="hfd-locked-overlay">
        <i className="bi bi-lock" />
        <h3>Complete Previous Steps</h3>
        <p>Create a campaign and configure targets/evaluators first.</p>
      </div>
    );
  }

  const configLabels = [
    evalConfig.includeManager && 'Manager',
    evalConfig.includeTeamPeers && 'Team Peers',
    evalConfig.includeProjectPeers && 'Project Peers',
    evalConfig.includeCrossTeamPeers && 'Cross-Team Peers',
  ].filter(Boolean).join(', ');

  const handleGenerate = async () => {
    if (!campaign) return;
    setError('');
    setGenerating(true);
    try {
      const res = await feedbackCampaignApi.generateAssignments(campaign.id, evalConfig);
      setResult(res);
      onAssignmentsGenerated(res);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div>
      <div className="hfd-card-header">
        <div className="hfd-card-title">
          <i className="bi bi-clipboard-check" />
          <div>
            <h2>Assignment Preview & Confirmation</h2>
            <p>Review the configuration before generating evaluator assignments</p>
          </div>
        </div>
      </div>

      {error && <div className="hfd-alert hfd-alert-error"><i className="bi bi-exclamation-triangle" />{error}</div>}

      {/* Config summary */}
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
            ['Estimated Evaluators', String(targetIds.length * (evalConfig.peerCount + (evalConfig.includeManager ? 1 : 0)))],
          ].map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f1f5f9', fontSize: '0.88rem' }}>
              <span style={{ color: '#6b7280' }}>{k}</span>
              <strong style={{ color: '#1f2937' }}>{v}</strong>
            </div>
          ))}
        </div>
      </div>

      {/* Preview stats (after generation) */}
      {result && (
        <>
          <div className="hfd-stat-row">
            <div className="hfd-stat-pill">
              <div className="val">{result.totalTargets}</div>
              <div className="lbl">Total Targets</div>
            </div>
            <div className="hfd-stat-pill">
              <div className="val">{result.totalEvaluatorsGenerated}</div>
              <div className="lbl">Evaluators Generated</div>
            </div>
            <div className="hfd-stat-pill">
              <div className="val">{result.requests.length}</div>
              <div className="lbl">Assignments Created</div>
            </div>
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

          <h4 style={{ margin: '20px 0 10px', fontSize: '0.9rem', fontWeight: 700, color: '#374151' }}>
            Sample Assignments (first 10)
          </h4>
          <div className="hfd-table-wrap">
            <table className="hfd-preview-table">
              <thead>
                <tr>
                  <th>Request ID</th>
                  <th>Target Emp ID</th>
                  <th>Manager Assignments</th>
                  <th>Peer Assignments</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {result.requests.slice(0, 10).map(r => (
                  <tr key={r.requestId}>
                    <td>{r.requestId}</td>
                    <td>#{r.targetEmployeeId}</td>
                    <td>{r.managerAssignments}</td>
                    <td>{r.peerAssignments}</td>
                    <td><strong>{r.totalAssignments}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="hfd-alert hfd-alert-success" style={{ marginTop: 16 }}>
            <i className="bi bi-check-circle-fill" />
            Assignments generated successfully! You can now monitor progress in Tab 5.
          </div>
        </>
      )}

      {!result && (
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 8 }}>
          <button
            id="btn-generate-assignments"
            className="hfd-btn hfd-btn-success"
            onClick={handleGenerate}
            disabled={generating || targetIds.length === 0}
            style={{ fontSize: '0.95rem', padding: '11px 28px' }}
          >
            {generating
              ? <><i className="bi bi-arrow-repeat" /> Generating…</>
              : <><i className="bi bi-lightning-charge-fill" /> Confirm & Generate Assignments</>
            }
          </button>
        </div>
      )}
    </div>
  );
}
