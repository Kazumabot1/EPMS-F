import type {
  FeedbackAssignmentGenerationResponse,
  FeedbackCampaign,
  FeedbackTargetEmployee,
} from '../../../types/feedbackCampaign';

type AssignmentPreviewComponentProps = {
  campaign: FeedbackCampaign;
  preview: FeedbackAssignmentGenerationResponse | null;
  employees: FeedbackTargetEmployee[];
};

const AssignmentPreviewComponent = ({
                                      campaign,
                                      preview,
                                      employees,
                                    }: AssignmentPreviewComponentProps) => {
  const employeeNameById = new Map(employees.map((employee) => [employee.id, employee.fullName]));

  return (
      <section className="feedback-setup-card">
        <div className="feedback-setup-card-header">
          <div>
            <p className="feedback-setup-eyebrow">Step 4</p>
            <h2>Assignment preview</h2>
          </div>
          <div className="feedback-setup-chip">Campaign #{campaign.id}</div>
        </div>

        {preview ? (
            <div className="feedback-setup-stack">
              <div className="feedback-setup-metrics">
                <div className="feedback-setup-metric">
                  <span>Total targets</span>
                  <strong>{preview.totalTargets}</strong>
                </div>
                <div className="feedback-setup-metric">
                  <span>Total evaluators generated</span>
                  <strong>{preview.totalEvaluatorsGenerated}</strong>
                </div>
                <div className="feedback-setup-metric">
                  <span>Campaign window</span>
                  <strong>
                    {campaign.startDate} to {campaign.endDate}
                  </strong>
                </div>
              </div>

              {preview.warnings.length > 0 ? (
                  <div className="feedback-setup-warning-box">
                    <strong>Generation warnings</strong>
                    <ul>
                      {preview.warnings.map((warning) => (
                          <li key={warning}>{warning}</li>
                      ))}
                    </ul>
                  </div>
              ) : null}

              <div className="feedback-setup-preview-table">
                <table>
                  <thead>
                  <tr>
                    <th>Target employee</th>
                    <th>Manager</th>
                    <th>Self</th>
                    <th>Subordinate</th>
                    <th>Peer</th>
                    <th>Total</th>
                  </tr>
                  </thead>
                  <tbody>
                  {preview.requests.map((item) => (
                      <tr key={item.requestId}>
                        <td>{employeeNameById.get(item.targetEmployeeId) ?? `Employee #${item.targetEmployeeId}`}</td>
                        <td>{item.managerAssignments}</td>
                        <td>{item.selfAssignments ?? 0}</td>
                        <td>{item.subordinateAssignments ?? 0}</td>
                        <td>{item.peerAssignments}</td>
                        <td>{item.totalAssignments}</td>
                      </tr>
                  ))}
                  </tbody>
                </table>
              </div>
            </div>
        ) : (
            <div className="feedback-setup-empty">
              Generate evaluator assignments to preview the number of targets and evaluators.
            </div>
        )}
      </section>
  );
};

export default AssignmentPreviewComponent;
