import { Link } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useMyFeedbackTasks } from '../../hooks/useFeedbackEvaluator';
import { feedbackService } from '../../services/feedbackService';
import type { FeedbackEvaluatorTask, FeedbackRelationshipType } from '../../types/feedbackEvaluator';
import type { FeedbackReceivedItem } from '../../types/feedback';
import './feedback-evaluator.css';

type ViewKey = 'TO_GIVE' | 'ABOUT_ME';
type TaskStatusFilter = 'ALL' | 'PENDING' | 'IN_PROGRESS' | 'SUBMITTED';
type RelationshipFilter = 'ALL' | FeedbackRelationshipType;

type TaskGroup = {
    key: string;
    label: string;
    tone: 'danger' | 'warning' | 'info' | 'draft' | 'success';
    items: FeedbackEvaluatorTask[];
};

type FeedbackReceivedQuestionItem = {
    questionId: number;
    questionText?: string | null;
    questionOrder?: number | null;
    sectionTitle?: string | null;
    sectionOrder?: number | null;
    ratingValue?: number | null;
    comment?: string | null;
};

type FeedbackReceivedItemWithQuestions = FeedbackReceivedItem & {
    questionItems?: FeedbackReceivedQuestionItem[];
};

type ResultItem = {
    item: FeedbackReceivedItemWithQuestions;
    relationship: string;
    relationshipLabel: string;
    sourceLabel: string;
    sourceSubLabel: string;
    identityHidden: boolean;
};

type CampaignGroup = {
    key: string;
    campaignId: number;
    campaignName: string;
    status?: string;
    items: ResultItem[];
};

type RelationshipGroup = {
    key: string;
    label: string;
    countLabel: string;
    icon: string;
    items: ResultItem[];
};

const SCORE_VISIBILITY_STORAGE_KEY = 'epms-360-v3-score-visibility';
const NOTES_STORAGE_KEY = 'epms-360-v3-private-notes';
const MS_PER_DAY = 86_400_000;

const relationshipLabel = (type: FeedbackRelationshipType | string | null | undefined, plural = false) => {
    switch (type) {
        case 'MANAGER':
            return plural ? 'Managers' : 'Manager';
        case 'PEER':
            return plural ? 'Peers' : 'Peer';
        case 'SUBORDINATE':
            return plural ? 'Direct reports' : 'Direct report';
        case 'SELF':
            return plural ? 'Self review' : 'Self review';
        case 'PROJECT_STAKEHOLDER':
            return plural ? 'Project stakeholders' : 'Project stakeholder';
        default:
            return type ? type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase()) : 'Evaluator';
    }
};

const relationshipIcon = (type: string) => {
    switch (type) {
        case 'MANAGER':
            return 'manager';
        case 'PEER':
            return 'peer';
        case 'SUBORDINATE':
            return 'direct-report';
        case 'SELF':
            return 'self';
        case 'PROJECT_STAKEHOLDER':
            return 'stakeholder';
        default:
            return 'feedback';
    }
};

const initials = (name?: string | null) =>
    (name || 'Employee')
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join('') || 'E';

const formatDate = (value?: string | null) => {
    if (!value) return 'No deadline';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(date);
};

const daysUntil = (value?: string | null) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const days = Math.ceil((date.getTime() - Date.now()) / MS_PER_DAY);
    if (days < 0) return `${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} overdue`;
    if (days === 0) return 'Due today';
    return `in ${days} day${days === 1 ? '' : 's'}`;
};

const isOverdue = (task: FeedbackEvaluatorTask) => {
    if (!task.dueAt || task.status === 'SUBMITTED' || task.status === 'CANCELLED' || !task.canSubmit) return false;
    return new Date(task.dueAt).getTime() < Date.now();
};

const isDueSoon = (task: FeedbackEvaluatorTask) => {
    if (!task.dueAt || task.status === 'SUBMITTED' || task.status === 'CANCELLED' || !task.canSubmit) return false;
    const due = new Date(task.dueAt).getTime();
    if (Number.isNaN(due)) return false;
    const days = (due - Date.now()) / MS_PER_DAY;
    return days >= 0 && days <= 7;
};

