import { Fragment, useEffect, useMemo, useState } from 'react';
import { hrFeedbackApi } from '../../../api/hrFeedbackApi';
import { feedbackAnalyticsApi } from '../../../api/feedbackAnalyticsApi';
import type { FeedbackCampaign } from '../../../types/feedbackCampaign';
import type { FeedbackCompletionDashboard, FeedbackCompletionItem } from '../../../types/feedback';
import type { FeedbackCampaignSummary } from '../../../types/feedbackAnalytics';

interface Props {
  activeCampaign: FeedbackCampaign | null;
}

type ProgressFilter = 'ALL' | 'PENDING' | 'OVERDUE' | 'COMPLETE' | 'NO_ASSIGNMENTS';
type SummaryVisibilityStatus = 'HIDDEN' | 'READY_TO_PUBLISH' | 'PUBLISHED' | string;
type MonitorSort = 'ACTION' | 'COMPLETION_ASC' | 'COMPLETION_DESC' | 'SCORE_DESC' | 'DEADLINE_ASC';
type MonitorColumn = 'target' | 'mix' | 'progress' | 'status' | 'score' | 'deadline' | 'action';

const COLUMN_OPTIONS: Array<{ key: MonitorColumn; label: string }> = [
  { key: 'target', label: 'Target' },
  { key: 'mix', label: 'Evaluator mix' },
  { key: 'progress', label: 'Progress' },
  { key: 'status', label: 'Status' },
  { key: 'score', label: 'Score' },
  { key: 'deadline', label: 'Deadline' },
  { key: 'action', label: 'Action needed' },
];

const DEFAULT_COLUMNS: MonitorColumn[] = ['target', 'mix', 'progress', 'status', 'score', 'deadline', 'action'];

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

const visibilityLabel = (status?: SummaryVisibilityStatus | null) => {
  if (status === 'PUBLISHED') return 'Published';
  if (status === 'READY_TO_PUBLISH') return 'Ready to publish';
  return 'Hidden';
};

const deadlineTime = (row: FeedbackCompletionItem) => {
  const raw = row.effectiveDeadline ?? row.dueAt;
  if (!raw) return Number.POSITIVE_INFINITY;
  const time = new Date(raw).getTime();
  return Number.isNaN(time) ? Number.POSITIVE_INFINITY : time;
};

const rowSearchText = (row: FeedbackCompletionItem) => [
  row.targetEmployeeName,
  row.targetEmployeeEmail,
  row.targetEmployeeId,
  row.statusLabel,
  row.scoreCategory,
  row.actionNeeded,
].filter(Boolean).join(' ').toLowerCase();

const escapeCsv = (value: string | number | null | undefined) => {
  const text = String(value ?? '');
  return `"${text.replace(/"/g, '""')}"`;
};

