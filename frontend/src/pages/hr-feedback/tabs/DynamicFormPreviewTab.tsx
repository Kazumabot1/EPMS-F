import { useEffect, useMemo, useState } from 'react';
import '../hr-feedback-dashboard.css';
import {
    hrFeedbackApi,
    type DynamicFormPreview,
} from '../../../api/hrFeedbackApi';
import { feedbackCampaignApi } from '../../../api/feedbackCampaignApi';
import { positionService } from '../../../services/positionService';
import type { FeedbackDepartmentOption } from '../../../types/feedbackCampaign';
import type { PositionResponse } from '../../../types/position';
import {
    EVALUATOR_ROLE_OPTIONS,
    LEVEL_OPTIONS,
    RESPONSE_TYPE_OPTIONS,
    SECTION_OPTIONS,
    getResponseTypeLabel,
    getScoringCopy,
    getSectionLabel,
    normalizeText,
    type QuestionRuleRole,
    type ScoringKind,
} from './feedbackQuestionConfig.ts';

const LONG_FORM_THRESHOLD = 30;
const RECOMMENDED_SCORED_MAX = 20;

const HelpTip = ({ text }: { text: string }) => (
    <span className="hfd-help-tip" tabIndex={0} aria-label={text}>
        ?
        <span className="hfd-help-popover" role="tooltip">{text}</span>
    </span>
);

const PreviewStat = ({ icon, label, value, note, tone }: { icon: string; label: string; value: number | string; note: string; tone: string }) => (
    <div className={`hfdq-stat-card ${tone}`}>
        <span className="hfdq-stat-icon"><i className={icon} /></span>
        <div>
            <small>{label}</small>
            <strong>{value}</strong>
            <em>{note}</em>
        </div>
    </div>
);

