import { useEffect, useMemo, useState } from 'react';
import {
  useFeedbackAnalyticsCampaigns,
  useFeedbackCampaignSummary,
} from '../../hooks/useFeedbackAnalytics';
import './feedback-analytics.css';

const formatScore = (value: number) => value.toFixed(2);

const formatDate = (value: string) =>
  new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
  }).format(new Date(value));

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));

const HrAnalyticsPage = () => {
  const campaignsQuery = useFeedbackAnalyticsCampaigns();
  const closedCampaigns = useMemo(
    () => (campaignsQuery.data ?? []).filter((campaign) => campaign.status === 'CLOSED'),
    [campaignsQuery.data],
  );
  const [campaignId, setCampaignId] = useState<number | null>(null);

  useEffect(() => {
    if (!closedCampaigns.length) {
      setCampaignId(null);
      return;
    }

    setCampaignId((current) => {
      if (current != null && closedCampaigns.some((campaign) => campaign.id === current)) {
        return current;
      }
      return closedCampaigns[0].id;
    });
  }, [closedCampaigns]);

  const summaryQuery = useFeedbackCampaignSummary(campaignId);
  const summary = summaryQuery.data;

  return (
    <div className="feedback-results-stack">
      <section className="feedback-results-hero">
        <h1>HR feedback analytics</h1>
        <p>Closed-campaign analytics only. Evaluator identities stay hidden and every result is exposed as aggregate data.</p>
      </section>

      <section className="feedback-results-card">
        <div className="feedback-results-card-header">
          <div>
            <p className="feedback-results-kicker">Campaign summary</p>
            <h2>Select a closed campaign</h2>
          </div>
        </div>

        {campaignsQuery.isLoading ? (
          <div className="feedback-results-empty">Loading campaign references...</div>
        ) : campaignsQuery.error instanceof Error ? (
          <div className="feedback-results-banner error">{campaignsQuery.error.message}</div>
        ) : closedCampaigns.length === 0 ? (
          <div className="feedback-results-empty">No closed feedback campaigns are available yet.</div>
        ) : (
          <label className="feedback-results-field">
            <span>Campaign</span>
            <select
              value={campaignId ?? ''}
              onChange={(event) => setCampaignId(event.target.value ? Number(event.target.value) : null)}
            >
              {closedCampaigns.map((campaign) => (
                <option key={campaign.id} value={campaign.id}>
                  {campaign.name} ({formatDate(campaign.startDate)} - {formatDate(campaign.endDate)})
                </option>
              ))}
            </select>
          </label>
        )}
      </section>

      {campaignId != null ? (
        summaryQuery.isLoading ? (
          <div className="feedback-results-empty">Loading campaign analytics...</div>
        ) : summaryQuery.error instanceof Error ? (
          <div className="feedback-results-banner error">{summaryQuery.error.message}</div>
        ) : summary ? (
          <section className="feedback-results-card">
            <div className="feedback-results-summary-grid">
              <div className="feedback-results-metric">
                <span>Campaign</span>
                <strong>{summary.campaignName}</strong>
              </div>
              <div className="feedback-results-metric">
                <span>Overall average</span>
                <strong>{formatScore(summary.overallAverageScore)}</strong>
              </div>
              <div className="feedback-results-metric">
                <span>Total employees</span>
                <strong>{summary.totalEmployees}</strong>
              </div>
              <div className="feedback-results-metric">
                <span>Total responses</span>
                <strong>{summary.totalResponses}</strong>
              </div>
              <div className="feedback-results-metric">
                <span>Status</span>
                <strong>{summary.status}</strong>
              </div>
              <div className="feedback-results-metric">
                <span>Summarized</span>
                <strong>{formatDateTime(summary.summarizedAt)}</strong>
              </div>
            </div>

            <div className="feedback-results-table-wrap" style={{ marginTop: 20 }}>
              <table className="feedback-results-table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Average score</th>
                    <th>Total responses</th>
                    <th>Manager</th>
                    <th>Peer</th>
                    <th>Subordinate</th>
                    <th>Summarized</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.items.map((item) => (
                    <tr key={`${item.campaignId}-${item.targetEmployeeId}`}>
                      <td>
                        <div className="feedback-results-table-title">
                          <strong>{item.targetEmployeeName}</strong>
                          <span>Employee #{item.targetEmployeeId}</span>
                        </div>
                      </td>
                      <td>{formatScore(item.averageScore)}</td>
                      <td>{item.totalResponses}</td>
                      <td>{item.managerResponses}</td>
                      <td>{item.peerResponses}</td>
                      <td>{item.subordinateResponses}</td>
                      <td>{formatDateTime(item.summarizedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null
      ) : null}
    </div>
  );
};

export default HrAnalyticsPage;
