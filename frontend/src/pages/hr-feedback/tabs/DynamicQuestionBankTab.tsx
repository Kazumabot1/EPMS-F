import { useEffect, useMemo, useState } from 'react';
import '../hr-feedback-dashboard.css';
import {
    hrFeedbackApi,
    type QuestionBankItem,
    type QuestionBankPayload,
} from '../../../api/hrFeedbackApi';
import {
    COMPETENCY_OPTIONS,
    RESPONSE_TYPE_OPTIONS,
    getCompetencyLabel,
    getResponseTypeLabel,
    getScoringCopy,
    isRatingResponseType,
    normalizeCompetencyCode,
    normalizeText,
} from './feedbackQuestionConfig.ts';

type QuestionDrawerMode = 'create' | 'edit';

type QuestionFormState = Omit<QuestionBankPayload, 'questionCode' | 'weight'> & {
    id?: number | null;
    questionCode?: string;
    weight: number;
    useCustomWeight: boolean;
};

const PAGE_SIZE_OPTIONS = [10, 25, 50];

const emptyQuestionForm = (): QuestionFormState => ({
    id: null,
    questionCode: '',
    competencyCode: '',
    questionText: '',
    responseType: 'RATING_WITH_COMMENT',
    ratingScaleId: null,
    weight: 1,
    useCustomWeight: false,
    required: true,
    helpText: '',
    status: 'ACTIVE',
});

const HelpTip = ({ text }: { text: string }) => (
    <span className="hfd-help-tip" tabIndex={0} aria-label={text}>
    ?
    <span className="hfd-help-popover" role="tooltip">{text}</span>
  </span>
);

const StatCard = ({ icon, label, value, note, tone }: { icon: string; label: string; value: number | string; note: string; tone: string }) => (
    <div className={`hfdq-stat-card ${tone}`}>
        <span className="hfdq-stat-icon"><i className={icon} /></span>
        <div>
            <small>{label}</small>
            <strong>{value}</strong>
            <em>{note}</em>
        </div>
    </div>
);

const responseTypeFilterOptions = ['ALL', ...RESPONSE_TYPE_OPTIONS.map(option => option.value)];
const scoringFilterOptions = ['ALL', 'SCORED', 'NON_SCORED', 'HR_REVIEW'];
const statusFilterOptions = ['ALL', 'ACTIVE', 'INACTIVE'];

