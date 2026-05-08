import { useFeedbackTeamSummary } from '../../hooks/useFeedbackAnalytics';
import './feedback-analytics.css';

const formatScore = (value?: number | null) => (value == null ? '—' : `${value.toFixed(1)}%`);

const ManagerSummaryPage = () => {
    const summaryQuery = useFeedbackTeamSummary();
    const summary = summaryQuery.data;

    return (
        <div className="feedback-results-stack">
            <section className="feedback-results-hero">
                <h1>Team feedback summary</h1>
                <p>Direct-report results from published closed campaigns only, with anonymous aggregation by relationship group.</p>
            </section>

            {summaryQuery.isLoading ? (
                <div className="feedback-results-empty">Loading team summary...</div>
            ) : summaryQuery.error instanceof Error ? (
                <div className="feedback-results-banner error">{summaryQuery.error.message}</div>
            ) : !summary || summary.items.length === 0 ? (
                <div className="feedback-results-empty">No published closed-campaign feedback summaries are available for your direct reports.</div>
            ) : (
                <section className="feedback-results-card">
                    <div className="feedback-results-summary-grid">
                        <div className="feedback-results-metric">
                            <span>Direct reports</span>
                            <strong>{summary.totalDirectReports}</strong>
                        </div>
                        <div className="feedback-results-metric">
                            <span>Closed result rows</span>
                            <strong>{summary.totalClosedResults}</strong>
                        </div>
                        <div className="feedback-results-metric">
                            <span>Employees represented</span>
                            <strong>{new Set(summary.items.map((item) => item.targetEmployeeId)).size}</strong>
                        </div>
                    </div>

                    <div className="feedback-results-table-wrap" style={{ marginTop: 20 }}>
                        <table className="feedback-results-table">
                            <thead>
                            <tr>
                                <th>Employee</th>
                                <th>Campaign</th>
                                <th>Average score</th>
                                <th>Total responses</th>
                                <th>Manager</th>
                                <th>Peer</th>
                                <th>Subordinate</th>
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
                                    <td>{item.campaignName}</td>
                                    <td>{formatScore(item.averageScore)}</td>
                                    <td>{item.totalResponses}</td>
                                    <td>{item.managerResponses}</td>
                                    <td>{item.peerResponses}</td>
                                    <td>{item.subordinateResponses}</td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            )}
        </div>
    );
};

export default ManagerSummaryPage;
