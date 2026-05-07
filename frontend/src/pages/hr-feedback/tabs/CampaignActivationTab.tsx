import { useEffect, useMemo, useState } from 'react';
import { hrFeedbackApi } from '../../../api/hrFeedbackApi';
import type { FeedbackCampaign } from '../../../types/feedbackCampaign';
import type { FeedbackCompletionDashboard, FeedbackCompletionItem } from '../../../types/feedback';

interface Props {
  activeCampaign: FeedbackCampaign | null;
}

type ProgressFilter = 'ALL' | 'PENDING' | 'OVERDUE' | 'COMPLETE' | 'NO_ASSIGNMENTS';

const fmt = (value: number | null | undefined, digits = 0) => Number(value ?? 0).toFixed(digits);
const sourceCount = (value: number | null | undefined) => Number(value ?? 0);

const formatDateTime = (value?: string | null) => {
  if (!value) return 'No deadline';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
};

const statusClass = (status?: string | null) =>
    `hfd-target-status ${String(status ?? 'pending').toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

export default function CampaignMonitoringTab({ activeCampaign }: Props) {
  const [campaigns, setCampaigns] = useState<FeedbackCampaign[]>([]);
  const [selectedId, setSelectedId] = useState<number | ''>(activeCampaign?.id ?? '');
  const [dashboard, setDashboard] = useState<FeedbackCompletionDashboard | null>(null);
  const [filter, setFilter] = useState<ProgressFilter>('ALL');
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
    setFilter('ALL');
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
  const status = selectedCampaign?.status ?? dashboard?.campaignStatus;

  const filteredRequests = useMemo(() => {
    const rows = dashboard?.requests ?? [];
    if (filter === 'ALL') return rows;
    return rows.filter(row => {
      if (filter === 'PENDING') return row.pendingEvaluators > 0;
      if (filter === 'OVERDUE') return sourceCount(row.overdueEvaluators) > 0;
      if (filter === 'COMPLETE') return row.totalEvaluators > 0 && row.pendingEvaluators === 0;
      if (filter === 'NO_ASSIGNMENTS') return row.totalEvaluators === 0;
      return true;
    });
  }, [dashboard?.requests, filter]);

  const renderSourceChips = (row: FeedbackCompletionItem) => {
    const chips = [
      ['Manager', row.managerEvaluators],
      ['Peer', row.peerEvaluators],
      ['Subordinate', row.subordinateEvaluators],
      ['Self', row.selfEvaluators],
      ['Project', row.projectStakeholderEvaluators],
    ].filter(([, value]) => sourceCount(value as number | undefined) > 0);

    if (!chips.length) return <span className="hfd-muted">No evaluators</span>;

    return (
        <div className="hfd-source-chip-row">
          {chips.map(([label, value]) => (
              <span className="hfd-source-chip" key={label as string}>{label}: {value}</span>
          ))}
        </div>
    );
  };

  return (
      <div>
        <div className="hfd-card-header">
          <div className="hfd-card-title">
            <i className="bi bi-graph-up-arrow" />
            <div>
              <h2>Campaign Monitoring</h2>
              <p>Track target-level completion, pending evaluators, overdue feedback, and campaign readiness.</p>
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
          {status && (
              <span className={`hfd-status-badge ${status}`}>
                {status}
              </span>
          )}
        </div>

        {selectedCampaign && (
            <div className="hfd-campaign-select-bar" style={{ justifyContent: 'flex-start', gap: 10, flexWrap: 'wrap' }}>
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
                        disabled={actionLoading || !dashboard || (dashboard.pendingAssignments ?? dashboard.pendingUsers ?? 0) === 0}
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

              <button
                  className="hfd-btn hfd-btn-secondary"
                  disabled={loading || !selectedId}
                  onClick={refreshDashboard}
              >
                <i className="bi bi-arrow-clockwise" /> Refresh Progress
              </button>

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
              <div className={`hfd-monitor-health ${String(dashboard.healthStatus ?? 'IN_PROGRESS').toLowerCase()}`}>
                <div>
                  <strong>{dashboard.healthStatus?.replace(/_/g, ' ') ?? 'IN PROGRESS'}</strong>
                  <p>{dashboard.healthMessage ?? 'Monitor campaign progress and pending evaluators.'}</p>
                </div>
                <span>Updated {formatDateTime(dashboard.generatedAt)}</span>
              </div>

              <div className="hfd-completion-overview">
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
                      ['Targets', String(dashboard.totalTargets ?? dashboard.totalRequests)],
                      ['Total Assignments', String(dashboard.totalAssignments)],
                      ['Submitted', String(dashboard.submittedAssignments)],
                      ['Pending', String(dashboard.pendingAssignments ?? dashboard.pendingUsers)],
                      ['Overdue', String(dashboard.overdueAssignments ?? 0)],
                      ['Completion', `${completion.toFixed(1)}%`],
                    ].map(([k, v]) => (
                        <div className="row" key={k}>
                          <span className="k">{k}</span>
                          <span className="v">{v}</span>
                        </div>
                    ))}
                  </div>
                </div>

                <div className="hfd-monitor-kpis">
                  <div className="hfd-monitor-kpi"><span>{dashboard.completedTargets ?? 0}</span><small>Completed targets</small></div>
                  <div className="hfd-monitor-kpi"><span>{dashboard.targetsWithPending ?? 0}</span><small>Targets with pending</small></div>
                  <div className="hfd-monitor-kpi warning"><span>{dashboard.targetsWithOverdue ?? 0}</span><small>Targets overdue</small></div>
                  <div className="hfd-monitor-kpi"><span>{dashboard.inProgressAssignments ?? 0}</span><small>Draft / in progress</small></div>
                </div>
              </div>

              <div className="hfd-source-summary">
                <span>Manager: {dashboard.managerAssignments ?? 0}</span>
                <span>Peer: {dashboard.peerAssignments ?? 0}</span>
                <span>Subordinate: {dashboard.subordinateAssignments ?? 0}</span>
                <span>Self: {dashboard.selfAssignments ?? 0}</span>
                <span>Project / Manual: {dashboard.projectStakeholderAssignments ?? 0}</span>
              </div>

              <div className="hfd-monitor-toolbar">
                <h4>Target-level Progress</h4>
                <div className="hfd-filter-pills">
                  {[
                    ['ALL', 'All'],
                    ['PENDING', 'Pending'],
                    ['OVERDUE', 'Overdue'],
                    ['COMPLETE', 'Complete'],
                    ['NO_ASSIGNMENTS', 'No assignments'],
                  ].map(([value, label]) => (
                      <button
                          key={value}
                          type="button"
                          className={filter === value ? 'active' : ''}
                          onClick={() => setFilter(value as ProgressFilter)}
                      >
                        {label}
                      </button>
                  ))}
                </div>
              </div>

              {dashboard.requests.length === 0 ? (
                  <div className="hfd-empty" style={{ padding: 24 }}>
                    <p>No target data yet. Save targets in the Target step first.</p>
                  </div>
              ) : filteredRequests.length === 0 ? (
                  <div className="hfd-empty" style={{ padding: 24 }}>
                    <p>No targets match this filter.</p>
                  </div>
              ) : (
                  <div className="hfd-table-wrap">
                    <table className="hfd-preview-table hfd-monitor-table">
                      <thead>
                      <tr>
                        <th>Target Employee</th>
                        <th>Evaluator Mix</th>
                        <th>Progress</th>
                        <th>Status</th>
                        <th>Score</th>
                        <th>Deadline</th>
                        <th>Action Needed</th>
                      </tr>
                      </thead>
                      <tbody>
                      {filteredRequests.map(r => (
                          <tr key={r.requestId}>
                            <td>
                              <div className="hfd-person-cell">
                                <span className="hfd-avatar-mini">{(r.targetEmployeeName ?? `#${r.targetEmployeeId}`).slice(0, 1).toUpperCase()}</span>
                                <div>
                                  <strong>{r.targetEmployeeName ?? `Employee #${r.targetEmployeeId}`}</strong>
                                  <small>Employee #{r.targetEmployeeId}</small>
                                </div>
                              </div>
                            </td>
                            <td>{renderSourceChips(r)}</td>
                            <td>
                              <div className="hfd-progress-cell">
                                <span>{r.submittedEvaluators}/{r.totalEvaluators} submitted</span>
                                <div className="hfd-progress-track">
                                  <div style={{ width: `${r.completionPercent}%` }} />
                                </div>
                                <small>
                                  {r.pendingEvaluators} pending
                                  {sourceCount(r.overdueEvaluators) > 0 ? ` · ${r.overdueEvaluators} overdue` : ''}
                                </small>
                              </div>
                            </td>
                            <td><span className={statusClass(r.statusLabel)}>{r.statusLabel ?? 'Pending'}</span></td>
                            <td>
                              {r.averageScore && r.averageScore > 0 ? (
                                  <div className="hfd-score-cell">
                                    <strong>{fmt(r.averageScore, 1)}%</strong>
                                    <small>{r.scoreCategory}</small>
                                  </div>
                              ) : <span className="hfd-muted">No score yet</span>}
                            </td>
                            <td>{formatDateTime(r.effectiveDeadline ?? r.dueAt)}</td>
                            <td className="hfd-action-needed">{r.actionNeeded}</td>
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
