import { Link } from 'react-router-dom';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useMyFeedbackTasks } from '../../hooks/useFeedbackEvaluator';
import { feedbackService } from '../../services/feedbackService';
import type { FeedbackAssignmentStatus, FeedbackEvaluatorTask, FeedbackRelationshipType } from '../../types/feedbackEvaluator';
import type { FeedbackReceivedItem } from '../../types/feedback';
import './feedback-evaluator.css';

type ViewKey = 'TO_GIVE' | 'ABOUT_ME';
type TaskFilter = 'OPEN' | 'DRAFT' | 'SUBMITTED' | 'ALL';

const formatDateTime = (value: string | null | undefined) => {
    if (!value) return 'No deadline';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
};

const initials = (name: string | null | undefined) =>
    (name || 'Employee')
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join('') || 'E';

const relationshipLabel = (type: FeedbackRelationshipType | string | null | undefined) => {
    switch (type) {
        case 'MANAGER':
            return 'Manager';
        case 'PEER':
            return 'Peer';
        case 'SUBORDINATE':
            return 'Subordinate';
        case 'SELF':
            return 'Self';
        case 'PROJECT_STAKEHOLDER':
            return 'Project Stakeholder';
        default:
            return type ? type.replace(/_/g, ' ') : 'Evaluator';
    }
};

const isOverdue = (task: FeedbackEvaluatorTask) => {
    if (!task.dueAt || task.status === 'SUBMITTED' || task.status === 'CANCELLED' || !task.canSubmit) return false;
    return new Date(task.dueAt).getTime() < Date.now();
};

const taskTone = (status: FeedbackAssignmentStatus, overdue = false) => {
    if (overdue) return 'danger';
    switch (status) {
        case 'SUBMITTED':
            return 'success';
        case 'IN_PROGRESS':
            return 'warning';
        case 'DECLINED':
        case 'CANCELLED':
            return 'muted';
        default:
            return 'info';
    }
};

const scoreLabel = (score: number | null | undefined, scoreCategory?: string | null) => {
    if (scoreCategory) return scoreCategory;
    if (score == null) return 'Pending';
    if (score >= 86) return 'Outstanding';
    if (score >= 71) return 'Good';
    if (score >= 60) return 'Meet requirement';
    if (score >= 40) return 'Needs improvement';
    return 'Unsatisfactory';
};

const scoreText = (score: number | null | undefined) => (score == null ? '-' : `${score.toFixed(1)}%`);