const statusLabel = (task: FeedbackEvaluatorTask) => {
    if (isOverdue(task)) return 'Overdue';
    switch (task.status) {
        case 'IN_PROGRESS':
            return 'Draft saved';
        case 'SUBMITTED':
            return 'Completed';
        case 'CANCELLED':
            return 'Cancelled';
        case 'DECLINED':
            return 'Declined';
        default:
            return 'Not started';
    }
};

const taskProgress = (task: FeedbackEvaluatorTask) => {
    if (task.status === 'SUBMITTED') return 100;
    if (task.status === 'IN_PROGRESS') return 50;
    return 0;
};

const taskActionLabel = (task: FeedbackEvaluatorTask) => {
    if (task.status === 'SUBMITTED') return 'View';
    if (!task.canSubmit) return 'View';
    if (task.status === 'IN_PROGRESS') return 'Continue';
    return 'Start now';
};

const HIDDEN_SCORE_TEXT = '•••••';

const ChevronIcon = ({ open }: { open: boolean }) => (
    <svg className={`feedback-v3-svg-icon chevron ${open ? 'open' : ''}`} viewBox="0 0 20 20" aria-hidden="true">
        <path d="M5.5 7.5 10 12l4.5-4.5" />
    </svg>
);

const EyeIcon = ({ hidden }: { hidden: boolean }) => (
    <svg className="feedback-v3-svg-icon" viewBox="0 0 24 24" aria-hidden="true">
        {hidden ? (
            <>
                <path d="M3 3l18 18" />
                <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
                <path d="M9.9 5.2A9.7 9.7 0 0 1 12 5c5 0 8.5 4.5 9.7 6.5a1 1 0 0 1 0 1c-.5.9-1.5 2.2-2.9 3.4" />
                <path d="M6.6 6.9A16 16 0 0 0 2.3 11.5a1 1 0 0 0 0 1C3.5 14.5 7 19 12 19a9.7 9.7 0 0 0 3.4-.6" />
            </>
        ) : (
            <>
                <path d="M2.3 11.5a1 1 0 0 0 0 1C3.5 14.5 7 19 12 19s8.5-4.5 9.7-6.5a1 1 0 0 0 0-1C20.5 9.5 17 5 12 5S3.5 9.5 2.3 11.5Z" />
                <circle cx="12" cy="12" r="3" />
            </>
        )}
    </svg>
);

const SectionIcon = ({ type }: { type: string }) => {
    switch (type) {
        case 'start':
            return (
                <svg className={`feedback-v3-svg-icon section-icon ${type}`} viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M7.5 5.5v13l10-6.5-10-6.5Z" fill="currentColor" stroke="none" />
                </svg>
            );
        case 'clock':
            return (
                <svg className={`feedback-v3-svg-icon section-icon ${type}`} viewBox="0 0 24 24" aria-hidden="true">
                    <circle cx="12" cy="12" r="8" />
                    <path d="M12 7.75v4.5l3 1.75" />
                    <path d="M17.5 6.5 19 5" />
                </svg>
            );
        case 'draft':
            return (
                <svg className={`feedback-v3-svg-icon section-icon ${type}`} viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M7 5.5h6.5L17 9v9a1.5 1.5 0 0 1-1.5 1.5h-7A1.5 1.5 0 0 1 7 18V5.5Z" />
                    <path d="M13.5 5.5V9H17" />
                    <path d="m10 14.75 4.9-4.9 1.25 1.25-4.9 4.9-2.15.9.9-2.15Z" fill="currentColor" stroke="none" />
                </svg>
            );
        case 'check':
            return (
                <svg className={`feedback-v3-svg-icon section-icon ${type}`} viewBox="0 0 24 24" aria-hidden="true">
                    <circle cx="12" cy="12" r="8" />
                    <path d="m8.6 12.2 2.25 2.25 4.55-4.8" />
                </svg>
            );
        case 'bolt':
            return (
                <svg className={`feedback-v3-svg-icon section-icon ${type}`} viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M13.25 2.75 6.75 12h4l-1 9.25L17.25 12h-4l0-9.25Z" fill="currentColor" stroke="none" />
                </svg>
            );
        case 'campaign':
            return (
                <svg className={`feedback-v3-svg-icon section-icon ${type}`} viewBox="0 0 24 24" aria-hidden="true">
                    <rect x="4.5" y="5" width="15" height="14" rx="2.5" />
                    <path d="M8 3.75v3.5M16 3.75v3.5M4.5 9.5h15" />
                </svg>
            );
        default:
            return <span className={`feedback-v3-css-icon ${type}`} aria-hidden="true" />;
    }
};

