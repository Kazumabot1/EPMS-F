import { Link } from 'react-router-dom';
import { useMyFeedbackTasks } from '../../hooks/useFeedbackEvaluator';
import type { FeedbackEvaluatorTask } from '../../types/feedbackEvaluator';

const formatDateTime = (value: string | null) => {
  if (!value) {
    return 'No deadline';
  }

  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
};

const taskTone = (status: FeedbackEvaluatorTask['status']) => {
  switch (status) {
    case 'SUBMITTED':
      return 'success';
    case 'IN_PROGRESS':
      return 'warning';
    case 'DECLINED':
      return 'muted';
    default:
      return 'info';
  }
};

const MyTasksPage = () => {
  const tasksQuery = useMyFeedbackTasks();

  const tasks = tasksQuery.data ?? [];
  const pendingCount = tasks.filter((task) => task.status !== 'SUBMITTED').length;

  return (
    <div className="feedback-evaluator-stack">
      <section className="feedback-evaluator-hero">
        <div className="feedback-evaluator-metric">
          <span>Total assignments</span>
          <strong>{tasks.length}</strong>
        </div>
        <div className="feedback-evaluator-metric">
          <span>Open tasks</span>
          <strong>{pendingCount}</strong>
        </div>
      </section>

      {tasksQuery.isLoading ? (
        <div className="feedback-evaluator-empty">Loading your feedback assignments...</div>
      ) : tasksQuery.error instanceof Error ? (
        <div className="feedback-evaluator-banner error">{tasksQuery.error.message}</div>
      ) : tasks.length === 0 ? (
        <div className="feedback-evaluator-empty">
          No feedback assignments are currently assigned to you.
        </div>
      ) : (
        <section className="feedback-evaluator-card">
          <div className="feedback-evaluator-card-header">
            <div>
              <p className="feedback-workspace-kicker">Assigned work</p>
              <h2>My feedback tasks</h2>
            </div>
          </div>

          <div className="feedback-evaluator-table-wrap">
            <table className="feedback-evaluator-table">
              <thead>
                <tr>
                  <th>Campaign</th>
                  <th>Target employee</th>
                  <th>Relationship</th>
                  <th>Deadline</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {tasks.map((task) => (
                  <tr key={task.assignmentId}>
                    <td>
                      <div className="feedback-evaluator-table-title">
                        <strong>{task.campaignName}</strong>
                        <span>Assignment #{task.assignmentId}</span>
                      </div>
                    </td>
                    <td>
                      <div className="feedback-evaluator-table-title">
                        <strong>{task.targetEmployeeName}</strong>
                        <span>Employee #{task.targetEmployeeId}</span>
                      </div>
                    </td>
                    <td>
                      <span>{task.relationshipType}</span>
                      {task.anonymous ? (
                        <small className="feedback-evaluator-anonymous-pill">Anonymous</small>
                      ) : null}
                    </td>
                    <td>{formatDateTime(task.dueAt)}</td>
                    <td>
                      <span className={`feedback-evaluator-status ${taskTone(task.status)}`}>
                        {task.status}
                      </span>
                    </td>
                    <td>
                      <Link
                        className="feedback-evaluator-primary"
                        to={`/feedback/assignments/${task.assignmentId}`}
                      >
                        {task.status === 'SUBMITTED' ? 'View submission' : 'Open form'}
                      </Link>
                    </td>
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

export default MyTasksPage;