const EmployeeFeedbackDashboardPage = () => {
    const [activeView, setActiveView] = useState<ViewKey>('TO_GIVE');
    const [taskFilter, setTaskFilter] = useState<TaskFilter>('OPEN');
    const tasksQuery = useMyFeedbackTasks();
    const dashboardQuery = useQuery({
        queryKey: ['feedback-dashboard', 'employee'],
        queryFn: feedbackService.getEmployeeDashboard,
    });

    const tasks = tasksQuery.data ?? [];
    const ownResults = dashboardQuery.data?.ownFeedbackResults ?? [];

    const stats = useMemo(() => {
        const open = tasks.filter((task) => task.canSubmit && task.status !== 'IN_PROGRESS').length;
        const drafts = tasks.filter((task) => task.status === 'IN_PROGRESS').length;
        const submitted = tasks.filter((task) => task.status === 'SUBMITTED').length;
        const overdue = tasks.filter(isOverdue).length;
        return { total: tasks.length, open, drafts, submitted, overdue };
    }, [tasks]);

    const resultStats = useMemo(() => {
        const scores = ownResults.map((item) => item.overallScore).filter((score): score is number => typeof score === 'number');
        const average = scores.length ? scores.reduce((sum, score) => sum + score, 0) / scores.length : null;
        return {
            visibleResults: ownResults.length,
            average,
            anonymousResults: ownResults.filter((item) => item.anonymous).length,
        };
    }, [ownResults]);

    const filteredTasks = useMemo(() => {
        switch (taskFilter) {
            case 'OPEN':
                return tasks.filter((task) => task.canSubmit && task.status !== 'IN_PROGRESS');
            case 'DRAFT':
                return tasks.filter((task) => task.status === 'IN_PROGRESS');
            case 'SUBMITTED':
                return tasks.filter((task) => task.status === 'SUBMITTED');
            default:
                return tasks;
        }
    }, [taskFilter, tasks]);

    const renderTaskCard = (task: FeedbackEvaluatorTask) => {
        const overdue = isOverdue(task);
        return (
            <article key={task.assignmentId} className="feedback-evaluator-task-card feedback-employee-task-card">
                <div className="feedback-evaluator-task-topline">
          <span className={`feedback-evaluator-status ${taskTone(task.status, overdue)}`}>
            {overdue ? 'OVERDUE' : task.status.replace('_', ' ')}
          </span>
                    {task.anonymous ? <small className="feedback-evaluator-anonymous-pill">Anonymous form</small> : null}
                </div>

                <div className="feedback-evaluator-person-row">
                    <div className="feedback-evaluator-avatar">{initials(task.targetEmployeeName)}</div>
                    <div>
                        <strong>{task.targetEmployeeName}</strong>
                        <span>{relationshipLabel(task.relationshipType)} feedback</span>
                    </div>
                </div>

                <div className="feedback-evaluator-task-meta">
                    <div>
                        <span>Campaign</span>
                        <strong>{task.campaignName}</strong>
                        <small>{task.campaignStatus}</small>
                    </div>
                    <div>
                        <span>Deadline</span>
                        <strong>{formatDateTime(task.dueAt)}</strong>
                    </div>
                    {task.submittedAt ? (
                        <div>
                            <span>Submitted</span>
                            <strong>{formatDateTime(task.submittedAt)}</strong>
                        </div>
                    ) : null}
                </div>

                {task.lifecycleMessage ? (
                    <div className={`feedback-evaluator-banner ${task.canSubmit ? 'info' : 'warning'} compact`}>
                        {task.lifecycleMessage}
                    </div>
                ) : null}

                <Link
                    className="feedback-evaluator-primary feedback-evaluator-task-action"
                    to={`/employee/feedback/assignments/${task.assignmentId}`}
                >
                    {task.status === 'SUBMITTED'
                        ? 'View submission'
                        : task.canSubmit
                            ? (task.status === 'IN_PROGRESS' ? 'Continue draft' : 'Open form')
                            : 'View read-only'}
                </Link>
            </article>
        );
    };

    const renderResultCard = (item: FeedbackReceivedItem) => {
        const relationship = item.relationshipType ?? item.sourceType;
        return (
            <article key={item.responseId} className="feedback-result-card feedback-result-card-readable">
                <div className="feedback-result-score">
                    <strong>{scoreText(item.overallScore)}</strong>
                    <span>{scoreLabel(item.overallScore, item.scoreCategory)}</span>
                </div>
                <div className="feedback-result-body">
                    <div className="feedback-result-headline">
                        <div>
                            <span className="feedback-workspace-kicker">{item.campaignName}</span>
                            <h3>{relationshipLabel(relationship)} feedback</h3>
                        </div>
                        <span className="feedback-evaluator-status success">VISIBLE</span>
                    </div>

                    <div className="feedback-result-people">
                        <div className="feedback-evaluator-person-row compact">
                            <div className="feedback-evaluator-avatar small">{initials(item.evaluatorDisplayName)}</div>
                            <div>
                                <strong>{item.evaluatorDisplayName || (item.anonymous ? 'Anonymous evaluator' : 'Evaluator')}</strong>
                                <span>
                  {item.evaluatorIdentityVisible
                      ? `${item.evaluatorSourceLabel || relationshipLabel(relationship)} identity visible`
                      : item.identityProtectionReason || 'Evaluator identity protected'}
                </span>
                            </div>
                        </div>
                    </div>

                    <p>{item.comments || 'No overall comment was provided.'}</p>
                    <div className="feedback-result-meta">
                        <span>Submitted {formatDateTime(item.submittedAt)}</span>
                        <span>{item.campaignStatus || 'Campaign'}</span>
                        <span>{item.evaluatorSourceLabel || relationshipLabel(relationship)}</span>
                        {item.visibilityReason ? <span>Visible: {item.visibilityReason}</span> : null}
                    </div>
                </div>
            </article>
        );
    };

    const renderTaskEmpty = () => (
        <div className="feedback-evaluator-empty feedback-evaluator-empty-guided">
            <h3>No matching evaluator tasks</h3>
            <p>
                Draft campaigns are hidden from employees. Tasks appear here after HR saves targets, generates assignments, and activates the campaign.
            </p>
            <ol>
                <li>HR creates the form and campaign.</li>
                <li>HR saves targets and generates assignments.</li>
                <li>HR activates the campaign.</li>
                <li>The assigned evaluators see tasks here.</li>
            </ol>
        </div>
    );

    return (
        <div className="feedback-evaluator-stack feedback-employee-dashboard">
            <section className="feedback-evaluator-card feedback-employee-hero">
                <div>
                    <p className="feedback-workspace-kicker">360 Feedback</p>
                    <h2>My Feedback</h2>
                    <span>
            Use this workspace for both sides of 360 feedback: assignments you need to complete and published feedback about you.
          </span>
                </div>
                <div className="feedback-role-guide">
                    <div>
                        <strong>Feedback I need to give</strong>
                        <span>Active assignments where you are the evaluator.</span>
                    </div>
                    <div>
                        <strong>Feedback about me</strong>
                        <span>Visible submitted feedback where you are the target employee.</span>
                    </div>
                    <div>
                        <strong>Visibility rule</strong>
                        <span>Target results appear only after close, deadline, all submissions, or allowed role access.</span>
                    </div>
                </div>
            </section>

            <section className="feedback-evaluator-hero feedback-evaluator-hero-compact feedback-employee-metrics">
                <div className="feedback-evaluator-metric">
                    <span>Open to give</span>
                    <strong>{stats.open}</strong>
                </div>
                <div className="feedback-evaluator-metric">
                    <span>Drafts</span>
                    <strong>{stats.drafts}</strong>
                </div>
                <div className="feedback-evaluator-metric">
                    <span>Submitted by me</span>
                    <strong>{stats.submitted}</strong>
                </div>
                <div className="feedback-evaluator-metric">
                    <span>Visible about me</span>
                    <strong>{resultStats.visibleResults}</strong>
                </div>
                <div className={`feedback-evaluator-metric ${stats.overdue > 0 ? 'is-danger' : ''}`}>
                    <span>Overdue</span>
                    <strong>{stats.overdue}</strong>
                </div>
                <div className="feedback-evaluator-metric">
                    <span>Average about me</span>
                    <strong>{scoreText(resultStats.average)}</strong>
                </div>
            </section>

            <section className="feedback-evaluator-card">
                <div className="feedback-evaluator-card-header feedback-evaluator-card-header-wrap">
                    <div>
                        <p className="feedback-workspace-kicker">Employee workspace</p>
                        <h2>{activeView === 'TO_GIVE' ? 'Feedback I need to give' : 'Feedback about me'}</h2>
                        <span>
              {activeView === 'TO_GIVE'
                  ? 'These are active or submitted assignments where you are the evaluator.'
                  : 'These are visible feedback results where you are the target employee.'}
            </span>
                    </div>

                    <div className="feedback-evaluator-filter-group" aria-label="Switch feedback view">
                        <button
                            type="button"
                            className={activeView === 'TO_GIVE' ? 'active' : ''}
                            onClick={() => setActiveView('TO_GIVE')}
                        >
                            To give
                        </button>
                        <button
                            type="button"
                            className={activeView === 'ABOUT_ME' ? 'active' : ''}
                            onClick={() => setActiveView('ABOUT_ME')}
                        >
                            About me
                        </button>
                    </div>
                </div>

                {activeView === 'TO_GIVE' ? (
                    tasksQuery.isLoading ? (
                        <div className="feedback-evaluator-empty">Loading your assigned feedback tasks...</div>
                    ) : tasksQuery.error instanceof Error ? (
                        <div className="feedback-evaluator-banner error">{tasksQuery.error.message}</div>
                    ) : tasks.length === 0 ? (
                        renderTaskEmpty()
                    ) : (
                        <div className="feedback-evaluator-stack">
                            <div className="feedback-evaluator-filter-group feedback-task-filter" aria-label="Filter evaluator tasks">
                                {(['OPEN', 'DRAFT', 'SUBMITTED', 'ALL'] as TaskFilter[]).map((filter) => (
                                    <button
                                        type="button"
                                        key={filter}
                                        className={taskFilter === filter ? 'active' : ''}
                                        onClick={() => setTaskFilter(filter)}
                                    >
                                        {filter === 'OPEN' ? 'Open' : filter === 'DRAFT' ? 'Drafts' : filter === 'SUBMITTED' ? 'Submitted' : 'All'}
                                    </button>
                                ))}
                            </div>

                            {filteredTasks.length === 0 ? renderTaskEmpty() : (
                                <div className="feedback-evaluator-task-grid">{filteredTasks.map(renderTaskCard)}</div>
                            )}
                        </div>
                    )
                ) : dashboardQuery.isLoading ? (
                    <div className="feedback-evaluator-empty">Loading feedback results about you...</div>
                ) : dashboardQuery.error instanceof Error ? (
                    <div className="feedback-evaluator-banner error">{dashboardQuery.error.message}</div>
                ) : ownResults.length === 0 ? (
                    <div className="feedback-evaluator-empty feedback-evaluator-empty-guided">
                        <h3>No visible results yet</h3>
                        <p>
                            Your target-side results stay hidden until the visibility rule is met. This protects 360 feedback anonymity and avoids early review bias.
                        </p>
                        <ol>
                            <li>Campaign is closed, or</li>
                            <li>Submission deadline has passed, or</li>
                            <li>All assigned evaluators submitted, or</li>
                            <li>You are viewing with an authorized HR/Admin role.</li>
                        </ol>
                    </div>
                ) : (
                    <div className="feedback-result-list">{ownResults.map(renderResultCard)}</div>
                )}
            </section>
        </div>
    );
};

export default EmployeeFeedbackDashboardPage;
