import { useEffect, useState } from 'react';
import {
  hrFeedbackApi,
  type CreateFormPayload,
  type FormOptionItem,
  type FormSectionDetail,
  type RatingScaleOption,
  type FormDetail,
} from '../../../api/hrFeedbackApi';

interface Props {
  onFormCreated?: () => void;
}

const emptyQuestion = (): FormSectionDetail['questions'][0] => ({
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

export default function FormManagementTab({ onFormCreated }: Props) {
  const [forms, setForms] = useState<FormOptionItem[]>([]);
  const [scales, setScales] = useState<RatingScaleOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showBuilder, setShowBuilder] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveOk, setSaveOk] = useState(false);
  const [statusChanging, setStatusChanging] = useState<number | null>(null);
  const [editingForm, setEditingForm] = useState<FormDetail | null>(null);

  // Form builder state
  const [formName, setFormName] = useState('');
  const [anonAllowed, setAnonAllowed] = useState(true);
  const [sections, setSections] = useState<FormSectionDetail[]>([emptySection(1)]);

  useEffect(() => {
    Promise.all([hrFeedbackApi.getAllForms(), hrFeedbackApi.getRatingScales()])
        .then(([f, s]) => { setForms(f); setScales(s); })
        .catch(e => setError(e.message))
        .finally(() => setLoading(false));
  }, []);

  // Set default rating scale for existing questions when scales are loaded
  useEffect(() => {
    if (scales.length > 0 && showBuilder) {
      setSections(prev => prev.map(section => ({
        ...section,
        questions: (section.questions ?? []).map(question => ({
          ...question,
          ratingScaleId: question.ratingScaleId ?? scales[0].id
        }))
      })));
    }
  }, [scales, showBuilder]);

  const refresh = () => {
    hrFeedbackApi.getAllForms().then(setForms).catch(() => {});
  };

  /* ── Section helpers ─────────────────────── */
  const addSection = () =>
      setSections(prev => [...prev, emptySection(prev.length + 1)]);

  const removeSection = (si: number) =>
      setSections(prev => prev.filter((_, i) => i !== si));

  const updateSectionTitle = (si: number, title: string) =>
      setSections(prev => prev.map((s, i) => i === si ? { ...s, title } : s));

  const addQuestion = (si: number) =>
      setSections(prev => prev.map((s, i) =>
          i === si
              ? {
                ...s,
                questions: [
                  ...(s.questions ?? []),
                  {
                    ...emptyQuestion(),
                    questionOrder: (s.questions ?? []).length + 1,
                    ratingScaleId: scales.length > 0 ? scales[0].id : null
                  }
                ]
              }
              : s
      ));

  const removeQuestion = (si: number, qi: number) =>
      setSections(prev => prev.map((s, i) =>
          i === si ? { ...s, questions: s.questions.filter((_, j) => j !== qi) } : s
      ));

  const updateQuestion = (si: number, qi: number, patch: Partial<FormSectionDetail['questions'][0]>) =>
      setSections(prev => prev.map((s, i) =>
          i === si
              ? { ...s, questions: s.questions.map((q, j) => j === qi ? { ...q, ...patch } : q) }
              : s
      ));

  /* ── Save ─────────────────────────────────── */
  const handleSave = async () => {
    setSaveError('');
    setSaveOk(false);
    if (!formName.trim()) { setSaveError('Form name is required.'); return; }
    if (sections.some(s => !s.title.trim())) { setSaveError('All section titles are required.'); return; }
    if (sections.some(s => (s.questions ?? []).some(q => !q.questionText.trim()))) {
      setSaveError('All question texts are required.'); return;
    }
    if (sections.some(s => (s.questions ?? []).some(q => q.ratingScaleId === null))) {
      setSaveError('All questions must have a rating scale selected.'); return;
    }
    const payload: CreateFormPayload = {
      formName: formName.trim(),
      anonymousAllowed: anonAllowed,
      sections: sections.map((s, si) => ({
        title: s.title.trim(),
        orderNo: si + 1,
        questions: (s.questions ?? []).map((q, qi) => ({
          questionText: q.questionText.trim(),
          questionOrder: qi + 1,
          ratingScaleId: q.ratingScaleId,
          weight: q.weight,
          isRequired: q.isRequired,
        })),
      })),
    };
    setSaving(true);
    try {
      if (editingForm) {
        await hrFeedbackApi.updateForm(editingForm.id, payload);
        setSaveOk(true);
        setFormName('');
        setAnonAllowed(true);
        setSections([emptySection(1)]);
        setShowBuilder(false);
        setEditingForm(null);
        refresh();
      } else {
        await hrFeedbackApi.createForm(payload);
        setSaveOk(true);
        setFormName('');
        setAnonAllowed(true);
        setSections([emptySection(1)]);
        setShowBuilder(false);
        refresh();
        onFormCreated?.();
      }
    } catch (e: any) {
      setSaveError(e.message);
    } finally {
      setSaving(false);
    }
  };

  /* ── Badge helper ─────────────────────────── */
  const statusClass = (s: string) => {
    if (s === 'ACTIVE') return 'hfd-status-badge ACTIVE';
    if (s === 'ARCHIVED') return 'hfd-status-badge CLOSED';
    return 'hfd-status-badge DRAFT';
  };

  /* ── Status change ────────────────────────── */
  const handleStatusChange = async (formId: number, newStatus: 'ACTIVE' | 'ARCHIVED') => {
    setStatusChanging(formId);
    try {
      await hrFeedbackApi.changeFormStatus(formId, newStatus);
      refresh();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setStatusChanging(null);
    }
  };

  const handleEditForm = async (form: FormOptionItem) => {
    try {
      setError('');
      setSaveError('');

      if (form.status !== 'DRAFT') {
        setError('Only draft forms can be edited.');
        return;
      }

      const detail = await hrFeedbackApi.getFormDetail(form.id);

      setEditingForm(detail);
      setFormName(detail.formName ?? '');
      setAnonAllowed(detail.anonymousAllowed ?? false);

      setSections(
          (detail.sections ?? []).map((section) => ({
            id: section.id,
            title: section.title ?? '',
            orderNo: section.orderNo ?? 1,
            questions: (section.questions ?? []).map((question) => ({
              id: question.id,
              questionText: question.questionText ?? '',
              questionOrder: question.questionOrder ?? 1,
              ratingScaleId: question.ratingScaleId ?? null,
              weight: question.weight ?? 1,
              isRequired: question.isRequired ?? true,
            })),
          }))
      );

      setShowBuilder(true);
    } catch (e: any) {
      setError(e.message || 'Failed to load form detail.');
    }
  };

  const getStatusActions = (form: FormOptionItem) => {
    const actions = [];

    if (form.status === 'DRAFT') {
      actions.push(
          <button
              key="edit"
              className="hfd-btn hfd-btn-secondary hfd-btn-sm"
              onClick={() => handleEditForm(form)}
              style={{ marginRight: 8 }}
          >
            <i className="bi bi-pencil" />
            Edit
          </button>
      );
      actions.push(
          <button
              key="activate"
              className="hfd-btn hfd-btn-success hfd-btn-sm"
              onClick={() => handleStatusChange(form.id, 'ACTIVE')}
              disabled={statusChanging === form.id}
          >
            {statusChanging === form.id ? <i className="bi bi-arrow-repeat hfd-spinner-icon" /> : <i className="bi bi-check-circle" />}
            Activate
          </button>
      );
    }

    return actions;
  };

  return (
      <div>
        <div className="hfd-card-header">
          <div className="hfd-card-title">
            <i className="bi bi-ui-checks" />
            <div>
              <h2>Feedback Form Management</h2>
              <p>Create and manage feedback forms with sections and questions</p>
            </div>
          </div>
          <button className="hfd-btn hfd-btn-primary" onClick={() => {
            setShowBuilder(b => !b);
            setSaveError('');
            setSaveOk(false);
            if (showBuilder) {
              setEditingForm(null);
              setFormName('');
              setAnonAllowed(true);
              setSections([emptySection(1)]);
            }
          }}>
            <i className={`bi ${showBuilder ? 'bi-x-lg' : 'bi-plus-lg'}`} />
            {showBuilder ? 'Cancel' : 'New Form'}
          </button>
        </div>

        {/* ── Form Builder ─── */}
        {showBuilder && (
            <div style={{ background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: 12, padding: 20, marginBottom: 24 }}>
              <h3 style={{ margin: '0 0 16px', fontSize: '1rem', fontWeight: 700, color: '#1f2937' }}>
                <i className="bi bi-pencil-square" style={{ marginRight: 6, color: '#6366f1' }} />
                {editingForm ? 'Edit Form' : 'Build New Form'}
              </h3>

              {saveError && <div className="hfd-alert hfd-alert-error"><i className="bi bi-exclamation-triangle" />{saveError}</div>}
              {saveOk && <div className="hfd-alert hfd-alert-success"><i className="bi bi-check-circle" />Form {editingForm ? 'updated' : 'created'} successfully!</div>}
              {scales.length === 0 && (
                  <div className="hfd-alert hfd-alert-warning">
                    <i className="bi bi-exclamation-triangle" />
                    No rating scales available. Please contact your administrator to create rating scales before creating feedback forms.
                  </div>
              )}

              <div className="hfd-grid-2" style={{ marginBottom: 14 }}>
                <div className="hfd-field">
                  <label className="hfd-label">Form Name <span>*</span></label>
                  <input className="hfd-input" value={formName} onChange={e => setFormName(e.target.value)} placeholder="e.g. Annual 360 Review 2025" />
                </div>
                <div className="hfd-field" style={{ display: 'flex', alignItems: 'center', paddingTop: 24 }}>
                  <label className="hfd-checkbox-label">
                    <input type="checkbox" checked={anonAllowed} onChange={e => setAnonAllowed(e.target.checked)} />
                    Allow anonymous responses
                  </label>
                </div>
              </div>

              {/* Sections */}
              {sections.map((sec, si) => (
                  <div key={si} className="hfd-section-block">
                    <div className="hfd-section-header">
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#6b7280', whiteSpace: 'nowrap' }}>Section {si + 1}</span>
                      <input
                          placeholder="Section title…"
                          value={sec.title}
                          onChange={e => updateSectionTitle(si, e.target.value)}
                      />
                      {sections.length > 1 && (
                          <button className="hfd-btn hfd-btn-danger hfd-btn-sm hfd-btn-icon" onClick={() => removeSection(si)}>
                            <i className="bi bi-trash" />
                          </button>
                      )}
                    </div>
                    <div className="hfd-section-body">
                      {(sec.questions ?? []).map((q, qi) => (
                          <div key={qi} className="hfd-question-row">
                            <input
                                className="hfd-input"
                                placeholder={`Question ${qi + 1}…`}
                                value={q.questionText}
                                onChange={e => updateQuestion(si, qi, { questionText: e.target.value })}
                                style={{ borderRadius: 7 }}
                            />
                            {scales.length > 0 && (
                                <select
                                    className="hfd-select"
                                    style={{ width: 140 }}
                                    value={q.ratingScaleId ?? ''}
                                    onChange={e => updateQuestion(si, qi, { ratingScaleId: e.target.value ? +e.target.value : null })}
                                >
                                  <option value="">Scale…</option>
                                  {scales.map(sc => (
                                      <option key={sc.id} value={sc.id}>
                                        {sc.description} (1–{sc.scales})
                                      </option>
                                  ))}
                                </select>
                            )}
                            <label className="hfd-checkbox-label">
                              <input type="checkbox" checked={q.isRequired} onChange={e => updateQuestion(si, qi, { isRequired: e.target.checked })} />
                              Required
                            </label>
                            {(sec.questions ?? []).length > 1 && (
                                <button className="hfd-btn hfd-btn-danger hfd-btn-sm hfd-btn-icon" onClick={() => removeQuestion(si, qi)}>
                                  <i className="bi bi-x" />
                                </button>
                            )}
                          </div>
                      ))}
                      <button className="hfd-btn hfd-btn-secondary hfd-btn-sm" style={{ marginTop: 4 }} onClick={() => addQuestion(si)}>
                        <i className="bi bi-plus" /> Add Question
                      </button>
                    </div>
                  </div>
              ))}

              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button className="hfd-btn hfd-btn-secondary hfd-btn-sm" onClick={addSection}>
                  <i className="bi bi-plus-circle" /> Add Section
                </button>
                <button className="hfd-btn hfd-btn-primary" onClick={handleSave} disabled={saving || scales.length === 0}>
                  {saving ? <><i className="bi bi-arrow-repeat hfd-spinner-icon" /> Saving…</> : <><i className="bi bi-floppy" /> Save Form</>}
                </button>
              </div>
            </div>
        )}

        {/* ── Forms list ─── */}
        {loading ? (
            <div className="hfd-spinner"><i className="bi bi-arrow-repeat" /> Loading forms…</div>
        ) : error ? (
            <div className="hfd-alert hfd-alert-error"><i className="bi bi-exclamation-triangle" />{error}</div>
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
                  <th>Anonymous</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
                </thead>
                <tbody>
                {forms.map((f, i) => (
                    <tr key={f.id}>
                      <td style={{ color: '#9ca3af', fontSize: '0.8rem' }}>{i + 1}</td>
                      <td><strong style={{ color: '#1f2937' }}>{f.formName}</strong></td>
                      <td>v{f.versionNumber}</td>
                      <td>{f.anonymousAllowed ? <span style={{ color: '#16a34a' }}><i className="bi bi-check-circle" /> Yes</span> : '—'}</td>
                      <td><span className={statusClass(f.status)}>{f.status}</span></td>
                      <td>
                        {getStatusActions(f)}
                      </td>
                    </tr>
                ))}
                </tbody>
              </table>
            </div>
        )}
      </div>
  );
}