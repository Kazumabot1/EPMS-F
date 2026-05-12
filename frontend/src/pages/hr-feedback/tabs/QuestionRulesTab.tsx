import { useEffect, useMemo, useState } from 'react';
import '../hr-feedback-dashboard.css';
import {
    hrFeedbackApi,
    type QuestionBankItem,
    type QuestionRuleItem,
    type QuestionRulePayload,
} from '../../../api/hrFeedbackApi';
import { feedbackCampaignApi } from '../../../api/feedbackCampaignApi';
import { positionService } from '../../../services/positionService';
import type { FeedbackDepartmentOption } from '../../../types/feedbackCampaign';
import type { PositionResponse } from '../../../types/position';
import {
    COMPETENCY_OPTIONS,
    EVALUATOR_ROLE_OPTIONS,
    LEVEL_OPTIONS,
    SECTION_OPTIONS,
    findRuleConflictIds,
    formatLevelRange,
    getCompetencyLabel,
    getNextDisplayOrder,
    getRuleEffectiveStatus,
    getRoleLabel,
    getRoleShort,
    getSectionLabel,
    normalizeText,
    type QuestionRuleRole,
} from './feedbackQuestionConfig.ts';

type RuleDrawerMode = 'create' | 'edit';
type RuleRole = QuestionRuleRole;

interface RuleFormState {
    id?: number | null;
    questionVersionId: number | '';
    targetLevelMinRank: number;
    targetLevelMaxRank: number;
    evaluatorRoles: RuleRole[];
    sectionCode: string;
    displayOrder: string;
    targetDepartmentId: number | '';
    targetPositionId: number | '';
    active: boolean;
    advancedOpen: boolean;
}

const PAGE_SIZE_OPTIONS = [10, 25, 50];

const emptyRuleForm = (questionVersionId: number | '' = ''): RuleFormState => ({
    id: null,
    questionVersionId,
    targetLevelMinRank: 1,
    targetLevelMaxRank: 9,
    evaluatorRoles: [],
    sectionCode: 'CORE_BEHAVIOR',
    displayOrder: '',
    targetDepartmentId: '',
    targetPositionId: '',
    active: true,
    advancedOpen: false,
});

const HelpTip = ({ text }: { text: string }) => (
    <span className="hfd-help-tip" tabIndex={0} aria-label={text}>
    ?
    <span className="hfd-help-popover" role="tooltip">{text}</span>
  </span>
);

const RuleStat = ({ icon, label, value, note, tone }: { icon: string; label: string; value: number; note: string; tone: string }) => (
    <div className={`hfdq-stat-card ${tone}`}>
        <span className="hfdq-stat-icon"><i className={icon} /></span>
        <div>
            <small>{label}</small>
            <strong>{value}</strong>
            <em>{note}</em>
        </div>
    </div>
);

const toNumberOrNull = (value: number | '') => (value === '' ? null : Number(value));