export default function DynamicFormPreviewTab() {
    const [departments, setDepartments] = useState<FeedbackDepartmentOption[]>([]);
    const [positions, setPositions] = useState<PositionResponse[]>([]);
    const [levelCode, setLevelCode] = useState('L06');
    const [relationshipType, setRelationshipType] = useState<QuestionRuleRole>('MANAGER');
    const [targetDepartmentId, setTargetDepartmentId] = useState<number | ''>('');
    const [targetPositionId, setTargetPositionId] = useState<number | ''>('');
    const [preview, setPreview] = useState<DynamicFormPreview | null>(null);
    const [loading, setLoading] = useState(false);
    const [bootLoading, setBootLoading] = useState(true);
    const [error, setError] = useState('');
    const [previewSearch, setPreviewSearch] = useState('');
    const [sectionFilter, setSectionFilter] = useState('ALL');
    const [responseTypeFilter, setResponseTypeFilter] = useState('ALL');
    const [scoringFilter, setScoringFilter] = useState<'ALL' | ScoringKind>('ALL');
    const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

    const loadReferenceData = async () => {
        setBootLoading(true);
        try {
            const [loadedDepartments, loadedPositions] = await Promise.all([
                feedbackCampaignApi.getDepartments().catch(() => []),
                positionService.getPositions().catch(() => []),
            ]);
            setDepartments(loadedDepartments);
            setPositions(loadedPositions);
        } finally {
            setBootLoading(false);
        }
    };

    const generatePreview = async () => {
        setLoading(true);
        setError('');
        try {
            const result = await hrFeedbackApi.previewDynamicForm({
                levelCode,
                relationshipType,
                targetDepartmentId: targetDepartmentId === '' ? null : Number(targetDepartmentId),
                targetPositionId: targetPositionId === '' ? null : Number(targetPositionId),
            });
            setPreview(result);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to generate dynamic form preview.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadReferenceData();
    }, []);

    useEffect(() => {
        if (!bootLoading) generatePreview();
    }, [bootLoading]);

    useEffect(() => {
        if (!preview) {
            setExpandedSections(new Set());
            return;
        }

        const initialExpanded = preview.sections.slice(0, 2).map(section => section.sectionCode);
        setExpandedSections(new Set(initialExpanded));
    }, [preview]);

    const questions = useMemo(() => preview?.sections.flatMap(section => section.questions) ?? [], [preview]);

    const metrics = useMemo(() => {
        const scored = questions.filter(question => getScoringCopy(question.responseType, question.scoringBehavior).kind === 'SCORED').length;
        const hrReview = questions.filter(question => getScoringCopy(question.responseType, question.scoringBehavior).kind === 'HR_REVIEW').length;
        const nonScored = questions.length - scored - hrReview;
        const sectionCount = preview?.sections.length ?? 0;
        const estimatedMinutes = questions.length === 0
            ? '0 min'
            : `${Math.max(3, Math.ceil(scored * 0.8 + nonScored * 1.2 + hrReview * 0.35))} min`;
        return { total: questions.length, scored, nonScored, hrReview, sectionCount, estimatedMinutes };
    }, [preview, questions]);

    const filteredSections = useMemo(() => {
        const search = normalizeText(previewSearch);

        return (preview?.sections ?? [])
            .filter(section => sectionFilter === 'ALL' || section.sectionCode === sectionFilter)
            .map(section => ({
                ...section,
                questions: section.questions.filter(question => {
                    const scoring = getScoringCopy(question.responseType, question.scoringBehavior).kind;
                    const matchesSearch = !search
                        || normalizeText(question.questionText).includes(search)
                        || normalizeText(question.questionCode).includes(search)
                        || normalizeText(question.competencyCode).includes(search);
                    const matchesResponseType = responseTypeFilter === 'ALL' || question.responseType === responseTypeFilter;
                    const matchesScoring = scoringFilter === 'ALL' || scoring === scoringFilter;
                    return matchesSearch && matchesResponseType && matchesScoring;
                }),
            }))
            .filter(section => section.questions.length > 0);
    }, [preview, previewSearch, responseTypeFilter, scoringFilter, sectionFilter]);

    const visibleQuestionCount = filteredSections.reduce((count, section) => count + section.questions.length, 0);
    const roleLabel = EVALUATOR_ROLE_OPTIONS.find(option => option.value === relationshipType)?.label ?? relationshipType;
    const selectedLevelLabel = LEVEL_OPTIONS.find(level => level.code === levelCode)?.label ?? levelCode;
    const selectedDepartmentName = departments.find(department => department.id === Number(targetDepartmentId))?.name ?? 'All departments';
    const selectedPositionName = positions.find(position => position.id === Number(targetPositionId))?.positionTitle ?? 'All positions';

    const warnings = useMemo(() => {
        const items: Array<{ tone: 'warning' | 'danger' | 'info'; icon: string; title: string; message: string }> = [];

        if (!preview) return items;

        if (metrics.total === 0) {
            items.push({
                tone: 'danger',
                icon: 'bi bi-exclamation-octagon',
                title: 'No questions will be shown for this setup.',
                message: 'Review active questions, active rules, employee level, department, position, and evaluator role.',
            });
        }

        if (metrics.total > LONG_FORM_THRESHOLD) {
            items.push({
                tone: 'warning',
                icon: 'bi bi-clock-history',
                title: `This preview contains ${metrics.total} questions.`,
                message: 'This may be too long for evaluators. Consider narrowing rules or reviewing campaign-specific question selection during campaign setup.',
            });
        }

        if (metrics.scored > RECOMMENDED_SCORED_MAX) {
            items.push({
                tone: 'warning',
                icon: 'bi bi-bar-chart-line',
                title: `${metrics.scored} scored questions are included.`,
                message: 'A focused 360 form usually works better with 10–20 scored questions plus a few written feedback questions.',
            });
        }

        if (metrics.total > 0 && metrics.scored === 0) {
            items.push({
                tone: 'danger',
                icon: 'bi bi-exclamation-octagon',
                title: 'This preview has no scored questions.',
                message: 'Add at least one active rating-based rule if this form should contribute to the 360 score.',
            });
        }

        if (metrics.nonScored > 0 || metrics.hrReview > 0) {
            items.push({
                tone: 'info',
                icon: 'bi bi-info-circle',
                title: 'Some questions are not part of the score.',
                message: 'Written answers and Yes/No checks are displayed for context, coaching, compliance, or HR review only.',
            });
        }

        return items;
    }, [preview, metrics]);

    const toggleSection = (sectionCode: string) => {
        setExpandedSections(current => {
            const next = new Set(current);
            if (next.has(sectionCode)) {
                next.delete(sectionCode);
            } else {
                next.add(sectionCode);
            }
            return next;
        });
    };

    const expandAllSections = () => {
        setExpandedSections(new Set((preview?.sections ?? []).map(section => section.sectionCode)));
    };

    const collapseAllSections = () => {
        setExpandedSections(new Set());
    };

    const clearPreviewFilters = () => {
        setPreviewSearch('');
        setSectionFilter('ALL');
        setResponseTypeFilter('ALL');
        setScoringFilter('ALL');
    };

    const goToRules = () => {
        window.location.hash = '#/hr/feedback/rules';
    };

    return (
        <div className="hfdq-page hfdq-preview-page">
            <div className="hfdq-page-head">
                <div>
                    <p className="hfdq-breadcrumb"><i className="bi bi-house" /> 360 Feedback / Dynamic Preview</p>
                    <h2>Dynamic Preview</h2>
                    <p>Test current Question Rules and confirm which questions will appear for a selected level, department, position, and evaluator role.</p>
                </div>
                <div className="hfdq-actions">
                    <button className="hfd-btn hfd-btn-secondary" onClick={goToRules}><i className="bi bi-sliders" /> Edit Rules</button>
                    <button className="hfd-btn hfd-btn-secondary" onClick={() => window.print()}><i className="bi bi-download" /> Export Preview</button>
                </div>
            </div>

            {error && <div className="hfd-alert hfd-alert-error"><i className="bi bi-exclamation-triangle" />{error}</div>}

            <section className="hfdq-hero hfdq-preview-hero">
                <div>
                    <span className="hfdq-kicker">Rule testing preview</span>
                    <h3>Check the generated form before campaign setup.</h3>
                    <p>This page is for validating active questions and active rules only. Final campaign question selection will be handled later during campaign setup.</p>
                </div>
                <div className="hfdq-abstract-art preview" aria-hidden="true">
                    <span className="shape orb" />
                    <span className="shape monitor" />
                    <span className="shape magnifier" />
                    <span className="shape line one" />
                    <span className="shape line two" />
                </div>
            </section>

            <div className="hfdq-preview-purpose-note">
                <i className="bi bi-info-circle" />
                <div>
                    <strong>Preview-only workspace</strong>
                    <p>Use this tab to check rule output. Do not use it to choose final campaign questions. Campaign-specific include/exclude decisions will be made in the future Campaign Question Review step.</p>
                </div>
            </div>

            <div className="hfdq-stats-grid hfdq-preview-stats-grid">
                <PreviewStat icon="bi bi-ui-checks" label="Total Questions" value={metrics.total} note="Generated in preview" tone="blue" />
                <PreviewStat icon="bi bi-patch-check" label="Scored Questions" value={metrics.scored} note="Included in 360 score" tone="green" />
                <PreviewStat icon="bi bi-chat-left-text" label="Non-scored" value={metrics.nonScored} note="Qualitative insight only" tone="purple" />
                <PreviewStat icon="bi bi-flag" label="HR Review Checks" value={metrics.hrReview} note="Eligibility or checklist" tone="orange" />
                <PreviewStat icon="bi bi-folder2-open" label="Sections" value={metrics.sectionCount} note="Grouped in form" tone="blue" />
                <PreviewStat icon="bi bi-hourglass-split" label="Estimated Time" value={metrics.estimatedMinutes} note="Rough evaluator effort" tone="purple" />
            </div>

            {warnings.length > 0 && (
                <div className="hfdq-preview-warning-grid">
                    {warnings.map(warning => (
                        <div key={`${warning.title}-${warning.tone}`} className={`hfdq-preview-warning-card ${warning.tone}`}>
                            <i className={warning.icon} />
                            <div>
                                <strong>{warning.title}</strong>
                                <p>{warning.message}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <div className="hfdq-preview-layout">
                <aside className="hfdq-preview-setup">
                    <div className="hfdq-section-title-row">
                        <h3>Preview Setup</h3>
                        <HelpTip text="Use these filters to see how the form changes for different employee groups and evaluator roles." />
                    </div>
                    <label className="hfd-field">
                        <span className="hfd-label">Employee Level</span>
                        <select className="hfd-input" value={levelCode} onChange={e => setLevelCode(e.target.value)}>
                            {LEVEL_OPTIONS.map(level => <option key={level.code} value={level.code}>{level.label}</option>)}
                        </select>
                    </label>
                    <label className="hfd-field">
                        <span className="hfd-label">Department</span>
                        <select className="hfd-input" value={targetDepartmentId} onChange={e => setTargetDepartmentId(e.target.value ? Number(e.target.value) : '')}>
                            <option value="">All departments</option>
                            {departments.map(department => <option key={department.id} value={department.id}>{department.name}</option>)}
                        </select>
                    </label>
                    <label className="hfd-field">
                        <span className="hfd-label">Position</span>
                        <select className="hfd-input" value={targetPositionId} onChange={e => setTargetPositionId(e.target.value ? Number(e.target.value) : '')}>
                            <option value="">All positions</option>
                            {positions.map(position => <option key={position.id} value={position.id}>{position.positionTitle} {position.levelCode ? `(${position.levelCode})` : ''}</option>)}
                        </select>
                    </label>
                    <label className="hfd-field">
                        <span className="hfd-label">Evaluator Role</span>
                        <select className="hfd-input" value={relationshipType} onChange={e => setRelationshipType(e.target.value as QuestionRuleRole)}>
                            {EVALUATOR_ROLE_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                        </select>
                    </label>
                    <button className="hfd-btn hfd-btn-primary hfdq-full-button" onClick={generatePreview} disabled={loading || bootLoading}>
                        <i className="bi bi-arrow-repeat" /> {loading ? 'Generating...' : 'Generate Preview'}
                    </button>
                    <p className="hfdq-setup-note">Preview uses the latest active question bank and active rules. Activated campaign snapshots may differ after campaign-specific review.</p>

                    <div className="hfdq-preview-context-card">
                        <strong>Current setup</strong>
                        <p><span>Level</span>{selectedLevelLabel}</p>
                        <p><span>Department</span>{selectedDepartmentName}</p>
                        <p><span>Position</span>{selectedPositionName}</p>
                        <p><span>Evaluator</span>{roleLabel}</p>
                    </div>
                </aside>

                <main className="hfdq-generated-form">
                    <div className="hfdq-section-title-row">
                        <div>
                            <h3>Generated Feedback Form Preview</h3>
                            <p>{roleLabel} view · {levelCode} · {visibleQuestionCount} visible of {metrics.total} generated</p>
                        </div>
                        <span className="hfdq-chip preview-role">{roleLabel}</span>
                    </div>

                    <div className="hfdq-preview-filter-panel">
                        <label className="hfd-field">
                            <span className="hfd-label">Search preview</span>
                            <input
                                className="hfd-input"
                                value={previewSearch}
                                onChange={e => setPreviewSearch(e.target.value)}
                                placeholder="Search question, code, or competency..."
                            />
                        </label>
                        <label className="hfd-field">
                            <span className="hfd-label">Section</span>
                            <select className="hfd-input" value={sectionFilter} onChange={e => setSectionFilter(e.target.value)}>
                                <option value="ALL">All sections</option>
                                {SECTION_OPTIONS.map(section => <option key={section.code} value={section.code}>{section.title}</option>)}
                            </select>
                        </label>
                        <label className="hfd-field">
                            <span className="hfd-label">Response Type</span>
                            <select className="hfd-input" value={responseTypeFilter} onChange={e => setResponseTypeFilter(e.target.value)}>
                                <option value="ALL">All response types</option>
                                {RESPONSE_TYPE_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                            </select>
                        </label>
                        <label className="hfd-field">
                            <span className="hfd-label">Scoring</span>
                            <select className="hfd-input" value={scoringFilter} onChange={e => setScoringFilter(e.target.value as 'ALL' | ScoringKind)}>
                                <option value="ALL">All scoring behavior</option>
                                <option value="SCORED">Scored</option>
                                <option value="NON_SCORED">Non-scored</option>
                                <option value="HR_REVIEW">HR review</option>
                            </select>
                        </label>
                        <button className="hfdq-clear" type="button" onClick={clearPreviewFilters}>Clear</button>
                    </div>

                    <div className="hfdq-preview-tools-row">
                        <span>{filteredSections.length} section{filteredSections.length === 1 ? '' : 's'} · {visibleQuestionCount} visible question{visibleQuestionCount === 1 ? '' : 's'}</span>
                        <div>
                            <button className="hfd-btn hfd-btn-secondary" type="button" onClick={expandAllSections}>Expand all</button>
                            <button className="hfd-btn hfd-btn-secondary" type="button" onClick={collapseAllSections}>Collapse all</button>
                        </div>
                    </div>

                    {loading || bootLoading ? (
                        <div className="hfd-spinner"><i className="bi bi-arrow-repeat" /> Generating preview...</div>
                    ) : !preview || preview.totalQuestions === 0 ? (
                        <div className="hfdq-preview-empty">
                            <i className="bi bi-ui-checks" />
                            <h4>No matching questions found</h4>
                            <p>Add active rules for this level and evaluator role, then generate the preview again.</p>
                            <button className="hfd-btn hfd-btn-secondary" type="button" onClick={goToRules}><i className="bi bi-sliders" /> Review Question Rules</button>
                        </div>
                    ) : filteredSections.length === 0 ? (
                        <div className="hfdq-preview-empty">
                            <i className="bi bi-search" />
                            <h4>No questions match the preview filters</h4>
                            <p>Clear search or filter values to see the generated questions again.</p>
                            <button className="hfd-btn hfd-btn-secondary" type="button" onClick={clearPreviewFilters}>Clear Preview Filters</button>
                        </div>
                    ) : (
                        <div className="hfdq-form-sections">
                            {filteredSections.map((section, sectionIndex) => {
                                const expanded = expandedSections.has(section.sectionCode);
                                const scoredCount = section.questions.filter(question => getScoringCopy(question.responseType, question.scoringBehavior).kind === 'SCORED').length;
                                const nonScoredCount = section.questions.length - scoredCount;

                                return (
                                    <section key={section.sectionCode} className="hfdq-form-section-card hfdq-form-section-card-collapsible">
                                        <button type="button" className="hfdq-form-section-toggle" onClick={() => toggleSection(section.sectionCode)}>
                                            <span className="hfdq-section-number">{sectionIndex + 1}</span>
                                            <span className="hfdq-section-heading">
                                                <strong>{getSectionLabel(section.sectionCode, section.title)}</strong>
                                                <small>{section.questions.length} question{section.questions.length === 1 ? '' : 's'} · {scoredCount} scored · {nonScoredCount} context/review</small>
                                            </span>
                                            <i className={`bi ${expanded ? 'bi-chevron-up' : 'bi-chevron-down'}`} />
                                        </button>
                                        {expanded && (
                                            <div className="hfdq-form-question-list">
                                                {section.questions.map((question, questionIndex) => {
                                                    const score = getScoringCopy(question.responseType, question.scoringBehavior);
                                                    return (
                                                        <div key={`${question.questionCode}-${questionIndex}`} className="hfdq-form-question-row">
                                                            <span>{sectionIndex + 1}.{questionIndex + 1}</span>
                                                            <div>
                                                                <p>{question.questionText}</p>
                                                                <small>{question.questionCode} · {score.shortLabel} · {score.description}</small>
                                                            </div>
                                                            <em className={`hfdq-chip scoring ${score.kind}`}>{getResponseTypeLabel(question.responseType)}</em>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </section>
                                );
                            })}
                        </div>
                    )}
                </main>

                <aside className="hfdq-preview-insights">
                    <h3>Preview Insights</h3>
                    <div className="hfdq-insight-card info">
                        <i className="bi bi-info-circle" />
                        <strong>This is not final campaign selection.</strong>
                        <p>Question include/exclude decisions will be handled during campaign setup so reusable rules stay clean.</p>
                    </div>
                    <div className="hfdq-insight-card info">
                        <i className="bi bi-patch-check" />
                        <strong>This form contains {metrics.scored} scored question{metrics.scored === 1 ? '' : 's'}.</strong>
                        <p>The 360 feedback score will be calculated from these rating-based questions only.</p>
                    </div>
                    <div className="hfdq-insight-card note">
                        <i className="bi bi-pencil" />
                        <strong>{metrics.nonScored} written-answer question{metrics.nonScored === 1 ? '' : 's'} will not affect the score.</strong>
                        <p>These responses are still useful for coaching, promotion context, and development planning.</p>
                    </div>
                    <div className="hfdq-insight-card warn">
                        <i className="bi bi-exclamation-triangle" />
                        <strong>{metrics.hrReview} HR review check{metrics.hrReview === 1 ? '' : 's'} active.</strong>
                        <p>Yes/No questions are treated as eligibility, compliance, or review flags.</p>
                    </div>
                    <div className="hfdq-legend-card">
                        <h4>Legend</h4>
                        <p><span className="legend-dot scored" /> Scored · contributes to final 360 score</p>
                        <p><span className="legend-dot non" /> Non-scored · qualitative insight only</p>
                        <p><span className="legend-dot review" /> HR review · checklist or eligibility context</p>
                    </div>
                </aside>
            </div>
        </div>
    );
}
