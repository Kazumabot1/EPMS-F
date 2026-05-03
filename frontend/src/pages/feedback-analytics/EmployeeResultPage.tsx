import { useMyFeedbackResult } from '../../hooks/useFeedbackAnalytics';
import './feedback-analytics.css';

const formatScore = (value: number) => `${value.toFixed(1)}%`;

const formatDateTime = (value: string) =>
    new Intl.DateTimeFormat('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(new Date(value));

const EmployeeResultPage = () => {
    const resultQuery = useMyFeedbackResult();
    const result = resultQuery.data;

    return (
        <div className="feedback-results-stack">
            <section className="feedback-results-hero">
                <h1>My feedback results</h1>
                <p>Closed-campaign results only. All evaluator identities are removed and only aggregate values are shown.</p>
            </section>

            {resultQuery.isLoading ? (
                <div className="feedback-results-empty">Loading your feedback results...</div>
            ) : resultQuery.error instanceof Error ? (
                <div className="feedback-results-banner error">{resultQuery.error.message}</div>
            ) : !result || result.results.length === 0 ? (
                <div className="feedback-results-empty">No closed-campaign feedback results are available yet.</div>
            ) : (
                <section className="feedback-results-card">
                    <div className="feedback-results-card-header">
                        <div>
                            <p className="feedback-results-kicker">Employee result</p>
                            <h2>{result.employeeName}</h2>
                        </div>
                    </div>

                    <div className="feedback-results-table-wrap">
                        <table className="feedback-results-table">
                            <thead>
                            <tr>
                                <th>Campaign</th>
                                <th>Average score</th>
                                <th>Total responses</th>
                                <th>Manager</th>
                                <th>Peer</th>
                                <th>Subordinate</th>
                                <th>Summarized</th>
                            </tr>
                            </thead>
                            <tbody>
                            {result.results.map((item) => (
                                <tr key={`${item.campaignId}-${item.targetEmployeeId}`}>
                                    <td>
                                        <div className="feedback-results-table-title">
                                            <strong>{item.campaignName}</strong>
                                            <span>Campaign #{item.campaignId}</span>
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
            )}
        </div>
    );
};

export default EmployeeResultPage;