export default function CampaignMonitoringTab({ activeCampaign }: Props) {
  const [campaigns, setCampaigns] = useState<FeedbackCampaign[]>([]);
  const [selectedId, setSelectedId] = useState<number | ''>(activeCampaign?.id ?? '');
  const [dashboard, setDashboard] = useState<FeedbackCompletionDashboard | null>(null);
  const [summary, setSummary] = useState<FeedbackCampaignSummary | null>(null);
  const [filter, setFilter] = useState<ProgressFilter>('ALL');
  const [sortBy, setSortBy] = useState<MonitorSort>('ACTION');
  const [searchTerm, setSearchTerm] = useState('');
  const [visibleColumns, setVisibleColumns] = useState<MonitorColumn[]>(DEFAULT_COLUMNS);
  const [expandedRequestId, setExpandedRequestId] = useState<number | null>(null);
  const [showPublishPreview, setShowPublishPreview] = useState(false);
  const [loading, setLoading] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [earlyCloseRequests, setEarlyCloseRequests] = useState<FeedbackCampaign[]>([]);
  const [earlyCloseLoading, setEarlyCloseLoading] = useState(false);

  const refreshEarlyCloseRequests = () => {
    setEarlyCloseLoading(true);
    hrFeedbackApi.getPendingEarlyCloseRequests()
        .then(setEarlyCloseRequests)
        .catch(() => setEarlyCloseRequests([]))
        .finally(() => setEarlyCloseLoading(false));
  };

  const refreshCampaigns = () => {
    hrFeedbackApi.getAllCampaigns()
        .then(setCampaigns)
        .catch(e => setError(e.message));
    refreshEarlyCloseRequests();
  };

  useEffect(() => {
    refreshCampaigns();
  }, []);

  useEffect(() => {
    if (activeCampaign?.id) setSelectedId(activeCampaign.id);
  }, [activeCampaign?.id]);

  const selectedCampaign = campaigns.find(c => c.id === selectedId);
  const status = selectedCampaign?.status ?? dashboard?.campaignStatus;

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
    setSearchTerm('');
    setExpandedRequestId(null);
    setShowPublishPreview(false);
  }, [selectedId]);

  const refreshPublishSummary = () => {
    if (!selectedId || status !== 'CLOSED') {
      setSummary(null);
      return;
    }
    setSummaryLoading(true);
    feedbackAnalyticsApi.getCampaignSummary(selectedId as number)
        .then(setSummary)
        .catch(e => setError(e.message))
        .finally(() => setSummaryLoading(false));
  };

  useEffect(() => {
    refreshPublishSummary();
  }, [selectedId, status]);

  const updateCampaignInList = (updated: FeedbackCampaign) => {
    setCampaigns(prev => prev.map(item => item.id === updated.id ? updated : item));
    setEarlyCloseRequests(prev => prev.filter(item => item.id !== updated.id));
  };

  const allEvaluatorsSubmitted = Boolean(
      dashboard
      && dashboard.totalAssignments > 0
      && dashboard.submittedAssignments >= dashboard.totalAssignments
  );

  const isBeforeCampaignDeadline = Boolean(
      selectedCampaign?.endAt && new Date(selectedCampaign.endAt).getTime() > Date.now()
  );

  const requestEarlyClose = async () => {
    if (!selectedId || !selectedCampaign) return;
    const reason = window.prompt(
        'All evaluators have submitted. Enter a reason to request Admin approval for early campaign close.',
        'All evaluators submitted earlier than the scheduled deadline. Requesting early close to proceed with summary review.',
    );
    if (!reason || !reason.trim()) return;
    setActionLoading(true);
    setError('');
    setNotice('');
    try {
      const updated = await hrFeedbackApi.requestEarlyClose(selectedId as number, reason.trim());
      updateCampaignInList(updated);
      setNotice('Early close request sent to Admin for approval. The campaign remains active until approval.');
      refreshDashboard();
      refreshEarlyCloseRequests();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to request early close.');
    } finally {
      setActionLoading(false);
    }
  };

  const reviewEarlyClose = async (campaignId: number, decision: 'approve' | 'reject') => {
    const defaultNote = decision === 'approve'
        ? 'Approved. All evaluators have submitted final feedback.'
        : 'Rejected. Campaign should remain active until the scheduled deadline.';
    const reviewNote = window.prompt(
        decision === 'approve'
            ? 'Add an Admin approval note before closing this campaign.'
            : 'Add a rejection reason. The campaign will remain active.',
        defaultNote,
    );
    if (reviewNote === null) return;
    setActionLoading(true);
    setError('');
    setNotice('');
    try {
      const updated = decision === 'approve'
          ? await hrFeedbackApi.approveEarlyClose(campaignId, reviewNote.trim())
          : await hrFeedbackApi.rejectEarlyClose(campaignId, reviewNote.trim());
      updateCampaignInList(updated);
      setNotice(decision === 'approve'
          ? 'Early close approved. Campaign is now closed and ready for summary review.'
          : 'Early close request rejected. Campaign remains active.');
      refreshCampaigns();
      refreshDashboard();
    } catch (e) {
      setError(e instanceof Error ? e.message : `Failed to ${decision} early close request.`);
    } finally {
      setActionLoading(false);
    }
  };

  const runLifecycleAction = async (
      action: 'activate' | 'close' | 'cancel',
      successMessage: string,
  ) => {
    if (!selectedId) return;
    if (action === 'close' && selectedCampaign?.autoSubmitCompletedDraftsOnClose) {
      const completedDraftHint = dashboard?.inProgressAssignments
          ? `\n\nThere are ${dashboard.inProgressAssignments} draft / in-progress assignment(s). Only drafts with all required ratings answered will be auto-submitted; incomplete drafts will remain unsubmitted.`
          : '';
      const confirmed = window.confirm(
          `This campaign has auto-submit completed drafts enabled. Closing the campaign will automatically submit any completed drafts and lock them as final feedback.${completedDraftHint}\n\nContinue closing this campaign?`,
      );
      if (!confirmed) return;
    }
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
          `Reminder notifications sent for ${result.notifiedEvaluatorCount} pending assignment(s).${warningSuffix}`,
      );
      refreshDashboard();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to send reminders.');
    } finally {
      setActionLoading(false);
    }
  };

  const runPublishAction = async (action: 'publish' | 'unpublish') => {
    if (!selectedId) return;
    setActionLoading(true);
    setError('');
    setNotice('');
    try {
      const updatedSummary = action === 'publish'
          ? await feedbackAnalyticsApi.publishCampaignSummary(selectedId as number)
          : await feedbackAnalyticsApi.unpublishCampaignSummary(selectedId as number);
      setSummary(updatedSummary);
      setNotice(action === 'publish'
          ? 'Summary published. Target employees can now see their closed-campaign feedback results.'
          : 'Summary unpublished. Target employees can no longer see these feedback results.');
      refreshDashboard();
    } catch (e) {
      setError(e instanceof Error ? e.message : `Failed to ${action} summary.`);
    } finally {
      setActionLoading(false);
    }
  };

  const completion = dashboard?.completionPercent ?? 0;
  const radius = 40;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (completion / 100) * circ;

  const visibleColumnSet = useMemo(() => new Set(visibleColumns), [visibleColumns]);

  const filteredRequests = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    const rows = dashboard?.requests ?? [];

    return rows
        .filter(row => {
          if (filter === 'PENDING' && row.pendingEvaluators <= 0) return false;
          if (filter === 'OVERDUE' && sourceCount(row.overdueEvaluators) <= 0) return false;
          if (filter === 'COMPLETE' && !(row.totalEvaluators > 0 && row.pendingEvaluators === 0)) return false;
          if (filter === 'NO_ASSIGNMENTS' && row.totalEvaluators !== 0) return false;
          if (normalizedSearch && !rowSearchText(row).includes(normalizedSearch)) return false;
          return true;
        })
        .sort((a, b) => {
          if (sortBy === 'COMPLETION_ASC') return a.completionPercent - b.completionPercent;
          if (sortBy === 'COMPLETION_DESC') return b.completionPercent - a.completionPercent;
          if (sortBy === 'SCORE_DESC') return Number(b.averageScore ?? -1) - Number(a.averageScore ?? -1);
          if (sortBy === 'DEADLINE_ASC') return deadlineTime(a) - deadlineTime(b);
          const aPriority = sourceCount(a.overdueEvaluators) * 1000 + a.pendingEvaluators * 10 + (a.totalEvaluators === 0 ? 100 : 0);
          const bPriority = sourceCount(b.overdueEvaluators) * 1000 + b.pendingEvaluators * 10 + (b.totalEvaluators === 0 ? 100 : 0);
          return bPriority - aPriority;
        });
  }, [dashboard?.requests, filter, searchTerm, sortBy]);

  const monitorInsights = useMemo(() => {
    if (!dashboard) return [];
    const pending = dashboard.pendingAssignments ?? dashboard.pendingUsers ?? 0;
    const overdue = dashboard.overdueAssignments ?? 0;
    const noAssignments = dashboard.requests.filter(row => row.totalEvaluators === 0).length;
    const publishStatus = visibilityLabel(summary?.visibilityStatus);

    return [
      {
        label: 'HR next action',
        value: overdue > 0 ? 'Resolve overdue feedback' : pending > 0 ? 'Send pending reminders' : status === 'CLOSED' ? 'Review publish status' : 'Monitor submissions',
        note: overdue > 0 ? `${overdue} overdue assignment(s) need attention.` : pending > 0 ? `${pending} assignment(s) are still pending.` : 'No open evaluator blockers detected.',
        tone: overdue > 0 ? 'danger' : pending > 0 ? 'warning' : 'success',
      },
      {
        label: 'Close readiness',
        value: status === 'ACTIVE' && pending === 0 ? 'Ready to close' : status === 'CLOSED' ? 'Already closed' : 'Not ready',
        note: status === 'ACTIVE' && pending === 0 ? 'All assignments are submitted.' : 'Close when feedback collection is complete or the deadline passes.',
        tone: status === 'ACTIVE' && pending === 0 ? 'success' : 'neutral',
      },
      {
        label: 'Publish readiness',
        value: status === 'CLOSED' ? publishStatus : 'Closed campaign required',
        note: summary?.totalResponses ? `${summary.totalResponses} submitted response(s) available for summary review.` : 'No publishable responses yet.',
        tone: summary?.visibilityStatus === 'PUBLISHED' ? 'success' : summary?.visibilityStatus === 'READY_TO_PUBLISH' ? 'warning' : 'neutral',
      },
      {
        label: 'Setup quality',
        value: noAssignments > 0 ? `${noAssignments} target(s) need assignments` : 'Evaluator mix assigned',
        note: noAssignments > 0 ? 'Open the assignment step and regenerate or add manual evaluators.' : 'Every target has at least one evaluator.',
        tone: noAssignments > 0 ? 'danger' : 'success',
      },
    ];
  }, [dashboard, status, summary]);

  const toggleColumn = (key: MonitorColumn) => {
    setVisibleColumns(current => {
      if (current.includes(key)) {
        return current.length === 1 ? current : current.filter(item => item !== key);
      }
      return COLUMN_OPTIONS.filter(option => current.includes(option.key) || option.key === key).map(option => option.key);
    });
  };

  const exportFilteredCsv = () => {
    if (!filteredRequests.length) return;
    const header = ['Target Employee', 'Employee ID', 'Submitted', 'Total Evaluators', 'Pending', 'Overdue', 'Completion %', 'Average Score', 'Score Category', 'Deadline', 'Action Needed'];
    const body = filteredRequests.map(row => [
      row.targetEmployeeName ?? '',
      row.targetEmployeeId,
      row.submittedEvaluators,
      row.totalEvaluators,
      row.pendingEvaluators,
      row.overdueEvaluators ?? 0,
      row.completionPercent,
      row.averageScore ?? '',
      row.scoreCategory ?? '',
      formatDateTime(row.effectiveDeadline ?? row.dueAt),
      row.actionNeeded ?? '',
    ]);
    const csv = [header, ...body].map(line => line.map(escapeCsv).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `feedback-campaign-${selectedId}-progress.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

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

  const renderExpandedDetails = (row: FeedbackCompletionItem) => (
      <div className="hfd-target-detail-panel">
        <div className="hfd-target-detail-main">
          <h5>{row.targetEmployeeName ?? `Employee #${row.targetEmployeeId}`}</h5>
          <p>{row.actionNeeded ?? 'No special action required.'}</p>
          <div className="hfd-target-detail-grid">
            <span><strong>{row.submittedEvaluators}</strong> submitted</span>
            <span><strong>{row.pendingEvaluators}</strong> pending</span>
            <span><strong>{row.inProgressEvaluators ?? 0}</strong> draft / in progress</span>
            <span><strong>{row.notStartedEvaluators ?? 0}</strong> not started</span>
            <span><strong>{row.overdueEvaluators ?? 0}</strong> overdue</span>
            <span><strong>{row.cancelledEvaluators ?? 0}</strong> cancelled</span>
          </div>
        </div>
        <div className="hfd-target-detail-side">
          <strong>Evaluator mix</strong>
          {renderSourceChips(row)}
          <small>Use this drill-down to decide whether to remind evaluators, regenerate assignments, or publish after closure.</small>
        </div>
      </div>
  );

  return (
      <div>
        <div className="hfd-card-header">
          <div className="hfd-card-title">
            <i className="bi bi-graph-up-arrow" />
            <div>
              <h2>Campaign Monitoring</h2>
              <p>Track target-level completion, pending evaluators, overdue feedback, publish readiness, and campaign health.</p>
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
          {selectedCampaign?.autoSubmitCompletedDraftsOnClose && (
              <span className="hfd-auto-submit-pill">Auto-submit completed drafts on close</span>
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
                    {isBeforeCampaignDeadline ? (
                        <button
                            className="hfd-btn hfd-btn-primary"
                            disabled={actionLoading || !allEvaluatorsSubmitted || selectedCampaign.earlyCloseRequestStatus === 'REQUESTED'}
                            onClick={requestEarlyClose}
                            title={allEvaluatorsSubmitted
                                ? 'Request Admin approval to close this campaign before deadline.'
                                : 'Early close is available only after all evaluators submit final feedback.'}
                        >
                          <i className="bi bi-shield-check" /> {selectedCampaign.earlyCloseRequestStatus === 'REQUESTED' ? 'Waiting for Admin' : 'Request Early Close'}
                        </button>
                    ) : (
                        <button
                            className="hfd-btn hfd-btn-primary"
                            disabled={actionLoading}
                            onClick={() => runLifecycleAction('close', selectedCampaign?.autoSubmitCompletedDraftsOnClose
                                ? 'Campaign closed after the scheduled deadline. Completed drafts with all required ratings were auto-submitted; results are ready for analytics review.'
                                : 'Campaign closed after the scheduled deadline. Results are now available for analytics review before HR publishes.')}
                        >
                          <i className="bi bi-check2-circle" /> Close Campaign
                        </button>
                    )}
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

              {status === 'CLOSED' && <span className="hfd-muted">Closed campaigns are read-only. Target results stay hidden until HR publishes the summary.</span>}
              {status === 'CANCELLED' && <span className="hfd-muted">Cancelled campaigns cannot receive feedback.</span>}
            </div>
        )}

        {selectedCampaign && status === 'ACTIVE' && isBeforeCampaignDeadline && (
            <div className={`hfd-early-close-guidance ${allEvaluatorsSubmitted ? 'ready' : 'blocked'}`}>
              <div>
                <strong>{allEvaluatorsSubmitted ? 'Eligible for early close request' : 'Early close unavailable'}</strong>
                <p>
                  {allEvaluatorsSubmitted
                      ? 'All evaluators submitted final feedback. HR can request Admin approval to close before the scheduled deadline.'
                      : `${dashboard?.pendingAssignments ?? dashboard?.pendingUsers ?? 0} evaluator assignment(s) are still pending. Send reminders or wait until the deadline.`}
                </p>
                {selectedCampaign.earlyCloseRequestStatus === 'REQUESTED' ? (
                    <small>Request pending Admin approval. Reason: {selectedCampaign.earlyCloseRequestReason ?? 'No reason provided.'}</small>
                ) : selectedCampaign.earlyCloseRequestStatus === 'REJECTED' ? (
                    <small>Previous request rejected: {selectedCampaign.earlyCloseReviewReason ?? 'No rejection reason provided.'}</small>
                ) : null}
              </div>
              <span>{dashboard?.submittedAssignments ?? 0} / {dashboard?.totalAssignments ?? 0} submitted</span>
            </div>
        )}

        {earlyCloseRequests.length > 0 && (
            <section className="hfd-early-close-review-panel">
              <div className="hfd-card-title compact">
                <i className="bi bi-shield-lock" />
                <div>
                  <h3>Pending Early Close Requests</h3>
                  <p>Admin should review campaign details before approving an early close.</p>
                </div>
              </div>
              {earlyCloseLoading ? <span className="hfd-muted">Loading requests...</span> : null}
              <div className="hfd-early-close-request-grid">
                {earlyCloseRequests.map(request => (
                    <article className="hfd-early-close-request-card" key={request.id}>
                      <div>
                        <span className="hfd-publish-status ready-to-publish">Approval needed</span>
                        <h4>{request.name}</h4>
                        <p>{request.description || 'No campaign description provided.'}</p>
                      </div>
                      <dl>
                        <div><dt>Deadline</dt><dd>{formatDateTime(request.endAt)}</dd></div>
                        <div><dt>Requested</dt><dd>{formatDateTime(request.earlyCloseRequestedAt)}</dd></div>
                        <div><dt>Targets</dt><dd>{request.targetCount}</dd></div>
                        <div><dt>Assignments</dt><dd>{request.assignmentCount}</dd></div>
                        <div><dt>Reason</dt><dd>{request.earlyCloseRequestReason || 'No reason provided.'}</dd></div>
                      </dl>
                      <div className="hfd-early-close-review-actions">
                        <button
                            type="button"
                            className="hfd-btn hfd-btn-primary"
                            disabled={actionLoading}
                            onClick={() => reviewEarlyClose(request.id, 'approve')}
                        >
                          <i className="bi bi-check2-circle" /> Approve and close
                        </button>
                        <button
                            type="button"
                            className="hfd-btn hfd-btn-secondary"
                            disabled={actionLoading}
                            onClick={() => reviewEarlyClose(request.id, 'reject')}
                        >
                          <i className="bi bi-x-circle" /> Reject
                        </button>
                      </div>
                    </article>
                ))}
              </div>
            </section>
        )}

        {selectedCampaign && status === 'CLOSED' && (
            <div className="hfd-summary-publish-panel hfd-summary-publish-panel-rich">
              <div>
            <span className={`hfd-publish-status ${String(summary?.visibilityStatus ?? 'HIDDEN').toLowerCase().replace(/_/g, '-')}`}>
              {summaryLoading ? 'Loading publish status…' : visibilityLabel(summary?.visibilityStatus)}
            </span>
                <h3>Summary visibility</h3>
                <p>
                  Employee results are visible only when this campaign is closed and the summary is published.
                  HR/Admin analytics remain available here before publishing.
                </p>
                {summary?.publishedAt ? (
                    <small>Published {formatDateTime(summary.publishedAt)}{summary.publishedByUserId ? ` by user #${summary.publishedByUserId}` : ''}</small>
                ) : (
                    <small>{summary?.totalResponses ? `${summary.totalResponses} submitted response(s) are ready for review.` : 'No submitted feedback is available to publish yet.'}</small>
                )}
                {showPublishPreview && (
                    <div className="hfd-publish-preview-box">
                      <strong>Employee-facing preview</strong>
                      <p>Employees will see only published closed-campaign results. Anonymous peer/subordinate identities remain protected, while visible evaluator types keep their normal labels.</p>
                      <div>
                        <span>{summary?.totalEmployees ?? 0} employee summary item(s)</span>
                        <span>{summary?.totalResponses ?? 0} submitted response(s)</span>
                        <span>{fmt(summary?.overallAverageScore, 1)}% overall average</span>
                      </div>
                    </div>
                )}
              </div>
              <div className="hfd-summary-publish-actions">
                <button
                    type="button"
                    className="hfd-btn hfd-btn-secondary"
                    disabled={summaryLoading || !summary}
                    onClick={() => setShowPublishPreview(current => !current)}
                >
                  <i className="bi bi-layout-text-window" /> {showPublishPreview ? 'Hide Preview' : 'Preview Employee View'}
                </button>
                <button
                    type="button"
                    className="hfd-btn hfd-btn-primary"
                    disabled={actionLoading || summaryLoading || !summary || summary.visibilityStatus === 'PUBLISHED' || (summary.totalResponses ?? 0) === 0}
                    onClick={() => runPublishAction('publish')}
                >
                  <i className="bi bi-eye" /> Publish Summary
                </button>
                {summary?.visibilityStatus === 'PUBLISHED' && (
                    <button
                        type="button"
                        className="hfd-btn hfd-btn-secondary"
                        disabled={actionLoading || summaryLoading}
                        onClick={() => runPublishAction('unpublish')}
                    >
                      <i className="bi bi-eye-slash" /> Unpublish
                    </button>
                )}
              </div>
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

              <div className="hfd-step11-insight-grid">
                {monitorInsights.map(insight => (
                    <article className={`hfd-step11-insight ${insight.tone}`} key={insight.label}>
                      <span>{insight.label}</span>
                      <strong>{insight.value}</strong>
                      <small>{insight.note}</small>
                    </article>
                ))}
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

              <div className="hfd-monitor-toolbar hfd-monitor-toolbar-rich">
                <div>
                  <h4>Target-level Progress</h4>
                  <span>{filteredRequests.length} of {dashboard.requests.length} target(s) shown</span>
                </div>
                <div className="hfd-monitor-controls">
                  <input
                      type="search"
                      className="hfd-search-input"
                      placeholder="Search employee, status, action…"
                      value={searchTerm}
                      onChange={event => setSearchTerm(event.target.value)}
                  />
                  <select className="hfd-select compact" value={sortBy} onChange={event => setSortBy(event.target.value as MonitorSort)}>
                    <option value="ACTION">Sort by action needed</option>
                    <option value="COMPLETION_ASC">Lowest completion first</option>
                    <option value="COMPLETION_DESC">Highest completion first</option>
                    <option value="SCORE_DESC">Highest score first</option>
                    <option value="DEADLINE_ASC">Earliest deadline first</option>
                  </select>
                  <button type="button" className="hfd-btn hfd-btn-secondary" disabled={!filteredRequests.length} onClick={exportFilteredCsv}>
                    <i className="bi bi-download" /> Export CSV
                  </button>
                </div>
              </div>

              <div className="hfd-monitor-view-panel">
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
                <div className="hfd-column-picker" aria-label="Choose visible progress table columns">
                  {COLUMN_OPTIONS.map(option => (
                      <label key={option.key}>
                        <input
                            type="checkbox"
                            checked={visibleColumnSet.has(option.key)}
                            onChange={() => toggleColumn(option.key)}
                        />
                        {option.label}
                      </label>
                  ))}
                </div>
              </div>

              {dashboard.requests.length === 0 ? (
                  <div className="hfd-empty" style={{ padding: 24 }}>
                    <p>No target data yet. Save targets in the Target step first.</p>
                  </div>
              ) : filteredRequests.length === 0 ? (
                  <div className="hfd-empty" style={{ padding: 24 }}>
                    <p>No targets match this filter or search.</p>
                  </div>
              ) : (
                  <div className="hfd-table-wrap">
                    <table className="hfd-preview-table hfd-monitor-table">
                      <thead>
                      <tr>
                        {visibleColumnSet.has('target') && <th>Target Employee</th>}
                        {visibleColumnSet.has('mix') && <th>Evaluator Mix</th>}
                        {visibleColumnSet.has('progress') && <th>Progress</th>}
                        {visibleColumnSet.has('status') && <th>Status</th>}
                        {visibleColumnSet.has('score') && <th>Score</th>}
                        {visibleColumnSet.has('deadline') && <th>Deadline</th>}
                        {visibleColumnSet.has('action') && <th>Action Needed</th>}
                      </tr>
                      </thead>
                      <tbody>
                      {filteredRequests.map(r => (
                          <Fragment key={r.requestId}>
                            <tr>
                              {visibleColumnSet.has('target') && (
                                  <td>
                                    <button
                                        type="button"
                                        className="hfd-person-cell hfd-person-cell-button"
                                        onClick={() => setExpandedRequestId(current => current === r.requestId ? null : r.requestId)}
                                    >
                                      <span className="hfd-avatar-mini">{(r.targetEmployeeName ?? `#${r.targetEmployeeId}`).slice(0, 1).toUpperCase()}</span>
                                      <span>
                              <strong>{r.targetEmployeeName ?? `Employee #${r.targetEmployeeId}`}</strong>
                              <small>Employee #{r.targetEmployeeId}</small>
                            </span>
                                    </button>
                                  </td>
                              )}
                              {visibleColumnSet.has('mix') && <td>{renderSourceChips(r)}</td>}
                              {visibleColumnSet.has('progress') && (
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
                              )}
                              {visibleColumnSet.has('status') && <td><span className={statusClass(r.statusLabel)}>{r.statusLabel ?? 'Pending'}</span></td>}
                              {visibleColumnSet.has('score') && (
                                  <td>
                                    {r.averageScore && r.averageScore > 0 ? (
                                        <div className="hfd-score-cell">
                                          <strong>{fmt(r.averageScore, 1)}%</strong>
                                          <small>{r.scoreCategory}</small>
                                        </div>
                                    ) : <span className="hfd-muted">No score yet</span>}
                                  </td>
                              )}
                              {visibleColumnSet.has('deadline') && <td>{formatDateTime(r.effectiveDeadline ?? r.dueAt)}</td>}
                              {visibleColumnSet.has('action') && <td className="hfd-action-needed">{r.actionNeeded}</td>}
                            </tr>
                            {expandedRequestId === r.requestId && (
                                <tr className="hfd-target-detail-row">
                                  <td colSpan={visibleColumns.length}>{renderExpandedDetails(r)}</td>
                                </tr>
                            )}
                          </Fragment>
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