const scoreText = (score?: number | null) => (typeof score === 'number' ? `${score.toFixed(1)}%` : 'No score');

const ratingScoreText = (score?: number | null) => (typeof score === 'number' ? `${score.toFixed(1)} / 5` : 'No rating');

const ratingStars = (score?: number | null) => {
    if (typeof score !== 'number') return '☆☆☆☆☆';
    const rounded = Math.max(0, Math.min(5, Math.round(score)));
    return `${'★'.repeat(rounded)}${'☆'.repeat(5 - rounded)}`;
};

const averageScore = (items: ResultItem[]) => {
    const scores = items.map(({ item }) => item.overallScore).filter((score): score is number => typeof score === 'number');
    return scores.length ? scores.reduce((sum, score) => sum + score, 0) / scores.length : null;
};

const campaignAverageScoreKey = (campaignKey: string) => `${campaignKey}:campaign-average`;
const formAverageScoreKey = (responseId: number) => `form:${responseId}:average`;
const questionRatingScoreKey = (responseId: number, questionId: number) => `question:${responseId}:${questionId}:rating`;

const resultRelationship = (item: FeedbackReceivedItem) => item.relationshipType ?? item.sourceType ?? 'EVALUATOR';

const buildSearchText = (task: FeedbackEvaluatorTask) => [
    task.targetEmployeeName,
    task.relationshipType,
    task.campaignName,
    task.status,
    task.campaignStatus,
].filter(Boolean).join(' ').toLowerCase();


const downloadTextFile = (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
};

