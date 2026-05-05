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
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const refreshCampaigns = () => {
    hrFeedbackApi.getAllCampaigns()
        .then(setCampaigns)
        .catch(e => setError(e.message));
  };

  useEffect(() => {
    refreshCampaigns();
  }, []);

  useEffect(() => {
    if (activeCampaign?.id) setSelectedId(activeCampaign.id);
  }, [activeCampaign?.id]);

  const refreshDashboard = () => {
    if (!selectedId) { setDashboard(null); return; }
    setLoading(true);
    setError('');
    hrFeedbackApi.getCompletionDashboard(selectedId as number)
        .then(setDashboard)
        .catch(e => setError(e.message))
        .finally(() => setLoading(false));
  };

  useEffect(() => {
    refreshDashboard();
  }, [selectedId]);

  const updateCampaignInList = (updated: FeedbackCampaign) => {
    setCampaigns(prev => prev.map(item => item.id === updated.id ? updated : item));
  };

  const runLifecycleAction = async (
      action: 'activate' | 'close' | 'cancel',
      successMessage: string,
  ) => {
    if (!selectedId) return;
    setActionLoading(true);
    setError('');
    setNotice('');
    try {
      const updated = action === 'activate'
          ? await hrFeedbackApi.activateCampaign(selectedId as number)
          : action === 'close'
              ? await hrFeedbackApi.closeCampaign(selectedId as number)
              : await hrFeedbackApi.cancelCampaign(selectedId as number);
      updateCampaignInList(updated);
      setNotice(successMessage);
      refreshDashboard();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Campaign action failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const sendReminders = async () => {
    if (!selectedId) return;
    setActionLoading(true);
    setError('');
    setNotice('');
    try {
      const result = await hrFeedbackApi.sendPendingReminders(selectedId as number);
      const warningSuffix = result.skippedAssignmentCount > 0
          ? ` ${result.skippedAssignmentCount} assignment(s) were skipped because no active evaluator user account was found.`
          : '';
      setNotice(
          `Reminder notifications sent for ${result.notifiedEvaluatorCount} pending assignment(s).${warningSuffix}`
      );
      refreshDashboard();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to send reminders.');
    } finally {
      setActionLoading(false);
    }
  };

  const completion = dashboard?.completionPercent ?? 0;
  const radius = 40;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (completion / 100) * circ;

  const selectedCampaign = campaigns.find(c => c.id === selectedId);
  const status = selectedCampaign?.status;

  return (
      <div>
        <div className="hfd-card-header">
          <div className="hfd-card-title">
            <i className="bi bi-graph-up-arrow" />
            <div>
              <h2>Campaign Monitoring</h2>
              <p>Activate, close, cancel, and track submission progress</p>
            </div>
          </div>
        </div>

        <div className="hfd-campaign-select-bar">
          <label className="hfd-label" style={{ margin: 0, whiteSpace: 'nowrap' }}>Select Campaign:</label>
          <select
              id="monitoring-campaign-select"
              className="hfd-select"
              value={selectedId}
              onChange={e => {
                setSelectedId(e.target.value ? +e.target.value : '');
                setNotice('');
              }}
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

        {selectedCampaign && (
            <div className="hfd-campaign-select-bar" style={{ justifyContent: 'flex-start', gap: 10 }}>
              {status === 'DRAFT' && (
                  <button
                      className="hfd-btn hfd-btn-primary"
                      disabled={actionLoading}
                      onClick={() => runLifecycleAction('activate', 'Campaign activated. Evaluators can now submit feedback during the campaign window.')}
                  >
                    <i className="bi bi-play-fill" /> Activate Campaign
                  </button>
              )}

              {status === 'ACTIVE' && (
                  <>
                    <button
                        className="hfd-btn hfd-btn-primary"
                        disabled={actionLoading}
                        onClick={() => runLifecycleAction('close', 'Campaign closed. Results are now available for analytics.')}
                    >
                      <i className="bi bi-check2-circle" /> Close Campaign
                    </button>
                    <button
                        className="hfd-btn hfd-btn-secondary"
                        disabled={actionLoading || !dashboard || dashboard.pendingUsers === 0}
                        onClick={sendReminders}
                    >
                      <i className="bi bi-bell" /> Send Pending Reminders
                    </button>
                  </>
              )}

              {(status === 'DRAFT' || status === 'ACTIVE') && (
                  <button
                      className="hfd-btn hfd-btn-secondary"
                      disabled={actionLoading}
                      onClick={() => runLifecycleAction('cancel', 'Campaign cancelled. Open evaluator assignments are no longer available.')}
                  >
                    <i className="bi bi-x-circle" /> Cancel Campaign
                  </button>
              )}

              {status === 'CLOSED' && <span className="hfd-muted">Closed campaigns are read-only and visible in analytics.</span>}
              {status === 'CANCELLED' && <span className="hfd-muted">Cancelled campaigns cannot receive feedback.</span>}
            </div>
        )}

        {notice && <div className="hfd-alert hfd-alert-success"><i className="bi bi-check-circle" />{notice}</div>}
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

              <h4 style={{ margin: '0 0 10px', fontSize: '0.9rem', fontWeight: 700, color: '#374151' }}>
                Per-Target Completion
              </h4>
              {dashboard.requests.length === 0 ? (
                  <div className="hfd-empty" style={{ padding: 24 }}>
                    <p>No assignment data yet. Generate assignments in the Assignment Preview step first.</p>
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
