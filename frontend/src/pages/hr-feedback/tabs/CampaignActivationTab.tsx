import { useEffect, useState } from 'react';
import { hrFeedbackApi } from '../../../api/hrFeedbackApi';
import type { FeedbackCampaign } from '../../../types/feedbackCampaign';
import type { FeedbackCompletionDashboard } from '../../../types/feedback';

interface Props {
  activeCampaign: FeedbackCampaign | null;
}

export default function CampaignMonitoringTab({ activeCampaign }: Props) {
  const [campaigns, setCampaigns] = useState<FeedbackCampaign[]>([]);
  const [selectedId, setSelectedId] = useState<number | ''>(activeCampaign?.id ?? '');
  const [dashboard, setDashboard] = useState<FeedbackCompletionDashboard | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    hrFeedbackApi.getAllCampaigns()
      .then(setCampaigns)
      .catch(e => setError(e.message));
  }, []);

  useEffect(() => {
    if (activeCampaign?.id) setSelectedId(activeCampaign.id);
  }, [activeCampaign?.id]);

  useEffect(() => {
    if (!selectedId) { setDashboard(null); return; }
    setLoading(true);
    setError('');
    hrFeedbackApi.getCompletionDashboard(selectedId as number)
      .then(setDashboard)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [selectedId]);

  const completion = dashboard?.completionPercent ?? 0;
  const radius = 40;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (completion / 100) * circ;

  const selectedCampaign = campaigns.find(c => c.id === selectedId);

  return (
    <div>
      <div className="hfd-card-header">
        <div className="hfd-card-title">
          <i className="bi bi-graph-up-arrow" />
          <div>
            <h2>Campaign Monitoring</h2>
            <p>Track submission progress and pending evaluators</p>
          </div>
        </div>
      </div>

      <div className="hfd-campaign-select-bar">
        <label className="hfd-label" style={{ margin: 0, whiteSpace: 'nowrap' }}>Select Campaign:</label>
        <select
          id="monitoring-campaign-select"
          className="hfd-select"
          value={selectedId}
          onChange={e => setSelectedId(e.target.value ? +e.target.value : '')}
        >
          <option value="">— Choose a campaign —</option>
          {campaigns.map(c => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.status})
            </option>
          ))}
        </select>
        {selectedCampaign && (
          <span className={`hfd-status-badge ${selectedCampaign.status}`}>
            {selectedCampaign.status}
          </span>
        )}
      </div>

      {error && <div className="hfd-alert hfd-alert-error"><i className="bi bi-exclamation-triangle" />{error}</div>}

      {!selectedId && (
        <div className="hfd-empty">
          <i className="bi bi-bar-chart" />
          <p>Select a campaign above to view monitoring data.</p>
        </div>
      )}

      {loading && <div className="hfd-spinner"><i className="bi bi-arrow-repeat" /> Loading…</div>}

      {dashboard && !loading && (
        <>
          {/* Completion ring + stats */}
          <div className="hfd-completion-ring">
            <div className="hfd-ring-wrap">
              <svg width="100" height="100" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r={radius} fill="none" stroke="#e5e7eb" strokeWidth="10" />
                <circle
                  cx="50" cy="50" r={radius} fill="none"
                  stroke={completion >= 80 ? '#22c55e' : completion >= 40 ? '#f59e0b' : '#6366f1'}
                  strokeWidth="10"
                  strokeDasharray={circ}
                  strokeDashoffset={offset}
                  strokeLinecap="round"
                  style={{ transition: 'stroke-dashoffset 0.6s ease' }}
                />
                <text
                  x="50" y="54"
                  textAnchor="middle"
                  fontSize="14"
                  fontWeight="700"
                  fill="#1f2937"
                  style={{ transform: 'rotate(90deg)', transformOrigin: '50px 50px' }}
                >
                  {completion.toFixed(0)}%
                </text>
              </svg>
            </div>
            <div className="hfd-completion-stats">
              {[
                ['Campaign', dashboard.campaignName],
                ['Total Requests (Targets)', String(dashboard.totalRequests)],
                ['Total Assignments', String(dashboard.totalAssignments)],
                ['Submitted', String(dashboard.submittedAssignments)],
                ['Pending Users', String(dashboard.pendingUsers)],
                ['Completion', `${completion.toFixed(1)}%`],
              ].map(([k, v]) => (
                <div className="row" key={k}>
                  <span className="k">{k}</span>
                  <span className="v">{v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Per-target breakdown table */}
          <h4 style={{ margin: '0 0 10px', fontSize: '0.9rem', fontWeight: 700, color: '#374151' }}>
            Per-Target Completion
          </h4>
          {dashboard.requests.length === 0 ? (
            <div className="hfd-empty" style={{ padding: 24 }}>
              <p>No assignment data yet. Generate assignments in Tab 4 first.</p>
            </div>
          ) : (
            <div className="hfd-table-wrap">
              <table className="hfd-preview-table">
                <thead>
                  <tr>
                    <th>Target Emp ID</th>
                    <th>Total Evaluators</th>
                    <th>Submitted</th>
                    <th>Pending</th>
                    <th>Completion</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboard.requests.map(r => (
                    <tr key={r.requestId}>
                      <td>#{r.targetEmployeeId}</td>
                      <td>{r.totalEvaluators}</td>
                      <td style={{ color: '#16a34a', fontWeight: 600 }}>{r.submittedEvaluators}</td>
                      <td style={{ color: r.pendingEvaluators > 0 ? '#f59e0b' : '#9ca3af' }}>{r.pendingEvaluators}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ flex: 1, height: 6, background: '#e5e7eb', borderRadius: 999 }}>
                            <div style={{ width: `${r.completionPercent}%`, height: '100%', background: '#6366f1', borderRadius: 999 }} />
                          </div>
                          <span style={{ fontSize: '0.78rem', color: '#6b7280', width: 36, textAlign: 'right' }}>
                            {r.completionPercent.toFixed(0)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
