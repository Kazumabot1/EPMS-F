import { useEffect, useState } from 'react';
import { hrFeedbackApi } from '../../../api/hrFeedbackApi';
import type { FeedbackCampaign } from '../../../types/feedbackCampaign';
import type { ConsolidatedFeedbackReport } from '../../../types/feedback';

const formatScore = (value?: number | null) => `${(value ?? 0).toFixed(1)}%`;
const getName = (item: { targetEmployeeName?: string; targetEmployeeId: number }) =>
    item.targetEmployeeName || `Employee #${item.targetEmployeeId}`;

export default function AnalyticsTab() {
  const [campaigns, setCampaigns] = useState<FeedbackCampaign[]>([]);
  const [selectedId, setSelectedId] = useState<number | ''>('');
  const [report, setReport] = useState<ConsolidatedFeedbackReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const closedCampaigns = campaigns.filter(c => c.status === 'CLOSED');

  useEffect(() => {
    hrFeedbackApi.getAllCampaigns()
        .then(setCampaigns)
        .catch(e => setError(e.message));
  }, []);

  useEffect(() => {
    if (!selectedId) { setReport(null); return; }
    setLoading(true);
    setError('');
    hrFeedbackApi.getConsolidatedReport(selectedId as number)
        .then(setReport)
        .catch(e => setError(e.message))
        .finally(() => setLoading(false));
  }, [selectedId]);

  return (
      <div>
        <div className="hfd-card-header">
          <div className="hfd-card-title">
            <i className="bi bi-bar-chart-line" />
            <div>
              <h2>HR Analytics</h2>
              <p>Aggregated 360 results — scores are normalized to 0–100% and visible only for CLOSED campaigns</p>
            </div>
          </div>
          <div className="hfd-alert hfd-alert-info" style={{ margin: 0, fontSize: '0.78rem', padding: '6px 12px' }}>
            <i className="bi bi-shield-lock" /> Aggregated only. Evaluator identities are hidden.
          </div>
        </div>

        {error && <div className="hfd-alert hfd-alert-error"><i className="bi bi-exclamation-triangle" />{error}</div>}

        <div className="hfd-campaign-select-bar">
          <label className="hfd-label" style={{ margin: 0, whiteSpace: 'nowrap' }}>Closed Campaign:</label>
          <select
              id="analytics-campaign-select"
              className="hfd-select"
              value={selectedId}
              onChange={e => setSelectedId(e.target.value ? +e.target.value : '')}
          >
            <option value="">— Select closed campaign —</option>
            {closedCampaigns.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {closedCampaigns.length === 0 && (
            <div className="hfd-locked-overlay">
              <i className="bi bi-lock" />
              <h3>No Closed Campaigns</h3>
              <p>Analytics are only visible when a campaign status is CLOSED.</p>
            </div>
        )}

        {!selectedId && closedCampaigns.length > 0 && (
            <div className="hfd-empty">
              <i className="bi bi-bar-chart" />
              <p>Select a closed campaign to view analytics.</p>
            </div>
        )}

        {loading && <div className="hfd-spinner"><i className="bi bi-arrow-repeat" /> Loading report…</div>}

        {report && !loading && (
            <>
              <div className="hfd-stat-row">
                <div className="hfd-stat-pill">
                  <div className="val">{formatScore(report.campaignAverageScore)}</div>
                  <div className="lbl">Campaign Avg Score</div>
                </div>
                <div className="hfd-stat-pill">
                  <div className="val">{report.campaignScoreCategory ?? '—'}</div>
                  <div className="lbl">Campaign Category</div>
                </div>
                <div className="hfd-stat-pill">
                  <div className="val">{report.totalResponses}</div>
                  <div className="lbl">Total Responses</div>
                </div>
                <div className="hfd-stat-pill">
                  <div className="val">{report.totalEmployees ?? report.items.length}</div>
                  <div className="lbl">Employees Evaluated</div>
                </div>
              </div>

              <div className="hfd-analytics-grid">
                <div className="hfd-analytics-card">
                  <h4><i className="bi bi-bar-chart" style={{ marginRight: 6 }} />Average Score by Employee</h4>
                  {report.items.length === 0 ? (
                      <p style={{ color: '#9ca3af', fontSize: '0.85rem' }}>No data.</p>
                  ) : report.items.slice(0, 12).map(item => (
                      <div key={item.targetEmployeeId} className="hfd-bar-row">
                        <span className="name">{getName(item)}</span>
                        <div className="hfd-bar-track">
                          <div
                              className="hfd-bar-fill"
                              style={{ width: `${Math.min(Math.max(item.averageScore, 0), 100)}%` }}
                          />
                        </div>
                        <span className="hfd-bar-val">{formatScore(item.averageScore)}</span>
                      </div>
                  ))}
                </div>

                <div className="hfd-analytics-card">
                  <h4><i className="bi bi-pie-chart" style={{ marginRight: 6 }} />Source Breakdown</h4>
                  <div className="hfd-table-wrap" style={{ maxHeight: 340, overflowY: 'auto' }}>
                    <table className="hfd-preview-table">
                      <thead>
                      <tr>
                        <th>Source</th>
                        <th>Responses</th>
                        <th>Avg Score</th>
                        <th>Category</th>
                      </tr>
                      </thead>
                      <tbody>
                      {(report.sourceBreakdown ?? []).map(source => (
                          <tr key={source.sourceType}>
                            <td>{source.sourceType}</td>
                            <td>{source.responseCount}</td>
                            <td><strong>{formatScore(source.averageScore)}</strong></td>
                            <td>{source.scoreCategory}</td>
                          </tr>
                      ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="hfd-analytics-card" style={{ marginTop: 16 }}>
                <h4><i className="bi bi-table" style={{ marginRight: 6 }} />Employee Breakdown</h4>
                <div className="hfd-table-wrap" style={{ maxHeight: 420, overflowY: 'auto' }}>
                  <table className="hfd-preview-table">
                    <thead>
                    <tr>
                      <th>Employee</th>
                      <th>Avg Score</th>
                      <th>Category</th>
                      <th>Manager</th>
                      <th>Peers</th>
                      <th>Subord.</th>
                      <th>Self</th>
                      <th>Total</th>
                    </tr>
                    </thead>
                    <tbody>
                    {report.items.map(item => (
                        <tr key={item.targetEmployeeId}>
                          <td>{getName(item)}</td>
                          <td><strong style={{ color: '#4f46e5' }}>{formatScore(item.averageScore)}</strong></td>
                          <td>{item.scoreCategory ?? '—'}</td>
                          <td>{item.managerResponses}</td>
                          <td>{item.peerResponses}</td>
                          <td>{item.subordinateResponses}</td>
                          <td>{item.selfResponses ?? 0}</td>
                          <td>{item.totalResponses}</td>
                        </tr>
                    ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {report.items.length > 0 && (() => {
                const sorted = [...report.items].sort((a, b) => b.averageScore - a.averageScore);
                return (
                    <div style={{ marginTop: 16, display: 'flex', gap: 12 }}>
                      <div className="hfd-analytics-card" style={{ flex: 1 }}>
                        <h4 style={{ color: '#16a34a' }}><i className="bi bi-trophy" style={{ marginRight: 6 }} />Top Performers</h4>
                        {sorted.slice(0, 3).map((item, i) => (
                            <div key={item.targetEmployeeId} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                              <span style={{ width: 22, height: 22, borderRadius: '50%', background: '#dcfce7', color: '#16a34a', display: 'grid', placeItems: 'center', fontSize: '0.72rem', fontWeight: 700 }}>{i + 1}</span>
                              <span style={{ flex: 1, fontSize: '0.85rem' }}>{getName(item)}</span>
                              <strong style={{ color: '#16a34a' }}>{formatScore(item.averageScore)}</strong>
                            </div>
                        ))}
                      </div>
                      <div className="hfd-analytics-card" style={{ flex: 1 }}>
                        <h4 style={{ color: '#f59e0b' }}><i className="bi bi-arrow-up-circle" style={{ marginRight: 6 }} />Needs Attention</h4>
                        {sorted.slice(-3).reverse().map((item, i) => (
                            <div key={item.targetEmployeeId} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                              <span style={{ width: 22, height: 22, borderRadius: '50%', background: '#fef3c7', color: '#d97706', display: 'grid', placeItems: 'center', fontSize: '0.72rem', fontWeight: 700 }}>{i + 1}</span>
                              <span style={{ flex: 1, fontSize: '0.85rem' }}>{getName(item)}</span>
                              <strong style={{ color: '#f59e0b' }}>{formatScore(item.averageScore)}</strong>
                            </div>
                        ))}
                      </div>
                    </div>
                );
              })()}
            </>
        )}
      </div>
  );
}
