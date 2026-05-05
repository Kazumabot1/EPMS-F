import { useEffect, useMemo, useState } from 'react';
import {
  hrFeedbackApi,
  ratingScaleLabel,
  type CreateFormPayload,
  type FormDetail,
  type FormOptionItem,
  type FormSectionDetail,
  type RatingScaleOption,
} from '../../../api/hrFeedbackApi';

interface Props {
  onFormCreated?: () => void;
}

type BuilderMode = 'create' | 'edit' | 'version' | 'view';

type QuestionDetail = FormSectionDetail['questions'][0];

const emptyQuestion = (): QuestionDetail => ({
  id: null,
  questionText: '',
  questionOrder: 1,
  ratingScaleId: null,
  weight: 1,
  isRequired: true,
});

const emptySection = (orderNo: number): FormSectionDetail => ({
  id: null,
  title: '',
  orderNo,
  questions: [emptyQuestion()],
});

const isFivePointScale = (scale: RatingScaleOption): boolean => {
  const max = scale.maxScore ?? scale.scales;
  const min = scale.minScore ?? 1;
  const label = `${scale.scaleName ?? ''} ${scale.description ?? ''}`.toLowerCase();
  return (min === 1 && max === 5) || label.includes('1-5') || label.includes('1–5') || label.includes('five');
};

const getFixedFivePointScale = (scales: RatingScaleOption[]): RatingScaleOption | null =>
    scales.find(isFivePointScale) ?? scales.find(scale => (scale.scales ?? scale.maxScore) === 5) ?? null;

const statusClass = (status: string) => {
  if (status === 'ACTIVE') return 'hfd-status-badge ACTIVE';
  if (status === 'ARCHIVED') return 'hfd-status-badge CLOSED';
  return 'hfd-status-badge DRAFT';
};

const friendlyFormError = (message: string): string => {
  const lower = message.toLowerCase();
  if (lower.includes('only draft forms can be edited')) {
    return 'This form is already active/archived. Create a new version instead of editing it directly.';
  }
  if (lower.includes('only hr/admin') || lower.includes('forbidden') || lower.includes('403')) {
    return 'Your account must have HR/Admin permission for form changes. If you are logged in as HR, check whether PUT/POST form APIs allow the HR role in Spring Security.';
  }
  if (lower.includes('401') || lower.includes('unauthorized')) {
    return 'Your session may have expired. Please log in again and retry.';
  }
  return message;
};

const formatDate = (value?: string | null) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
};