export default function QuestionRulesTab() {
    const [questions, setQuestions] = useState<QuestionBankItem[]>([]);
    const [rules, setRules] = useState<QuestionRuleItem[]>([]);
    const [departments, setDepartments] = useState<FeedbackDepartmentOption[]>([]);
    const [positions, setPositions] = useState<PositionResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [drawerMode, setDrawerMode] = useState<RuleDrawerMode>('create');
    const [form, setForm] = useState<RuleFormState>(emptyRuleForm());

    const [search, setSearch] = useState('');
    const [competencyFilter, setCompetencyFilter] = useState('ALL');
    const [roleFilter, setRoleFilter] = useState('ALL');
    const [levelFilter, setLevelFilter] = useState('ALL');
    const [sectionFilter, setSectionFilter] = useState('ALL');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    const activeQuestions = useMemo(
        () => questions.filter(question => question.status === 'ACTIVE' && question.activeVersionId),
        [questions],
    );

    const selectedQuestion = activeQuestions.find(question => question.activeVersionId === form.questionVersionId) ?? null;
    const competencyOptions = useMemo(() => {
        const byValue = new Map<string, { value: string; label: string }>();
        COMPETENCY_OPTIONS.forEach(option => byValue.set(option.value, option));
        [...questions, ...rules].forEach(item => {
            const code = item.competencyCode;
            if (code && !byValue.has(code)) {
                byValue.set(code, { value: code, label: getCompetencyLabel(code) });
            }
        });
        return [...byValue.values()].sort((a, b) => a.label.localeCompare(b.label));
    }, [questions, rules]);
    const selectedSection = SECTION_OPTIONS.find(section => section.code === form.sectionCode) ?? SECTION_OPTIONS[0];

    const loadAll = async () => {
        setLoading(true);
        setError('');
        try {
            const [loadedQuestions, loadedRules, loadedDepartments, loadedPositions] = await Promise.all([
                hrFeedbackApi.getQuestionBank(),
                hrFeedbackApi.getQuestionRules(),
                feedbackCampaignApi.getDepartments().catch(() => []),
                positionService.getPositions().catch(() => []),
            ]);
            setQuestions(loadedQuestions);
            setRules(loadedRules);
            setDepartments(loadedDepartments);
            setPositions(loadedPositions);
            if (!form.questionVersionId && loadedQuestions[0]?.activeVersionId) {
                setForm(current => ({ ...current, questionVersionId: loadedQuestions[0].activeVersionId ?? '' }));
            }
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to load question rules.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadAll();
    }, []);

    const resetMessages = () => {
        setError('');
        setSuccess('');
    };

    const patchForm = (patch: Partial<RuleFormState>) => setForm(current => ({ ...current, ...patch }));

    const openCreateDrawer = () => {
        resetMessages();
        setDrawerMode('create');
        setForm(emptyRuleForm(activeQuestions[0]?.activeVersionId ?? ''));
        setDrawerOpen(true);
    };

    const openEditDrawer = (rule: QuestionRuleItem) => {
        resetMessages();
        setDrawerMode('edit');
        setForm({
            id: rule.id,
            questionVersionId: rule.questionVersionId,
            targetLevelMinRank: rule.targetLevelMinRank,
            targetLevelMaxRank: rule.targetLevelMaxRank,
            evaluatorRoles: EVALUATOR_ROLE_OPTIONS.some(option => option.value === rule.evaluatorRelationshipType)
                ? [rule.evaluatorRelationshipType as RuleRole]
                : [],
            sectionCode: rule.sectionCode || 'CORE_BEHAVIOR',
            displayOrder: String(rule.displayOrder ?? ''),
            targetDepartmentId: rule.targetDepartmentId ?? '',
            targetPositionId: rule.targetPositionId ?? '',
            active: rule.active,
            advancedOpen: Boolean(rule.targetDepartmentId || rule.targetPositionId),
        });
        setDrawerOpen(true);
    };

    const closeDrawer = () => {
        if (busy) return;
        setDrawerOpen(false);
        setForm(emptyRuleForm(activeQuestions[0]?.activeVersionId ?? ''));
    };

    const toggleRole = (role: RuleRole) => {
        if (drawerMode === 'edit') return;
        setForm(current => {
            const exists = current.evaluatorRoles.includes(role);
            return {
                ...current,
                evaluatorRoles: exists
                    ? current.evaluatorRoles.filter(item => item !== role)
                    : [...current.evaluatorRoles, role],
            };
        });
    };

    const selectAllRoles = () => {
        if (drawerMode === 'edit') return;
        setForm(current => ({
            ...current,
            evaluatorRoles: current.evaluatorRoles.length === EVALUATOR_ROLE_OPTIONS.length
                ? []
                : EVALUATOR_ROLE_OPTIONS.map(option => option.value),
        }));
    };

    const buildPayload = (role?: string): QuestionRulePayload => {
        const section = SECTION_OPTIONS.find(item => item.code === form.sectionCode) ?? SECTION_OPTIONS[0];
        const displayOrder = Number(form.displayOrder) || getNextDisplayOrder(rules, section.code);
        return {
            questionVersionId: Number(form.questionVersionId),
            targetLevelMinRank: form.targetLevelMinRank,
            targetLevelMaxRank: form.targetLevelMaxRank,
            targetPositionId: toNumberOrNull(form.targetPositionId),
            targetDepartmentId: toNumberOrNull(form.targetDepartmentId),
            evaluatorRelationshipType: role ?? form.evaluatorRoles[0],
            evaluatorRelationshipTypes: role ? [role] : form.evaluatorRoles,
            sectionCode: section.code,
            sectionTitle: section.title,
            sectionOrder: section.order,
            displayOrder,
            requiredOverride: null,
            weightOverride: null,
            rulePriority: 100,
            active: form.active,
        };
    };

    const saveRule = async () => {
        resetMessages();
        if (!form.questionVersionId) {
            setError('Select a question before saving the rule.');
            return;
        }
        if (form.targetLevelMinRank > form.targetLevelMaxRank) {
            setError('From level cannot be greater than To level.');
            return;
        }
        if (form.evaluatorRoles.length === 0) {
            setError('Select at least one evaluator role.');
            return;
        }
        if (drawerMode === 'edit' && form.evaluatorRoles.length !== 1) {
            setError('Edit one evaluator role at a time. Create a new rule for additional roles.');
            return;
        }
        if (form.displayOrder && (Number(form.displayOrder) <= 0 || !Number.isFinite(Number(form.displayOrder)))) {
            setError('Question order must be a positive number, or leave it blank to add to the end.');
            return;
        }

        setBusy(true);
        try {
            if (form.id) {
                await hrFeedbackApi.updateQuestionRule(form.id, buildPayload(form.evaluatorRoles[0]));
                setSuccess('Rule updated. Active campaign snapshots remain unchanged.');
            } else {
                await hrFeedbackApi.createQuestionRule(buildPayload());
                setSuccess(`${form.evaluatorRoles.length} rule${form.evaluatorRoles.length > 1 ? 's' : ''} created.`);
            }
            closeDrawer();
            await loadAll();
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to save rule.');
        } finally {
            setBusy(false);
        }
    };

    const deactivateRule = async (rule: QuestionRuleItem) => {
        resetMessages();
        setBusy(true);
        try {
            await hrFeedbackApi.deactivateQuestionRule(rule.id);
            setSuccess('Rule deactivated. Existing campaign snapshots were not changed.');
            await loadAll();
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to deactivate rule.');
        } finally {
            setBusy(false);
        }
    };

    const activateRule = async (rule: QuestionRuleItem) => {
        resetMessages();
        setBusy(true);
        try {
            await hrFeedbackApi.activateQuestionRule(rule.id);
            setSuccess('Rule activated. It will be used in new previews and future campaign snapshots.');
            await loadAll();
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to activate rule.');
        } finally {
            setBusy(false);
        }
    };

    const getDepartmentName = (id?: number | null) => {
        if (!id) return 'All departments';
        return departments.find(department => department.id === id)?.name ?? `Department #${id}`;
    };

    const getPositionName = (id?: number | null) => {
        if (!id) return 'All positions';
        return positions.find(position => position.id === id)?.positionTitle ?? `Position #${id}`;
    };

    const conflictIds = useMemo(() => findRuleConflictIds(rules), [rules]);

    const inactiveQuestionActiveRuleCount = useMemo(
        () => rules.filter(rule => rule.active && rule.questionStatus && rule.questionStatus !== 'ACTIVE').length,
        [rules],
    );

    const stats = useMemo(() => {
        const active = rules.filter(rule => rule.active).length;
        const levelSpecific = rules.filter(rule => rule.targetLevelMinRank !== 1 || rule.targetLevelMaxRank !== 9).length;
        const multiRoleGroups = new Map<string, Set<string>>();
        rules.forEach(rule => {
            const key = `${rule.questionVersionId}-${rule.targetLevelMinRank}-${rule.targetLevelMaxRank}-${rule.sectionCode}-${rule.targetDepartmentId ?? 'all'}-${rule.targetPositionId ?? 'all'}`;
            if (!multiRoleGroups.has(key)) multiRoleGroups.set(key, new Set());
            multiRoleGroups.get(key)?.add(String(rule.evaluatorRelationshipType));
        });
        const multiRole = [...multiRoleGroups.values()].filter(set => set.size > 1).length;
        const conflicts = conflictIds.size;
        return { active, levelSpecific, multiRole, conflicts };
    }, [conflictIds, rules]);

    const filteredRules = useMemo(() => {
        const query = normalizeText(search);
        return rules.filter(rule => {
            const matchesSearch = !query || [rule.questionCode, rule.questionText, rule.competencyCode, rule.sectionTitle]
                .some(value => normalizeText(value).includes(query));
            const matchesCompetency = competencyFilter === 'ALL' || rule.competencyCode === competencyFilter;
            const matchesRole = roleFilter === 'ALL' || rule.evaluatorRelationshipType === roleFilter;
            const matchesLevel = levelFilter === 'ALL' || (rule.targetLevelMinRank <= Number(levelFilter) && rule.targetLevelMaxRank >= Number(levelFilter));
            const matchesSection = sectionFilter === 'ALL' || rule.sectionCode === sectionFilter;
            const matchesStatus = statusFilter === 'ALL' || (statusFilter === 'ACTIVE' ? rule.active : !rule.active);
            return matchesSearch && matchesCompetency && matchesRole && matchesLevel && matchesSection && matchesStatus;
        });
    }, [competencyFilter, levelFilter, roleFilter, rules, search, sectionFilter, statusFilter]);

    useEffect(() => {
        setPage(1);
    }, [search, competencyFilter, roleFilter, levelFilter, sectionFilter, statusFilter, pageSize]);

    const totalPages = Math.max(1, Math.ceil(filteredRules.length / pageSize));
    const currentPage = Math.min(page, totalPages);
    const pagedRules = filteredRules.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    const clearFilters = () => {
        setSearch('');
        setCompetencyFilter('ALL');
        setRoleFilter('ALL');
        setLevelFilter('ALL');
        setSectionFilter('ALL');
        setStatusFilter('ALL');
    };

    return (
        <div className="hfdq-page">
            <div className="hfdq-page-head">
                <div>
                    <p className="hfdq-breadcrumb"><i className="bi bi-house" /> 360 Feedback / Question Rules</p>
                    <h2>Question Rules</h2>
                    <p>Control which questions appear for each employee level, evaluator role, section, department, or position.</p>
                </div>
                <div className="hfdq-actions">
                    <button className="hfd-btn hfd-btn-secondary" onClick={loadAll} disabled={loading || busy}><i className="bi bi-arrow-clockwise" /> Refresh</button>
                    <button className="hfd-btn hfd-btn-primary" onClick={openCreateDrawer}><i className="bi bi-plus-lg" /> Create Rule</button>
                </div>
            </div>

            {error && <div className="hfd-alert hfd-alert-error"><i className="bi bi-exclamation-triangle" />{error}</div>}
            {success && <div className="hfd-alert hfd-alert-success"><i className="bi bi-check-circle" />{success}</div>}

            <section className="hfdq-hero hfdq-rules-hero">
                <div>
                    <span className="hfdq-kicker">Controlled targeting</span>
                    <h3>Target the right questions to the right people.</h3>
                    <p>Create rules that decide which evaluators see each question based on employee level, evaluator role, and optional department or position targeting.</p>
                </div>
                <div className="hfdq-abstract-art target" aria-hidden="true">
                    <span className="shape orb" />
                    <span className="shape card" />
                    <span className="shape line one" />
                    <span className="shape line two" />
                    <span className="shape target-ring" />
                    <span className="shape target-dot" />
                </div>
            </section>

            <div className="hfdq-stats-grid">
                <RuleStat icon="bi bi-shield-check" label="Active Rules" value={stats.active} note="Used for new previews" tone="blue" />
                <RuleStat icon="bi bi-layers" label="Level-specific Rules" value={stats.levelSpecific} note="Limited to selected levels" tone="purple" />
                <RuleStat icon="bi bi-people" label="Multi-role Groups" value={stats.multiRole} note="Same question across roles" tone="green" />
                <RuleStat icon="bi bi-exclamation-triangle" label="Rule Conflicts" value={stats.conflicts} note={stats.conflicts ? 'Review overlap warnings' : 'No conflicts detected'} tone="orange" />
            </div>

            {(conflictIds.size > 0 || inactiveQuestionActiveRuleCount > 0) && (
                <div className="hfdq-warning-stack">
                    {conflictIds.size > 0 && (
                        <div className="hfd-alert hfd-alert-warning">
                            <i className="bi bi-exclamation-triangle" />
                            Some active rules overlap for the same question, evaluator role, level range, and targeting scope. Preview will deduplicate by question code, but HR should review the highlighted rules.
                        </div>
                    )}
                    {inactiveQuestionActiveRuleCount > 0 && (
                        <div className="hfd-alert hfd-alert-warning">
                            <i className="bi bi-pause-circle" />
                            {inactiveQuestionActiveRuleCount} active rule{inactiveQuestionActiveRuleCount === 1 ? '' : 's'} belong to inactive questions and will not be used until the question is active again.
                        </div>
                    )}
                </div>
            )}

            <section className="hfdq-table-card">
                <div className="hfdq-filter-grid question-rules">
                    <label>
                        <span>Search Question</span>
                        <input className="hfd-input" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search rules..." />
                    </label>
                    <label>
                        <span>Competency</span>
                        <select className="hfd-input" value={competencyFilter} onChange={e => setCompetencyFilter(e.target.value)}>
                            <option value="ALL">All competencies</option>
                            {competencyOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                        </select>
                    </label>
                    <label>
                        <span>Evaluator Role</span>
                        <select className="hfd-input" value={roleFilter} onChange={e => setRoleFilter(e.target.value)}>
                            <option value="ALL">All roles</option>
                            {EVALUATOR_ROLE_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                        </select>
                    </label>
                    <label>
                        <span>Employee Level</span>
                        <select className="hfd-input" value={levelFilter} onChange={e => setLevelFilter(e.target.value)}>
                            <option value="ALL">All levels</option>
                            {LEVEL_OPTIONS.map(level => <option key={level.code} value={level.rank}>{level.code}</option>)}
                        </select>
                    </label>
                    <label>
                        <span>Section</span>
                        <select className="hfd-input" value={sectionFilter} onChange={e => setSectionFilter(e.target.value)}>
                            <option value="ALL">All sections</option>
                            {SECTION_OPTIONS.map(section => <option key={section.code} value={section.code}>{section.title}</option>)}
                        </select>
                    </label>
                    <label>
                        <span>Status</span>
                        <select className="hfd-input" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                            <option value="ALL">All status</option>
                            <option value="ACTIVE">Active</option>
                            <option value="INACTIVE">Inactive</option>
                        </select>
                    </label>
                    <button className="hfdq-clear" type="button" onClick={clearFilters}>Clear</button>
                </div>

                {loading ? (
                    <div className="hfd-spinner"><i className="bi bi-arrow-repeat" /> Loading question rules...</div>
                ) : (
                    <>
                        <div className="hfd-table-wrap hfdq-modern-table-wrap">
                            <table className="hfd-table hfdq-modern-table">
                                <thead>
                                <tr>
                                    <th>Question</th>
                                    <th>Competency</th>
                                    <th>Applies To Levels</th>
                                    <th>Evaluator Role</th>
                                    <th>Section</th>
                                    <th>Targeting</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                                </thead>
                                <tbody>
                                {pagedRules.length === 0 ? (
                                    <tr><td colSpan={8}><div className="hfdq-empty-row">No rules match the selected filters.</div></td></tr>
                                ) : pagedRules.map(rule => {
                                    const effectiveStatus = getRuleEffectiveStatus(rule);
                                    const hasConflict = conflictIds.has(rule.id);
                                    return (
                                        <tr key={rule.id} className={hasConflict ? 'hfdq-conflict-row' : undefined}>
                                            <td className="hfdq-question-cell"><strong>{rule.questionCode}</strong>{hasConflict && <span className="hfdq-mini-warning">Overlap</span>}<br /><span>{rule.questionText}</span></td>
                                            <td>{getCompetencyLabel(rule.competencyCode)}</td>
                                            <td>{formatLevelRange(rule)}</td>
                                            <td><span className="hfdq-role-badge" title={getRoleLabel(String(rule.evaluatorRelationshipType))}>{getRoleShort(String(rule.evaluatorRelationshipType))}</span></td>
                                            <td>{getSectionLabel(rule.sectionCode, rule.sectionTitle)}</td>
                                            <td>
                                                <span className="hfdq-targeting-text">{getDepartmentName(rule.targetDepartmentId)}</span>
                                                <small>{getPositionName(rule.targetPositionId)}</small>
                                            </td>
                                            <td>
                                                <span className={`hfd-status-badge ${effectiveStatus.tone}`}>{effectiveStatus.label}</span>
                                                <small>{effectiveStatus.note}</small>
                                            </td>
                                            <td>
                                                <div className="hfdq-row-actions">
                                                    <button className="hfd-btn hfd-btn-secondary hfd-btn-sm" onClick={() => openEditDrawer(rule)} disabled={busy}>Edit</button>
                                                    {rule.active ? (
                                                        <button className="hfd-btn hfd-btn-danger hfd-btn-sm" onClick={() => deactivateRule(rule)} disabled={busy}>Deactivate</button>
                                                    ) : (
                                                        <button className="hfd-btn hfd-btn-primary hfd-btn-sm" onClick={() => activateRule(rule)} disabled={busy}>Activate</button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                                </tbody>
                            </table>
                        </div>
                        <div className="hfdq-pagination">
                            <span>Showing {filteredRules.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, filteredRules.length)} of {filteredRules.length} rules</span>
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
                    <aside className="hfdq-drawer hfdq-rule-drawer">
                        <div className="hfdq-drawer-head">
                            <div>
                                <p>{drawerMode === 'create' ? 'Define targeting rule' : 'Edit targeting rule'}</p>
                                <h3>{drawerMode === 'create' ? 'Create Rule' : 'Update Rule'}</h3>
                            </div>
                            <button className="hfdq-icon-button" onClick={closeDrawer} disabled={busy} aria-label="Close"><i className="bi bi-x-lg" /></button>
                        </div>

                        <div className="hfdq-step-strip">
                            <span className="active">1 Define Rule</span>
                            <span>2 Targeting</span>
                            <span>3 Review</span>
                        </div>

                        <div className="hfdq-drawer-body">
                            <label className="hfd-field">
                                <span className="hfd-label">Select Question <span>*</span> <HelpTip text="Choose the master question that this rule will place into the generated form." /></span>
                                <select className="hfd-input" value={form.questionVersionId} onChange={e => patchForm({ questionVersionId: Number(e.target.value) || '' })} disabled={drawerMode === 'edit'}>
                                    <option value="">Select question</option>
                                    {activeQuestions.map(question => <option key={question.id} value={question.activeVersionId ?? ''}>{question.questionCode} · {getCompetencyLabel(question.competencyCode)}</option>)}
                                </select>
                                {selectedQuestion && <small className="hfd-muted">{selectedQuestion.questionText}</small>}
                            </label>

                            <div className="hfd-grid-2">
                                <label className="hfd-field">
                                    <span className="hfd-label">Employee Levels From <span>*</span></span>
                                    <select className="hfd-input" value={form.targetLevelMinRank} onChange={e => patchForm({ targetLevelMinRank: Number(e.target.value) })}>
                                        {LEVEL_OPTIONS.map(level => <option key={level.code} value={level.rank}>{level.label}</option>)}
                                    </select>
                                </label>
                                <label className="hfd-field">
                                    <span className="hfd-label">To <span>*</span></span>
                                    <select className="hfd-input" value={form.targetLevelMaxRank} onChange={e => patchForm({ targetLevelMaxRank: Number(e.target.value) })}>
                                        {LEVEL_OPTIONS.map(level => <option key={level.code} value={level.rank}>{level.label}</option>)}
                                    </select>
                                </label>
                            </div>

                            <div className="hfd-field">
                                <div className="hfd-label hfdq-field-title">Evaluator Roles <span>*</span> <HelpTip text="Choose who will answer this question. Selecting multiple roles creates one controlled rule per role." /></div>
                                <div className="hfdq-role-panel">
                                    {drawerMode === 'create' && <button type="button" className="hfdq-select-all" onClick={selectAllRoles}>{form.evaluatorRoles.length === EVALUATOR_ROLE_OPTIONS.length ? 'Clear all roles' : 'Select all roles'}</button>}
                                    {EVALUATOR_ROLE_OPTIONS.map(option => (
                                        <label key={option.value} className="hfdq-role-check" title={option.help}>
                                            <input type="checkbox" checked={form.evaluatorRoles.includes(option.value)} onChange={() => toggleRole(option.value)} disabled={drawerMode === 'edit'} />
                                            <span>{option.label}</span>
                                        </label>
                                    ))}
                                </div>
                                {form.evaluatorRoles.length === 0 && <small className="hfd-error-msg">Select at least one evaluator role.</small>}
                                {drawerMode === 'edit' && <small className="hfd-muted">Role is locked during edit. Create a new rule if this question should apply to another evaluator role.</small>}
                            </div>

                            <label className="hfd-field">
                                <span className="hfd-label">Section <span>*</span></span>
                                <select className="hfd-input" value={form.sectionCode} onChange={e => patchForm({ sectionCode: e.target.value })}>
                                    {SECTION_OPTIONS.map(section => <option key={section.code} value={section.code}>{section.title}</option>)}
                                </select>
                                <small className="hfd-muted">{selectedSection.description}</small>
                            </label>

                            <label className="hfd-field">
                                <span className="hfd-label">Question Order <HelpTip text="Optional. Leave blank to add this question to the end of the selected section." /></span>
                                <input className="hfd-input" type="number" min="1" value={form.displayOrder} onChange={e => patchForm({ displayOrder: e.target.value })} placeholder="Auto: add to end" />
                            </label>

                            <label className="hfd-field">
                                <span className="hfd-label">Rule Status</span>
                                <select className="hfd-input" value={form.active ? 'ACTIVE' : 'INACTIVE'} onChange={e => patchForm({ active: e.target.value === 'ACTIVE' })}>
                                    <option value="ACTIVE">Active</option>
                                    <option value="INACTIVE">Inactive</option>
                                </select>
                                <small className="hfd-muted">Inactive rules are kept for audit/history but are not used in preview or future campaign snapshots.</small>
                            </label>

                            <div className="hfdq-accordion">
                                <button type="button" onClick={() => patchForm({ advancedOpen: !form.advancedOpen })}>
                                    Advanced Targeting <small>Optional</small>
                                    <i className={`bi ${form.advancedOpen ? 'bi-chevron-up' : 'bi-chevron-down'}`} />
                                </button>
                                {form.advancedOpen && (
                                    <div className="hfdq-accordion-body">
                                        <label className="hfd-field">
                                            <span className="hfd-label">Specific Department</span>
                                            <select className="hfd-input" value={form.targetDepartmentId} onChange={e => patchForm({ targetDepartmentId: e.target.value ? Number(e.target.value) : '' })}>
                                                <option value="">All departments</option>
                                                {departments.map(department => <option key={department.id} value={department.id}>{department.name}</option>)}
                                            </select>
                                        </label>
                                        <label className="hfd-field">
                                            <span className="hfd-label">Specific Position</span>
                                            <select className="hfd-input" value={form.targetPositionId} onChange={e => patchForm({ targetPositionId: e.target.value ? Number(e.target.value) : '' })}>
                                                <option value="">All positions</option>
                                                {positions.map(position => <option key={position.id} value={position.id}>{position.positionTitle} {position.levelCode ? `(${position.levelCode})` : ''}</option>)}
                                            </select>
                                        </label>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="hfdq-drawer-actions">
                            <button className="hfd-btn hfd-btn-secondary" onClick={closeDrawer} disabled={busy}>Cancel</button>
                            <button className="hfd-btn hfd-btn-primary" onClick={saveRule} disabled={busy}>{drawerMode === 'create' ? 'Create Rule' : 'Save Rule'}</button>
                        </div>
                    </aside>
                </div>
            )}
        </div>
    );
}