export default function DynamicQuestionBankTab() {
    const [questions, setQuestions] = useState<QuestionBankItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [drawerMode, setDrawerMode] = useState<QuestionDrawerMode>('create');
    const [form, setForm] = useState<QuestionFormState>(emptyQuestionForm);

    const [search, setSearch] = useState('');
    const [competencyFilter, setCompetencyFilter] = useState('ALL');
    const [responseFilter, setResponseFilter] = useState('ALL');
    const [scoringFilter, setScoringFilter] = useState('ALL');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    const loadQuestions = async () => {
        setLoading(true);
        setError('');
        try {
            const loaded = await hrFeedbackApi.getQuestionBank();
            setQuestions(loaded);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to load question bank.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadQuestions();
    }, []);

    const resetMessages = () => {
        setError('');
        setSuccess('');
    };

    const isRating = isRatingResponseType(form.responseType);
    const scoring = getScoringCopy(form.responseType);

    const competencyOptions = useMemo(() => {
        const byValue = new Map<string, { value: string; label: string; codePart?: string }>();
        COMPETENCY_OPTIONS.forEach(option => byValue.set(option.value, option));
        questions.forEach(question => {
            if (question.competencyCode && !byValue.has(question.competencyCode)) {
                byValue.set(question.competencyCode, {
                    value: question.competencyCode,
                    label: getCompetencyLabel(question.competencyCode),
                });
            }
        });
        if (form.competencyCode && !byValue.has(form.competencyCode)) {
            byValue.set(form.competencyCode, {
                value: form.competencyCode,
                label: getCompetencyLabel(form.competencyCode),
            });
        }
        return [...byValue.values()].sort((a, b) => a.label.localeCompare(b.label));
    }, [form.competencyCode, questions]);


    const openCreateDrawer = () => {
        resetMessages();
        setDrawerMode('create');
        setForm(emptyQuestionForm());
        setDrawerOpen(true);
    };

    const openEditDrawer = (question: QuestionBankItem) => {
        resetMessages();
        const isWeighted = isRatingResponseType(question.responseType) && Number(question.weight ?? 1) !== 1;
        setDrawerMode('edit');
        setForm({
            id: question.id,
            questionCode: question.questionCode,
            competencyCode: getCompetencyLabel(question.competencyCode),
            questionText: question.questionText,
            responseType: question.responseType || 'RATING_WITH_COMMENT',
            ratingScaleId: question.ratingScaleId ?? null,
            weight: question.weight ?? 1,
            useCustomWeight: isWeighted,
            required: question.required !== false,
            helpText: question.helpText ?? '',
            status: question.status === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE',
        });
        setDrawerOpen(true);
    };

    const closeDrawer = () => {
        if (busy) return;
        setDrawerOpen(false);
        setForm(emptyQuestionForm());
    };

    const patchForm = (patch: Partial<QuestionFormState>) => {
        setForm(current => {
            const next = { ...current, ...patch };
            if (patch.responseType && !isRatingResponseType(patch.responseType)) {
                next.useCustomWeight = false;
                next.weight = 1;
            }
            return next;
        });
    };

    const saveQuestion = async () => {
        resetMessages();
        if (!form.questionText.trim()) {
            setError('Question text is required.');
            return;
        }
        if (!form.competencyCode.trim()) {
            setError('Competency is required. Select an existing competency or type a new one.');
            return;
        }
        if (isRatingResponseType(form.responseType) && form.useCustomWeight && (!Number.isFinite(form.weight) || form.weight <= 0)) {
            setError('Custom weight must be greater than 0.');
            return;
        }

        setBusy(true);
        try {
            const payload: QuestionBankPayload = {
                questionCode: form.questionCode || undefined,
                competencyCode: normalizeCompetencyCode(form.competencyCode),
                questionText: form.questionText.trim(),
                responseType: form.responseType,
                scoringBehavior: getScoringCopy(form.responseType).kind,
                ratingScaleId: form.ratingScaleId ?? null,
                weight: isRatingResponseType(form.responseType) && form.useCustomWeight ? Number(form.weight) : 1,
                required: form.required,
                helpText: form.helpText?.trim() || '',
                status: form.status,
            };

            if (form.id) {
                await hrFeedbackApi.updateQuestionBankItem(form.id, payload);
                setSuccess('Question updated. Existing campaign snapshots will stay unchanged.');
            } else {
                await hrFeedbackApi.createQuestionBankItem(payload);
                setSuccess('Question created. Add a rule to decide who should see it.');
            }
            closeDrawer();
            await loadQuestions();
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to save question.');
        } finally {
            setBusy(false);
        }
    };

    const stats = useMemo(() => {
        const ratingQuestions = questions.filter(question => isRatingResponseType(question.responseType)).length;
        const writtenAnswers = questions.filter(question => question.responseType === 'TEXT').length;
        const inactive = questions.filter(question => question.status !== 'ACTIVE').length;
        return { total: questions.length, ratingQuestions, writtenAnswers, inactive };
    }, [questions]);

    const filteredQuestions = useMemo(() => {
        const query = normalizeText(search);
        return questions.filter(question => {
            const scoringKind = getScoringCopy(question.responseType, question.scoringBehavior).kind;
            const matchesSearch = !query || [question.questionCode, question.questionText, question.competencyCode]
                .some(value => normalizeText(value).includes(query));
            const matchesCompetency = competencyFilter === 'ALL' || question.competencyCode === competencyFilter;
            const matchesResponse = responseFilter === 'ALL' || question.responseType === responseFilter;
            const matchesScoring = scoringFilter === 'ALL' || scoringKind === scoringFilter;
            const normalizedStatus = question.status === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE';
            const matchesStatus = statusFilter === 'ALL' || normalizedStatus === statusFilter;
            return matchesSearch && matchesCompetency && matchesResponse && matchesScoring && matchesStatus;
        });
    }, [competencyFilter, questions, responseFilter, scoringFilter, search, statusFilter]);

    useEffect(() => {
        setPage(1);
    }, [search, competencyFilter, responseFilter, scoringFilter, statusFilter, pageSize]);

    const totalPages = Math.max(1, Math.ceil(filteredQuestions.length / pageSize));
    const currentPage = Math.min(page, totalPages);
    const pagedQuestions = filteredQuestions.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    const clearFilters = () => {
        setSearch('');
        setCompetencyFilter('ALL');
        setResponseFilter('ALL');
        setScoringFilter('ALL');
        setStatusFilter('ALL');
    };

    const adjustWeight = (amount: number) => {
        patchForm({ weight: Math.max(0.1, Number((Number(form.weight || 1) + amount).toFixed(1))) });
    };

    return (
        <div className="hfdq-page">
            <div className="hfdq-page-head">
                <div>
                    <p className="hfdq-breadcrumb"><i className="bi bi-house" /> 360 Feedback / Question Bank</p>
                    <h2>Question Bank</h2>
                    <p>Manage reusable feedback questions that can be used across 360 campaigns, probation reviews, and leadership assessments.</p>
                </div>
                <div className="hfdq-actions">
                    <button className="hfd-btn hfd-btn-secondary" onClick={loadQuestions} disabled={loading || busy}><i className="bi bi-arrow-clockwise" /> Refresh</button>
                    <button className="hfd-btn hfd-btn-primary" onClick={openCreateDrawer}><i className="bi bi-plus-lg" /> New Question</button>
                </div>
            </div>

            {error && <div className="hfd-alert hfd-alert-error"><i className="bi bi-exclamation-triangle" />{error}</div>}
            {success && <div className="hfd-alert hfd-alert-success"><i className="bi bi-check-circle" />{success}</div>}

            <section className="hfdq-hero hfdq-question-hero">
                <div>
                    <span className="hfdq-kicker">Reusable question library</span>
                    <h3>Thoughtful questions. Better feedback decisions.</h3>
                    <p>Create clear, reusable questions and organize them by competency and response type. Question targeting is handled separately in Question Rules.</p>
                </div>
                <div className="hfdq-abstract-art" aria-hidden="true">
                    <span className="shape orb" />
                    <span className="shape card" />
                    <span className="shape line one" />
                    <span className="shape line two" />
                    <span className="shape dot a" />
                    <span className="shape dot b" />
                </div>
            </section>

            <div className="hfdq-stats-grid">
                <StatCard icon="bi bi-journal-text" label="Total Questions" value={stats.total} note="Available in the bank" tone="blue" />
                <StatCard icon="bi bi-star" label="Rating Questions" value={stats.ratingQuestions} note="Can affect 360 score" tone="green" />
                <StatCard icon="bi bi-chat-left-text" label="Written Answer" value={stats.writtenAnswers} note="Qualitative insight only" tone="purple" />
                <StatCard icon="bi bi-pause-circle" label="Inactive" value={stats.inactive} note="Not used for new rules" tone="orange" />
            </div>

            <section className="hfdq-table-card">
                <div className="hfdq-filter-grid question-bank">
                    <label>
                        <span>Search</span>
                        <input className="hfd-input" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search questions..." />
                    </label>
                    <label>
                        <span>Competency</span>
                        <select className="hfd-input" value={competencyFilter} onChange={e => setCompetencyFilter(e.target.value)}>
                            <option value="ALL">All competencies</option>
                            {competencyOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>) }
                        </select>
                    </label>
                    <label>
                        <span>Response Type</span>
                        <select className="hfd-input" value={responseFilter} onChange={e => setResponseFilter(e.target.value)}>
                            {responseTypeFilterOptions.map(option => (
                                <option key={option} value={option}>{option === 'ALL' ? 'All types' : getResponseTypeLabel(option)}</option>
                            ))}
                        </select>
                    </label>
                    <label>
                        <span>Scoring</span>
                        <select className="hfd-input" value={scoringFilter} onChange={e => setScoringFilter(e.target.value)}>
                            {scoringFilterOptions.map(option => <option key={option} value={option}>{option === 'ALL' ? 'All scoring behavior' : getScoringCopy(option === 'SCORED' ? 'RATING' : option === 'HR_REVIEW' ? 'YES_NO' : 'TEXT').shortLabel}</option>)}
                        </select>
                    </label>
                    <label>
                        <span>Status</span>
                        <select className="hfd-input" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                            {statusFilterOptions.map(option => <option key={option} value={option}>{option === 'ALL' ? 'All status' : option}</option>)}
                        </select>
                    </label>
                    <button className="hfdq-clear" type="button" onClick={clearFilters}>Clear</button>
                </div>

                {loading ? (
                    <div className="hfd-spinner"><i className="bi bi-arrow-repeat" /> Loading question bank...</div>
                ) : (
                    <>
                        <div className="hfd-table-wrap hfdq-modern-table-wrap">
                            <table className="hfd-table hfdq-modern-table">
                                <thead>
                                <tr>
                                    <th>Code</th>
                                    <th>Question</th>
                                    <th>Competency</th>
                                    <th>Response Type</th>
                                    <th>Scoring</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                                </thead>
                                <tbody>
                                {pagedQuestions.length === 0 ? (
                                    <tr><td colSpan={7}><div className="hfdq-empty-row">No questions match the selected filters.</div></td></tr>
                                ) : pagedQuestions.map(question => {
                                    const scoreCopy = getScoringCopy(question.responseType, question.scoringBehavior);
                                    return (
                                        <tr key={question.id}>
                                            <td><strong>{question.questionCode}</strong></td>
                                            <td className="hfdq-question-cell">{question.questionText}</td>
                                            <td>{getCompetencyLabel(question.competencyCode)}</td>
                                            <td><span className={`hfdq-chip response ${question.responseType}`}>{getResponseTypeLabel(question.responseType)}</span></td>
                                            <td><span className={`hfdq-chip scoring ${scoreCopy.kind}`}>{scoreCopy.shortLabel}</span></td>
                                            <td><span className={`hfd-status-badge ${question.status === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE'}`}>{question.status === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE'}</span></td>
                                            <td>
                                                <div className="hfdq-row-actions">
                                                    <button className="hfd-btn hfd-btn-secondary hfd-btn-sm" onClick={() => openEditDrawer(question)} disabled={busy}>Edit</button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                                </tbody>
                            </table>
                        </div>
                        <div className="hfdq-pagination">
                            <span>Showing {filteredQuestions.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, filteredQuestions.length)} of {filteredQuestions.length} questions</span>
                            <div>
                                <button className="hfdq-page-btn" onClick={() => setPage(value => Math.max(1, value - 1))} disabled={currentPage <= 1}>‹</button>
                                <strong>{currentPage}</strong>
                                <span>of {totalPages}</span>
                                <button className="hfdq-page-btn" onClick={() => setPage(value => Math.min(totalPages, value + 1))} disabled={currentPage >= totalPages}>›</button>
                                <select className="hfd-input hfdq-page-size" value={pageSize} onChange={e => setPageSize(Number(e.target.value))}>
                                    {PAGE_SIZE_OPTIONS.map(size => <option key={size} value={size}>{size} per page</option>)}
                                </select>
                            </div>
                        </div>
                    </>
                )}
            </section>

            {drawerOpen && (
                <div className="hfdq-drawer-shell" role="dialog" aria-modal="true">
                    <button className="hfdq-drawer-backdrop" aria-label="Close drawer" onClick={closeDrawer} />
                    <aside className="hfdq-drawer">
                        <div className="hfdq-drawer-head">
                            <div>
                                <p>{drawerMode === 'create' ? 'Create reusable item' : 'Edit question'}</p>
                                <h3>{drawerMode === 'create' ? 'New Question' : 'Update Question'}</h3>
                            </div>
                            <button className="hfdq-icon-button" onClick={closeDrawer} disabled={busy} aria-label="Close"><i className="bi bi-x-lg" /></button>
                        </div>

                        <div className="hfdq-drawer-body">
                            {drawerMode === 'edit' && form.questionCode && (
                                <div className="hfdq-readonly-code">
                                    <span>Question Code</span>
                                    <strong>{form.questionCode}</strong>
                                    <small>Code stays stable so historical reporting remains reliable.</small>
                                </div>
                            )}

                            <label className="hfd-field">
                                <span className="hfd-label">Question Text <span>*</span> <HelpTip text="Write one clear question. Avoid combining multiple behaviors in one question." /></span>
                                <textarea className="hfd-input hfd-textarea" rows={4} maxLength={500} value={form.questionText} onChange={e => patchForm({ questionText: e.target.value })} placeholder="Example: Communicates clearly and effectively with others." />
                                <small className="hfd-muted">{form.questionText.length} / 500 characters</small>
                            </label>

                            <label className="hfd-field">
                                <span className="hfd-label">Competency <span>*</span> <HelpTip text="Type a new competency if the list does not contain the category HR needs. It will be saved with this question." /></span>
                                <input
                                    className="hfd-input"
                                    list="feedback-competency-options"
                                    value={form.competencyCode}
                                    onChange={e => patchForm({ competencyCode: e.target.value })}
                                    placeholder="Example: Communication, Coaching, Customer Focus"
                                />
                                <datalist id="feedback-competency-options">
                                    {competencyOptions.map(option => <option key={option.value} value={option.label} />)}
                                </datalist>
                                <small className="hfd-muted">Select an existing competency or type a new one. The system stores it as a clean code.</small>
                            </label>

                            <label className="hfd-field">
                                <span className="hfd-label">Response Type <span>*</span> <HelpTip text="Choose how evaluators answer. Rating questions can affect the score; written and Yes/No questions are used as supporting context." /></span>
                                <select className="hfd-input" value={form.responseType} onChange={e => patchForm({ responseType: e.target.value })}>
                                    {RESPONSE_TYPE_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                                </select>
                                <small className="hfd-muted">{RESPONSE_TYPE_OPTIONS.find(option => option.value === form.responseType)?.description}</small>
                            </label>

                            <div className={`hfdq-scoring-panel ${scoring.kind}`}>
                                <div>
                                    <strong>{scoring.label}</strong>
                                    <p>{scoring.description}</p>
                                </div>
                                <span>{scoring.shortLabel}</span>
                            </div>

                            {isRating && (
                                <div className="hfdq-weight-card">
                                    <label className="hfdq-toggle-row">
                    <span>
                      Use custom weight <HelpTip text="Optional. Weight is not a percentage. The system normalizes all scored question weights during calculation." />
                      <small>Leave off for equal weighting.</small>
                    </span>
                                        <input type="checkbox" checked={form.useCustomWeight} onChange={e => patchForm({ useCustomWeight: e.target.checked, weight: e.target.checked ? form.weight : 1 })} />
                                    </label>
                                    {form.useCustomWeight && (
                                        <div className="hfdq-stepper">
                                            <button type="button" onClick={() => adjustWeight(-0.1)}>-</button>
                                            <input type="number" min="0.1" step="0.1" value={form.weight} onChange={e => patchForm({ weight: Number(e.target.value) || 1 })} />
                                            <button type="button" onClick={() => adjustWeight(0.1)}>+</button>
                                        </div>
                                    )}
                                    <small className="hfd-muted">Example: weight 2.0 has twice the scoring impact of weight 1.0.</small>
                                </div>
                            )}

                            <label className="hfd-checkbox-label hfdq-checkline">
                                <input type="checkbox" checked={form.required} onChange={e => patchForm({ required: e.target.checked })} /> Required by default
                            </label>

                            <label className="hfd-field">
                                <span className="hfd-label">Status <span>*</span></span>
                                <select className="hfd-input" value={form.status} onChange={e => patchForm({ status: e.target.value })}>
                                    <option value="ACTIVE">Active</option>
                                    <option value="INACTIVE">Inactive</option>
                                </select>
                            </label>
                        </div>

                        <div className="hfdq-drawer-actions">
                            <button className="hfd-btn hfd-btn-secondary" onClick={closeDrawer} disabled={busy}>Cancel</button>
                            <button className="hfd-btn hfd-btn-primary" onClick={saveQuestion} disabled={busy}>{drawerMode === 'create' ? 'Create Question' : 'Save Changes'}</button>
                        </div>
                    </aside>
                </div>
            )}
        </div>
    );
}