export default function FormManagementTab({ onFormCreated }: Props) {
  const [forms, setForms] = useState<FormOptionItem[]>([]);
  const [scales, setScales] = useState<RatingScaleOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showBuilder, setShowBuilder] = useState(false);
  const [builderMode, setBuilderMode] = useState<BuilderMode>('create');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveOk, setSaveOk] = useState(false);
  const [statusChanging, setStatusChanging] = useState<number | null>(null);
  const [editingForm, setEditingForm] = useState<FormDetail | null>(null);
  const [versionSourceForm, setVersionSourceForm] = useState<FormDetail | null>(null);
  const [versionHistoryFor, setVersionHistoryFor] = useState<FormOptionItem | null>(null);
  const [versionHistory, setVersionHistory] = useState<FormOptionItem[]>([]);
  const [versionLoading, setVersionLoading] = useState(false);

  const [formName, setFormName] = useState('');
  const [anonAllowed, setAnonAllowed] = useState(true);
  const [sections, setSections] = useState<FormSectionDetail[]>([emptySection(1)]);

  const fixedScale = useMemo(() => getFixedFivePointScale(scales), [scales]);
  const readOnly = builderMode === 'view';

  const loadInitialData = async () => {
    setLoading(true);
    setError('');
    try {
      const [loadedForms, loadedScales] = await Promise.all([
        hrFeedbackApi.getAllForms(),
        hrFeedbackApi.getRatingScales(),
      ]);
      setForms(loadedForms);
      setScales(loadedScales);
    } catch (e: any) {
      setError(e.message || 'Failed to load feedback forms.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  const refreshForms = async () => {
    try {
      setForms(await hrFeedbackApi.getAllForms());
    } catch (e: any) {
      setError(e.message || 'Failed to refresh forms.');
    }
  };

  const resetBuilder = () => {
    setBuilderMode('create');
    setEditingForm(null);
    setVersionSourceForm(null);
    setFormName('');
    setAnonAllowed(true);
    setSections([emptySection(1)]);
    setSaveError('');
    setSaveOk(false);
  };

  const openNewBuilder = () => {
    resetBuilder();
    setShowBuilder(true);
  };

  const closeBuilder = () => {
    resetBuilder();
    setShowBuilder(false);
  };

  const applyFormToBuilder = (detail: FormDetail) => {
    setFormName(detail.formName ?? '');
    setAnonAllowed(detail.anonymousAllowed ?? true);
    setSections(
        (detail.sections?.length ? detail.sections : [emptySection(1)]).map((section, sectionIndex) => ({
          id: section.id ?? null,
          title: section.title ?? '',
          orderNo: section.orderNo ?? sectionIndex + 1,
          questions: (section.questions?.length ? section.questions : [emptyQuestion()]).map((question, questionIndex) => ({
            id: question.id ?? null,
            questionText: question.questionText ?? '',
            questionOrder: question.questionOrder ?? questionIndex + 1,
            ratingScaleId: fixedScale?.id ?? question.ratingScaleId ?? null,
            weight: question.weight ?? 1,
            isRequired: question.isRequired ?? true,
          })),
        })),
    );
  };

  const loadFormForBuilder = async (form: FormOptionItem, mode: BuilderMode) => {
    setError('');
    setSaveError('');
    setSaveOk(false);
    try {
      const detail = await hrFeedbackApi.getFormDetail(form.id);
      applyFormToBuilder(detail);
      setBuilderMode(mode);
      setEditingForm(mode === 'edit' ? detail : null);
      setVersionSourceForm(mode === 'version' ? detail : null);
      setShowBuilder(true);
    } catch (e: any) {
      setError(e.message || 'Failed to load form detail.');
    }
  };

  const startEditDraft = (form: FormOptionItem) => {
    if (form.status !== 'DRAFT') {
      setError('This form is not a draft. Create a new version instead.');
      return;
    }
    loadFormForBuilder(form, 'edit');
  };

  const startCreateVersion = (form: FormOptionItem) => {
    loadFormForBuilder(form, 'version');
  };

  const startViewForm = (form: FormOptionItem) => {
    loadFormForBuilder(form, 'view');
  };

  const addSection = () => {
    if (readOnly) return;
    setSections(prev => [...prev, emptySection(prev.length + 1)]);
  };

  const removeSection = (sectionIndex: number) => {
    if (readOnly) return;
    setSections(prev => prev.filter((_, index) => index !== sectionIndex));
  };

  const updateSectionTitle = (sectionIndex: number, title: string) => {
    if (readOnly) return;
    setSections(prev => prev.map((section, index) => index === sectionIndex ? { ...section, title } : section));
  };

  const addQuestion = (sectionIndex: number) => {
    if (readOnly) return;
    setSections(prev => prev.map((section, index) =>
        index === sectionIndex
            ? {
              ...section,
              questions: [
                ...(section.questions ?? []),
                {
                  ...emptyQuestion(),
                  questionOrder: (section.questions ?? []).length + 1,
                  ratingScaleId: fixedScale?.id ?? null,
                },
              ],
            }
            : section,
    ));
  };

  const removeQuestion = (sectionIndex: number, questionIndex: number) => {
    if (readOnly) return;
    setSections(prev => prev.map((section, index) =>
        index === sectionIndex
            ? { ...section, questions: section.questions.filter((_, qIndex) => qIndex !== questionIndex) }
            : section,
    ));
  };

  const updateQuestion = (sectionIndex: number, questionIndex: number, patch: Partial<QuestionDetail>) => {
    if (readOnly) return;
    setSections(prev => prev.map((section, index) =>
        index === sectionIndex
            ? { ...section, questions: section.questions.map((question, qIndex) => qIndex === questionIndex ? { ...question, ...patch } : question) }
            : section,
    ));
  };

  const validateForm = (): string | null => {
    if (!formName.trim()) return 'Form name is required.';
    if (!fixedScale) return 'A 1-5 rating scale is required. Please create/enable the 1-5 rating scale before saving feedback forms.';
    if (sections.length === 0) return 'At least one section is required.';
    if (sections.some(section => !section.title.trim())) return 'All section titles are required.';
    if (sections.some(section => (section.questions ?? []).length === 0)) return 'Every section must have at least one question.';
    if (sections.some(section => (section.questions ?? []).some(question => !question.questionText.trim()))) return 'All question texts are required.';
    return null;
  };

  const buildPayload = (): CreateFormPayload => {
    const ratingScaleId = fixedScale?.id ?? null;
    return {
      formName: formName.trim(),
      anonymousAllowed: anonAllowed,
      sections: sections.map((section, sectionIndex) => ({
        title: section.title.trim(),
        orderNo: sectionIndex + 1,
        questions: (section.questions ?? []).map((question, questionIndex) => ({
          questionText: question.questionText.trim(),
          questionOrder: questionIndex + 1,
          ratingScaleId,
          weight: Number(question.weight) || 1,
          isRequired: question.isRequired,
        })),
      })),
    };
  };

  const handleSave = async () => {
    setSaveError('');
    setSaveOk(false);

    if (readOnly) return;
    const validationError = validateForm();
    if (validationError) {
      setSaveError(validationError);
      return;
    }

    setSaving(true);
    try {
      const payload = buildPayload();
      if (builderMode === 'edit' && editingForm) {
        await hrFeedbackApi.updateForm(editingForm.id, payload);
      } else if (builderMode === 'version' && versionSourceForm) {
        await hrFeedbackApi.createFormVersion(versionSourceForm.id, payload);
      } else {
        await hrFeedbackApi.createForm(payload);
        onFormCreated?.();
      }

      setSaveOk(true);
      await refreshForms();
      closeBuilder();
    } catch (e: any) {
      setSaveError(friendlyFormError(e.message || 'Failed to save form.'));
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (formId: number, newStatus: 'ACTIVE' | 'ARCHIVED') => {
    setStatusChanging(formId);
    setError('');
    try {
      await hrFeedbackApi.changeFormStatus(formId, newStatus);
      await refreshForms();
    } catch (e: any) {
      setError(friendlyFormError(e.message || 'Failed to change form status.'));
    } finally {
      setStatusChanging(null);
    }
  };

  const openVersionHistory = async (form: FormOptionItem) => {
    setVersionHistoryFor(form);
    setVersionHistory([]);
    setVersionLoading(true);
    setError('');
    try {
      setVersionHistory(await hrFeedbackApi.getFormVersions(form.id));
    } catch (e: any) {
      setError(e.message || 'Failed to load version history.');
    } finally {
      setVersionLoading(false);
    }
  };

  const closeVersionHistory = () => {
    setVersionHistoryFor(null);
    setVersionHistory([]);
  };

  const builderTitle = () => {
    if (builderMode === 'edit') return `Edit Draft Form${editingForm ? ` - v${editingForm.versionNumber}` : ''}`;
    if (builderMode === 'version') return `Create New Version${versionSourceForm ? ` from v${versionSourceForm.versionNumber}` : ''}`;
    if (builderMode === 'view') return 'View Feedback Form';
    return 'Build New Feedback Form';
  };

  const saveButtonLabel = () => {
    if (builderMode === 'edit') return 'Save Draft Form';
    if (builderMode === 'version') return 'Create New Version';
    return 'Save Form';
  };

  const renderActions = (form: FormOptionItem) => {
    const disabled = statusChanging === form.id;
    return (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {form.status === 'DRAFT' && (
              <>
                <button className="hfd-btn hfd-btn-secondary hfd-btn-sm" onClick={() => startEditDraft(form)}>
                  <i className="bi bi-pencil" /> Edit Draft
                </button>
                <button className="hfd-btn hfd-btn-success hfd-btn-sm" onClick={() => handleStatusChange(form.id, 'ACTIVE')} disabled={disabled}>
                  {disabled ? <i className="bi bi-arrow-repeat hfd-spinner-icon" /> : <i className="bi bi-check-circle" />}
                  Activate
                </button>
              </>
          )}
          {form.status !== 'DRAFT' && (
              <>
                <button className="hfd-btn hfd-btn-secondary hfd-btn-sm" onClick={() => startViewForm(form)}>
                  <i className="bi bi-eye" /> View
                </button>
                <button className="hfd-btn hfd-btn-primary hfd-btn-sm" onClick={() => startCreateVersion(form)}>
                  <i className="bi bi-files" /> New Version
                </button>
              </>
          )}
          <button className="hfd-btn hfd-btn-secondary hfd-btn-sm" onClick={() => openVersionHistory(form)}>
            <i className="bi bi-clock-history" /> Versions
          </button>
        </div>
    );
  };

  return (
      <div>
        <div className="hfd-card-header">
          <div className="hfd-card-title">
            <i className="bi bi-ui-checks" />
            <div>
              <h2>Feedback Form Management</h2>
              <p>Create versioned 360 forms. Every question uses fixed 1-5 rating plus one optional comment.</p>
            </div>
          </div>
          <button className="hfd-btn hfd-btn-primary" onClick={showBuilder ? closeBuilder : openNewBuilder}>
            <i className={`bi ${showBuilder ? 'bi-x-lg' : 'bi-plus-lg'}`} />
            {showBuilder ? 'Close Builder' : 'New Form'}
          </button>
        </div>

        {error && <div className="hfd-alert hfd-alert-error"><i className="bi bi-exclamation-triangle" />{error}</div>}

        {showBuilder && (
            <div className="hfd-form-builder-card">
              <h3 style={{ margin: '0 0 12px', fontSize: '1rem', fontWeight: 700, color: '#1f2937' }}>
                <i className="bi bi-pencil-square" style={{ marginRight: 6, color: '#6366f1' }} />
                {builderTitle()}
              </h3>

              {saveError && <div className="hfd-alert hfd-alert-error"><i className="bi bi-exclamation-triangle" />{saveError}</div>}
              {saveOk && <div className="hfd-alert hfd-alert-success"><i className="bi bi-check-circle" />Form saved successfully.</div>}
              {!fixedScale && (
                  <div className="hfd-alert hfd-alert-warning">
                    <i className="bi bi-exclamation-triangle" />
                    No 1-5 rating scale was found. The client requirement uses fixed 1-5 ratings, so saving is disabled until the scale exists.
                  </div>
              )}
              {builderMode === 'version' && (
                  <div className="hfd-alert hfd-alert-info">
                    <i className="bi bi-info-circle" />
                    You are creating a new draft version. Existing submitted feedback remains attached to the old version.
                  </div>
              )}
              {readOnly && (
                  <div className="hfd-alert hfd-alert-info">
                    <i className="bi bi-eye" />
                    Active and archived forms are read-only. Use New Version to make changes safely.
                  </div>
              )}

              <div className="hfd-fixed-scale-box">
                <div>
                  <strong>Fixed rating scale</strong>
                  <span>Client rule: all 360 questions use 1-5 rating. The dropdown is hidden and applied automatically.</span>
                </div>
                <span className="hfd-fixed-scale-pill">
              {fixedScale ? ratingScaleLabel(fixedScale) : '1-5 scale missing'}
            </span>
              </div>

              <div className="hfd-grid-2" style={{ marginBottom: 14 }}>
                <div className="hfd-field">
                  <label className="hfd-label">Form Name <span>*</span></label>
                  <input
                      className="hfd-input"
                      value={formName}
                      onChange={e => setFormName(e.target.value)}
                      placeholder="e.g. Annual 360 Review"
                      disabled={readOnly}
                  />
                </div>
                <div className="hfd-field" style={{ display: 'flex', alignItems: 'center', paddingTop: 24 }}>
                  <label className="hfd-checkbox-label">
                    <input type="checkbox" checked={anonAllowed} onChange={e => setAnonAllowed(e.target.checked)} disabled={readOnly} />
                    Allow anonymous responses
                  </label>
                </div>
              </div>

              {sections.map((section, sectionIndex) => (
                  <div key={sectionIndex} className="hfd-section-block">
                    <div className="hfd-section-header">
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#6b7280', whiteSpace: 'nowrap' }}>Section {sectionIndex + 1}</span>
                      <input
                          placeholder="Section title..."
                          value={section.title}
                          onChange={e => updateSectionTitle(sectionIndex, e.target.value)}
                          disabled={readOnly}
                      />
                      {!readOnly && sections.length > 1 && (
                          <button className="hfd-btn hfd-btn-danger hfd-btn-sm hfd-btn-icon" onClick={() => removeSection(sectionIndex)}>
                            <i className="bi bi-trash" />
                          </button>
                      )}
                    </div>
                    <div className="hfd-section-body">
                      {(section.questions ?? []).map((question, questionIndex) => (
                          <div key={questionIndex} className="hfd-question-row hfd-question-row-form">
                            <input
                                className="hfd-input"
                                placeholder={`Question ${questionIndex + 1}...`}
                                value={question.questionText}
                                onChange={e => updateQuestion(sectionIndex, questionIndex, { questionText: e.target.value })}
                                disabled={readOnly}
                            />
                            <input
                                className="hfd-input"
                                type="number"
                                min="0.1"
                                step="0.1"
                                value={question.weight}
                                onChange={e => updateQuestion(sectionIndex, questionIndex, { weight: Number(e.target.value) })}
                                disabled={readOnly}
                                title="Question weight"
                                style={{ width: 88 }}
                            />
                            <span className="hfd-comment-chip" title="Evaluator response screen shows a comment box for this question.">
                      <i className="bi bi-chat-left-text" /> Comment
                    </span>
                            <label className="hfd-checkbox-label">
                              <input
                                  type="checkbox"
                                  checked={question.isRequired}
                                  onChange={e => updateQuestion(sectionIndex, questionIndex, { isRequired: e.target.checked })}
                                  disabled={readOnly}
                              />
                              Required
                            </label>
                            {!readOnly && (section.questions ?? []).length > 1 && (
                                <button className="hfd-btn hfd-btn-danger hfd-btn-sm hfd-btn-icon" onClick={() => removeQuestion(sectionIndex, questionIndex)}>
                                  <i className="bi bi-x" />
                                </button>
                            )}
                          </div>
                      ))}
                      {!readOnly && (
                          <button className="hfd-btn hfd-btn-secondary hfd-btn-sm" style={{ marginTop: 4 }} onClick={() => addQuestion(sectionIndex)}>
                            <i className="bi bi-plus" /> Add Question
                          </button>
                      )}
                    </div>
                  </div>
              ))}

              {!readOnly && (
                  <div style={{ display: 'flex', gap: 10, marginTop: 8, flexWrap: 'wrap' }}>
                    <button className="hfd-btn hfd-btn-secondary hfd-btn-sm" onClick={addSection}>
                      <i className="bi bi-plus-circle" /> Add Section
                    </button>
                    <button className="hfd-btn hfd-btn-primary" onClick={handleSave} disabled={saving || !fixedScale}>
                      {saving ? <><i className="bi bi-arrow-repeat hfd-spinner-icon" /> Saving...</> : <><i className="bi bi-floppy" /> {saveButtonLabel()}</>}
                    </button>
                  </div>
              )}
            </div>
        )}

        {loading ? (
            <div className="hfd-spinner"><i className="bi bi-arrow-repeat" /> Loading forms...</div>
        ) : forms.length === 0 ? (
            <div className="hfd-empty">
              <i className="bi bi-file-earmark-text" />
              <p>No feedback forms yet. Create your first form above.</p>
            </div>
        ) : (
            <div className="hfd-table-wrap">
              <table className="hfd-table">
                <thead>
                <tr>
                  <th>#</th>
                  <th>Form Name</th>
                  <th>Version</th>
                  <th>Rating / Comments</th>
                  <th>Anonymous</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
                </thead>
                <tbody>
                {forms.map((form, index) => (
                    <tr key={form.id}>
                      <td style={{ color: '#9ca3af', fontSize: '0.8rem' }}>{index + 1}</td>
                      <td><strong style={{ color: '#1f2937' }}>{form.formName}</strong></td>
                      <td>v{form.versionNumber}</td>
                      <td>
                        <span className="hfd-muted">1-5 fixed + per-question comment</span>
                      </td>
                      <td>{form.anonymousAllowed ? <span style={{ color: '#16a34a' }}><i className="bi bi-check-circle" /> Yes</span> : '-'}</td>
                      <td><span className={statusClass(form.status)}>{form.status}</span></td>
                      <td>{formatDate(form.createdAt)}</td>
                      <td>{renderActions(form)}</td>
                    </tr>
                ))}
                </tbody>
              </table>
            </div>
        )}

        {versionHistoryFor && (
            <div className="hfd-modal-backdrop" onClick={closeVersionHistory}>
              <div className="hfd-modal" onClick={e => e.stopPropagation()}>
                <div className="hfd-modal-header">
                  <div>
                    <h3>Version History</h3>
                    <p>{versionHistoryFor.formName}</p>
                  </div>
                  <button className="hfd-btn hfd-btn-secondary hfd-btn-sm hfd-btn-icon" onClick={closeVersionHistory}>
                    <i className="bi bi-x-lg" />
                  </button>
                </div>

                {versionLoading ? (
                    <div className="hfd-spinner"><i className="bi bi-arrow-repeat" /> Loading versions...</div>
                ) : versionHistory.length === 0 ? (
                    <div className="hfd-empty"><i className="bi bi-clock-history" /><p>No versions found.</p></div>
                ) : (
                    <table className="hfd-table">
                      <thead>
                      <tr>
                        <th>Version</th>
                        <th>Status</th>
                        <th>Created</th>
                        <th>Actions</th>
                      </tr>
                      </thead>
                      <tbody>
                      {versionHistory.map(version => (
                          <tr key={version.id}>
                            <td>v{version.versionNumber}</td>
                            <td><span className={statusClass(version.status)}>{version.status}</span></td>
                            <td>{formatDate(version.createdAt)}</td>
                            <td>
                              <button className="hfd-btn hfd-btn-secondary hfd-btn-sm" onClick={() => { closeVersionHistory(); startViewForm(version); }}>
                                <i className="bi bi-eye" /> View
                              </button>
                            </td>
                          </tr>
                      ))}
                      </tbody>
                    </table>
                )}
              </div>
            </div>
        )}
      </div>
  );
}