const EmployeeFeedbackDashboardPage = () => {
    const [activeView, setActiveView] = useState<ViewKey>('TO_GIVE');
    const [taskSearch, setTaskSearch] = useState('');
    const [taskStatusFilter, setTaskStatusFilter] = useState<TaskStatusFilter>('ALL');
    const [taskCampaignFilter, setTaskCampaignFilter] = useState('ALL');
    const [taskRelationshipFilter, setTaskRelationshipFilter] = useState<RelationshipFilter>('ALL');
    const [expandedTaskGroups, setExpandedTaskGroups] = useState<Record<string, boolean>>({});
    const [expandedCampaigns, setExpandedCampaigns] = useState<Record<string, boolean>>({});
    const [expandedRelationships, setExpandedRelationships] = useState<Record<string, boolean>>({});
    const [visibleScores, setVisibleScores] = useState<Record<string, boolean>>({});
    const [privateNotes, setPrivateNotes] = useState<Record<string, string>>({});

    const tasksQuery = useMyFeedbackTasks();
    const dashboardQuery = useQuery({
        queryKey: ['feedback-dashboard', 'employee'],
        queryFn: feedbackService.getEmployeeDashboard,
    });

    const tasks = tasksQuery.data ?? [];
    const ownResults = dashboardQuery.data?.ownFeedbackResults ?? [];

    useEffect(() => {
        try {
            const savedScores = window.localStorage.getItem(SCORE_VISIBILITY_STORAGE_KEY);
            if (savedScores) setVisibleScores(JSON.parse(savedScores));
        } catch {
            setVisibleScores({});
        }

        try {
            const savedNotes = window.localStorage.getItem(NOTES_STORAGE_KEY);
            if (savedNotes) setPrivateNotes(JSON.parse(savedNotes));
        } catch {
            setPrivateNotes({});
        }
    }, []);

    const updateScoreVisibility = (next: Record<string, boolean>) => {
        setVisibleScores(next);
        window.localStorage.setItem(SCORE_VISIBILITY_STORAGE_KEY, JSON.stringify(next));
    };

    const toggleScore = (key: string) => updateScoreVisibility({ ...visibleScores, [key]: !visibleScores[key] });

    const renderScoreToggle = (scoreKey: string, visible: boolean, label: string) => (
        <button
            type="button"
            className={`feedback-v3-score-toggle ${visible ? 'visible' : 'hidden'}`}
            aria-label={`${visible ? 'Hide' : 'Reveal'} ${label}`}
            title={`${visible ? 'Hide' : 'Reveal'} ${label}`}
            onClick={(event) => {
                event.stopPropagation();
                toggleScore(scoreKey);
            }}
        >
            <EyeIcon hidden={visible} />
            <span className="feedback-v3-visually-hidden">{visible ? 'Hide' : 'Reveal'} {label}</span>
        </button>
    );

    const renderStarScore = (score?: number | null) => (
        <span className="feedback-v3-star-score" aria-label={ratingScoreText(score)}>
      <span aria-hidden="true">{ratingStars(score)}</span>
      <small>{ratingScoreText(score)}</small>
    </span>
    );

    const updatePrivateNote = (campaignKey: string, value: string) => {
        const next = { ...privateNotes, [campaignKey]: value };
        setPrivateNotes(next);
        window.localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(next));
    };

    const taskCampaignOptions = useMemo(() => Array.from(new Set(tasks.map((task) => task.campaignName).filter(Boolean))).sort(), [tasks]);

    const taskStats = useMemo(() => {
        const drafts = tasks.filter((task) => task.status === 'IN_PROGRESS').length;
        const completed = tasks.filter((task) => task.status === 'SUBMITTED').length;
        const dueSoon = tasks.filter((task) => isDueSoon(task) && !isOverdue(task)).length;
        const toStart = tasks.filter((task) => task.canSubmit && task.status === 'PENDING' && !isOverdue(task)).length;
        return { toStart, dueSoon, drafts, completed };
    }, [tasks]);

    const filteredTasks = useMemo(() => {
        const search = taskSearch.trim().toLowerCase();
        return tasks.filter((task) => {
            if (taskStatusFilter !== 'ALL' && task.status !== taskStatusFilter) return false;
            if (taskCampaignFilter !== 'ALL' && task.campaignName !== taskCampaignFilter) return false;
            if (taskRelationshipFilter !== 'ALL' && task.relationshipType !== taskRelationshipFilter) return false;
            if (search && !buildSearchText(task).includes(search)) return false;
            return true;
        });
    }, [taskCampaignFilter, taskRelationshipFilter, taskSearch, taskStatusFilter, tasks]);

    const taskGroups = useMemo<TaskGroup[]>(() => [
        {
            key: 'overdue',
            label: 'Overdue',
            tone: 'danger',
            items: filteredTasks.filter(isOverdue),
        },
        {
            key: 'dueSoon',
            label: 'Due soon',
            tone: 'warning',
            items: filteredTasks.filter((task) => isDueSoon(task) && !isOverdue(task)),
        },
        {
            key: 'toStart',
            label: 'To start',
            tone: 'info',
            items: filteredTasks.filter((task) => task.canSubmit && task.status === 'PENDING' && !isOverdue(task) && !isDueSoon(task)),
        },
        {
            key: 'draftsSaved',
            label: 'Drafts saved',
            tone: 'draft',
            items: filteredTasks.filter((task) => task.status === 'IN_PROGRESS'),
        },
        {
            key: 'completed',
            label: 'Completed',
            tone: 'success',
            items: filteredTasks.filter((task) => task.status === 'SUBMITTED'),
        },
    ], [filteredTasks]);

    const displayResults = useMemo<ResultItem[]>(() => {
        const anonymousCounts = new Map<string, number>();
        return ownResults.map((item) => {
            const relationship = resultRelationship(item);
            const identityHidden = relationship === 'PEER' || relationship === 'SUBORDINATE' || item.anonymous || item.evaluatorIdentityVisible === false;
            const relationshipName = relationshipLabel(relationship);
            let sourceLabel = item.evaluatorDisplayName || item.evaluatorSourceLabel || relationshipName;
            let sourceSubLabel = `${relationshipName} feedback`;

            if (relationship === 'PEER' || relationship === 'SUBORDINATE') {
                const key = `${item.campaignId}-${relationship}`;
                const count = (anonymousCounts.get(key) ?? 0) + 1;
                anonymousCounts.set(key, count);
                sourceLabel = `Anonymous ${relationshipLabel(relationship).toLowerCase()} ${count}`;
                sourceSubLabel = `${relationshipLabel(relationship)} identity hidden`;
            } else if (identityHidden) {
                sourceLabel = 'Anonymous evaluator';
                sourceSubLabel = item.identityProtectionReason || 'Identity hidden';
            } else if (relationship === 'SELF') {
                sourceLabel = item.evaluatorDisplayName || 'Self review';
                sourceSubLabel = 'Your own reflection';
            }

            return { item, relationship, relationshipLabel: relationshipName, sourceLabel, sourceSubLabel, identityHidden };
        });
    }, [ownResults]);

    const campaignGroups = useMemo<CampaignGroup[]>(() => {
        const groups = new Map<string, CampaignGroup>();
        displayResults.forEach((result) => {
            const key = `campaign-${result.item.campaignId}`;
            if (!groups.has(key)) {
                groups.set(key, {
                    key,
                    campaignId: result.item.campaignId,
                    campaignName: result.item.campaignName,
                    status: result.item.campaignStatus,
                    items: [],
                });
            }
            groups.get(key)?.items.push(result);
        });
        return Array.from(groups.values()).sort((a, b) => b.campaignId - a.campaignId);
    }, [displayResults]);

    const selectedCampaignKey = useMemo(
        () => Object.entries(expandedCampaigns).find(([, expanded]) => expanded)?.[0],
        [expandedCampaigns],
    );

    const relationshipGroupsForCampaign = (items: ResultItem[]): RelationshipGroup[] => {
        const order = ['MANAGER', 'PEER', 'SUBORDINATE', 'SELF', 'PROJECT_STAKEHOLDER'];
        return order
            .map((relationship) => {
                const groupItems = items.filter((result) => result.relationship === relationship);
                const label = relationshipLabel(relationship, true);
                return {
                    key: relationship,
                    label,
                    countLabel: `${groupItems.length} ${groupItems.length === 1 ? 'respondent' : 'respondents'}`,
                    icon: relationshipIcon(relationship),
                    items: groupItems,
                };
            })
            .filter((group) => group.items.length > 0);
    };


    const exportCampaign = (campaign: CampaignGroup) => {
        const campaignScoreVisible = Boolean(visibleScores[campaignAverageScoreKey(campaign.key)]);
        const lines = [
            `${campaign.campaignName} - Published 360 Feedback`,
            `Exported: ${new Date().toLocaleString()}`,
            `Campaign average: ${campaignScoreVisible ? scoreText(averageScore(campaign.items)) : 'Hidden'}`,
            '',
            'Feedback',
            '========',
        ];

        relationshipGroupsForCampaign(campaign.items).forEach((group) => {
            lines.push('', group.label, '-'.repeat(group.label.length));
            group.items.forEach((result) => {
                const formScoreVisible = Boolean(visibleScores[formAverageScoreKey(result.item.responseId)]);
                lines.push(`${result.sourceLabel} (${result.sourceSubLabel})`);
                lines.push(`Whole form average: ${formScoreVisible ? scoreText(result.item.overallScore) : 'Hidden'}`);
                lines.push(`Comment: ${result.item.comments?.trim() || 'No overall comment provided.'}`);
                (result.item.questionItems ?? []).forEach((question) => {
                    const questionScoreVisible = Boolean(visibleScores[questionRatingScoreKey(result.item.responseId, question.questionId)]);
                    lines.push(`- ${question.sectionTitle ? `${question.sectionTitle}: ` : ''}${question.questionText}`);
                    lines.push(`  Question rating: ${questionScoreVisible ? `${ratingStars(question.ratingValue)} ${ratingScoreText(question.ratingValue)}` : 'Hidden'}`);
                    lines.push(`  Comment: ${question.comment?.trim() || 'No question comment provided.'}`);
                });
                lines.push('');
            });
        });

        const note = privateNotes[campaign.key]?.trim();
        if (note) lines.push('My notes', '========', note);

        downloadTextFile(`${campaign.campaignName.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-feedback.txt`, lines.join('\n'));
    };

    const toggleTaskGroup = (key: string) => setExpandedTaskGroups((current) => ({ ...current, [key]: !current[key] }));

    const toggleCampaign = (key: string) => {
        setExpandedCampaigns((current) => ({ ...current, [key]: !current[key] }));
    };

    const toggleRelationship = (key: string) => {
        setExpandedRelationships((current) => ({ ...current, [key]: !current[key] }));
    };

    const renderTaskRow = (task: FeedbackEvaluatorTask) => {
        const progress = taskProgress(task);
        return (
            <div className="feedback-v3-task-row" key={task.assignmentId}>
                <div className="feedback-v3-employee-cell">
                    <div className="feedback-v3-avatar">{initials(task.targetEmployeeName)}</div>
                    <div>
                        <strong>{task.targetEmployeeName}</strong>
                        <span>{relationshipLabel(task.relationshipType)}</span>
                    </div>
                </div>
                <span className={`feedback-v3-role-pill ${task.relationshipType.toLowerCase()}`}>{relationshipLabel(task.relationshipType)}</span>
                <strong className="feedback-v3-muted-strong">{task.campaignName}</strong>
                <div className="feedback-v3-date-cell">
                    <strong>{formatDate(task.dueAt)}</strong>
                    <span className={isOverdue(task) ? 'danger' : isDueSoon(task) ? 'warning' : ''}>{daysUntil(task.dueAt)}</span>
                </div>
                <div className="feedback-v3-progress-cell">
                    <span>{progress}%</span>
                    <div className="feedback-v3-progress-track"><i style={{ width: `${progress}%` }} /></div>
                </div>
                <span className={`feedback-v3-status-pill ${isOverdue(task) ? 'danger' : task.status.toLowerCase()}`}>{statusLabel(task)}</span>
                <Link className="feedback-v3-action-button" to={`/employee/feedback/assignments/${task.assignmentId}`}>
                    {taskActionLabel(task)}
                </Link>
            </div>
        );
    };

    const renderTaskGroup = (group: TaskGroup) => {
        const expanded = Boolean(expandedTaskGroups[group.key]);
        return (
            <section className={`feedback-v3-accordion ${group.tone}`} key={group.key}>
                <button type="button" className="feedback-v3-accordion-head" onClick={() => toggleTaskGroup(group.key)}>
                    <span>{group.label}</span>
                    <strong>{group.items.length}</strong>
                    <ChevronIcon open={expanded} />
                </button>
                {expanded ? (
                    <div className="feedback-v3-task-table">
                        {group.items.length > 0 ? (
                            <>
                                <div className="feedback-v3-task-table-head">
                                    <span>Employee</span>
                                    <span>Role</span>
                                    <span>Campaign</span>
                                    <span>Deadline</span>
                                    <span>Completion</span>
                                    <span>Status</span>
                                    <span>Action</span>
                                </div>
                                {group.items.map(renderTaskRow)}
                            </>
                        ) : (
                            <div className="feedback-v3-empty-row">Nothing here right now.</div>
                        )}
                    </div>
                ) : null}
            </section>
        );
    };

    const renderRelationshipRow = (campaign: CampaignGroup, group: RelationshipGroup) => {
        const key = `${campaign.key}-${group.key}`;
        const expanded = Boolean(expandedRelationships[key]);
        return (
            <section className="feedback-v3-result-section" key={group.key}>
                <button type="button" className="feedback-v3-result-section-head" onClick={() => toggleRelationship(key)}>
                    <div className="feedback-v3-result-title">
                        <span className={`feedback-v3-result-icon ${group.key.toLowerCase()}`}><SectionIcon type={group.icon} /></span>
                        <div>
                            <strong>{group.label}</strong>
                            <small>{group.countLabel}</small>
                        </div>
                    </div>
                    <span className="feedback-v3-result-count">{group.countLabel}</span>
                    <ChevronIcon open={expanded} />
                </button>
                {expanded ? (
                    <div className="feedback-v3-response-list">
                        {group.items.map((result) => {
                            const formScoreKey = formAverageScoreKey(result.item.responseId);
                            const formScoreVisible = Boolean(visibleScores[formScoreKey]);
                            return (
                                <article className="feedback-v3-response-card" key={result.item.responseId}>
                                    <div className="feedback-v3-response-card-head">
                                        <div>
                                            <strong>{result.sourceLabel}</strong>
                                            <small>{result.sourceSubLabel}</small>
                                        </div>
                                        <div className="feedback-v3-response-score">
                                            <small>Whole form average</small>
                                            <span className={!formScoreVisible ? 'is-hidden-score' : ''}>{formScoreVisible ? scoreText(result.item.overallScore) : HIDDEN_SCORE_TEXT}</span>
                                            {renderScoreToggle(formScoreKey, formScoreVisible, `whole form average for ${result.sourceLabel}`)}
                                        </div>
                                    </div>
                                    <p className="feedback-v3-overall-comment">{result.item.comments?.trim() || 'No overall comment was provided.'}</p>
                                    <div className="feedback-v3-question-list">
                                        {(result.item.questionItems ?? []).map((question) => {
                                            const questionScoreKey = questionRatingScoreKey(result.item.responseId, question.questionId);
                                            const questionScoreVisible = Boolean(visibleScores[questionScoreKey]);
                                            return (
                                                <div className="feedback-v3-question-line" key={`${result.item.responseId}-${question.questionId}`}>
                                                    <div className="feedback-v3-question-main">
                                                        <span>{question.sectionTitle || 'Question'}</span>
                                                        <strong>{question.questionText}</strong>
                                                    </div>
                                                    <div className="feedback-v3-question-score-line">
                                                        <em>Question rating</em>
                                                        {questionScoreVisible ? renderStarScore(question.ratingValue) : <span className="feedback-v3-score-hidden-text">Score hidden</span>}
                                                        {renderScoreToggle(questionScoreKey, questionScoreVisible, `question rating for ${question.questionText}`)}
                                                    </div>
                                                    {question.comment?.trim() ? <p>{question.comment}</p> : null}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                ) : null}
            </section>
        );
    };


    const renderCampaign = (campaign: CampaignGroup, index: number) => {
        const expanded = Boolean(expandedCampaigns[campaign.key]);
        const campaignScoreKey = campaignAverageScoreKey(campaign.key);
        const campaignScoreVisible = Boolean(visibleScores[campaignScoreKey]);
        const groups = relationshipGroupsForCampaign(campaign.items);
        return (
            <article className={`feedback-v3-campaign-card ${expanded ? 'expanded' : ''}`} key={campaign.key}>
                <div className="feedback-v3-campaign-head">
                    <button type="button" className="feedback-v3-campaign-open" onClick={() => toggleCampaign(campaign.key)} aria-expanded={expanded}>
                        <div className="feedback-v3-campaign-title">
                            <span className="feedback-v3-campaign-icon"><SectionIcon type="campaign" /></span>
                            <div>
                                <h3>{campaign.campaignName}</h3>
                                <small>{campaign.items.length} participants</small>
                            </div>
                        </div>
                    </button>
                    <div className="feedback-v3-campaign-stat"><span>Forms in this campaign</span><strong>{groups.length || 1}</strong></div>
                    <div className="feedback-v3-campaign-stat"><span>Campaign average score</span><strong className={!campaignScoreVisible ? 'is-hidden-score' : ''}>{campaignScoreVisible ? scoreText(averageScore(campaign.items)) : HIDDEN_SCORE_TEXT}</strong></div>
                    {renderScoreToggle(campaignScoreKey, campaignScoreVisible, `campaign average for ${campaign.campaignName}`)}
                    <button type="button" className="feedback-v3-campaign-collapse" onClick={() => toggleCampaign(campaign.key)} aria-label={`${expanded ? 'Collapse' : 'Expand'} ${campaign.campaignName}`}><ChevronIcon open={expanded} /></button>
                </div>
                {expanded ? (
                    <div className="feedback-v3-campaign-body">
                        <div className="feedback-v3-score-note">Scores stay hidden until you choose to reveal them.</div>
                        <div className="feedback-v3-result-stack">
                            {groups.map((group) => renderRelationshipRow(campaign, group))}
                        </div>
                    </div>
                ) : null}
            </article>
        );
    };

    return (
        <div className="feedback-v3-page">
            <div className="feedback-v3-switch" aria-label="Switch feedback workspace">
                <button type="button" className={activeView === 'TO_GIVE' ? 'active' : ''} onClick={() => setActiveView('TO_GIVE')}>To Give</button>
                <button type="button" className={activeView === 'ABOUT_ME' ? 'active' : ''} onClick={() => setActiveView('ABOUT_ME')}>About Me</button>
            </div>

            {activeView === 'TO_GIVE' ? (
                <section className="feedback-v3-panel feedback-v3-assigned-panel">
                    <div className="feedback-v3-panel-head">
                        <div className="feedback-v3-leaf"><SectionIcon type="bolt" /></div>
                        <div>
                            <h1>Assigned feedback</h1>
                            <p>Complete the feedback requests assigned to you.</p>
                        </div>
                    </div>

                    <div className="feedback-v3-filter-bar">
                        <input type="search" placeholder="Search by employee or campaign" value={taskSearch} onChange={(event) => setTaskSearch(event.target.value)} />
                        <select value={taskCampaignFilter} onChange={(event) => setTaskCampaignFilter(event.target.value)}>
                            <option value="ALL">All campaigns</option>
                            {taskCampaignOptions.map((campaign) => <option key={campaign} value={campaign}>{campaign}</option>)}
                        </select>
                        <select value={taskRelationshipFilter} onChange={(event) => setTaskRelationshipFilter(event.target.value as RelationshipFilter)}>
                            <option value="ALL">All relationships</option>
                            <option value="MANAGER">Manager</option>
                            <option value="PEER">Peer</option>
                            <option value="SUBORDINATE">Direct report</option>
                            <option value="SELF">Self</option>
                            <option value="PROJECT_STAKEHOLDER">Project stakeholder</option>
                        </select>
                        <select value={taskStatusFilter} onChange={(event) => setTaskStatusFilter(event.target.value as TaskStatusFilter)}>
                            <option value="ALL">All statuses</option>
                            <option value="PENDING">Not started</option>
                            <option value="IN_PROGRESS">Draft saved</option>
                            <option value="SUBMITTED">Completed</option>
                        </select>
                    </div>

                    <div className="feedback-v3-summary-grid">
                        <button type="button" className="info" onClick={() => setTaskStatusFilter('PENDING')}><span><SectionIcon type="start" /></span><strong>{taskStats.toStart}</strong><small>To start</small></button>
                        <button type="button" className="warning" onClick={() => setTaskStatusFilter('ALL')}><span><SectionIcon type="clock" /></span><strong>{taskStats.dueSoon}</strong><small>Due soon</small></button>
                        <button type="button" className="draft" onClick={() => setTaskStatusFilter('IN_PROGRESS')}><span><SectionIcon type="draft" /></span><strong>{taskStats.drafts}</strong><small>Drafts saved</small></button>
                        <button type="button" className="success" onClick={() => setTaskStatusFilter('SUBMITTED')}><span><SectionIcon type="check" /></span><strong>{taskStats.completed}</strong><small>Completed</small></button>
                    </div>

                    {tasksQuery.isLoading ? <div className="feedback-v3-empty-row">Loading assigned feedback...</div> : null}
                    {tasksQuery.error instanceof Error ? <div className="feedback-evaluator-banner error">{tasksQuery.error.message}</div> : null}
                    {!tasksQuery.isLoading && !tasksQuery.error ? <div className="feedback-v3-accordion-stack">{taskGroups.map(renderTaskGroup)}</div> : null}
                </section>
            ) : (
                <section className="feedback-v3-panel feedback-v3-about-panel">
                    <div className="feedback-v3-panel-head">
                        <div className="feedback-v3-leaf"><SectionIcon type="bolt" /></div>
                        <div>
                            <h1>Feedback about you</h1>
                            <p>Open a campaign and choose a form to explore published feedback.</p>
                        </div>
                    </div>

                    {dashboardQuery.isLoading ? <div className="feedback-v3-empty-row">Loading published feedback...</div> : null}
                    {dashboardQuery.error instanceof Error ? <div className="feedback-evaluator-banner error">{dashboardQuery.error.message}</div> : null}
                    {!dashboardQuery.isLoading && !dashboardQuery.error && campaignGroups.length === 0 ? (
                        <div className="feedback-v3-empty-row">No published feedback is available yet.</div>
                    ) : null}
                    {!dashboardQuery.isLoading && !dashboardQuery.error && campaignGroups.length > 0 ? (
                        <div className="feedback-v3-campaign-list">
                            {campaignGroups.map(renderCampaign)}
                            {selectedCampaignKey ? (
                                <div className="feedback-v3-notes-card">
                                    <div>
                                        <strong>My notes</strong>
                                        <span>Capture your reflections and next steps.</span>
                                    </div>
                                    <textarea
                                        value={privateNotes[selectedCampaignKey] ?? ''}
                                        onChange={(event) => updatePrivateNote(selectedCampaignKey, event.target.value)}
                                        placeholder="Write private notes for this campaign..."
                                    />
                                    <button type="button" onClick={() => {
                                        const campaign = campaignGroups.find((group) => group.key === selectedCampaignKey);
                                        if (campaign) exportCampaign(campaign);
                                    }}>Export this campaign</button>
                                </div>
                            ) : null}
                        </div>
                    ) : null}
                </section>
            )}
        </div>
    );
};

export default EmployeeFeedbackDashboardPage;
