import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { appraisalTemplateService } from '../../services/appraisalService';
import { signatureService } from '../../services/signatureService';
import type {
  AppraisalCriterionRequest,
  AppraisalSectionRequest,
  AppraisalTemplateRequest,
  AppraisalTemplateResponse,
} from '../../types/appraisal';
import type { Signature } from '../../types/signature';
import AppraisalRatingDots from '../../components/appraisal/AppraisalRatingDots';
import './appraisal.css';

const scoreRanges = [
  { range: '86-100', label: 'Outstanding', description: 'Performance exceptional and far exceeds expectations.' },
  { range: '71-85', label: 'Exceeds Requirements', description: 'Performance is consistent and clearly meets essential requirements.' },
  { range: '60-70', label: 'Meet Requirement', description: 'Performance is satisfactory and meets requirements of the job.' },
  { range: '40-59', label: 'Need Improvement', description: 'Performance is inconsistent. Supervision and training are needed.' },
  { range: '00-39', label: 'Unsatisfactory', description: 'Performance does not meet the minimum requirement of the job.' },
];

const displayDateTime = (value?: string | null) => {
  if (!value) return '-';
  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(parsed);
  }

  const [date, time] = value.split('T');
  const [year, month, day] = date.split('-');
  if (!year || !month || !day) return value;
  const hourMinute = time ? ` ${time.slice(0, 5)}` : '';
  return `${day}/${month}/${year}${hourMinute}`;
};

const makeCriteria = (criteriaText: string, sortOrder: number, description = ''): AppraisalCriterionRequest => ({
  criteriaText,
  description,
  sortOrder,
  maxRating: 5,
  ratingRequired: true,
  active: true,
});

const toEditableForm = (template: AppraisalTemplateResponse): AppraisalTemplateRequest => ({
  templateName: template.templateName,
  description: template.description ?? '',
  appraiseeSignatureId: template.appraiseeSignatureId ?? null,
  appraiserSignatureId: template.appraiserSignatureId ?? null,
  hrSignatureId: template.hrSignatureId ?? null,
  signatureDateFormat: template.signatureDateFormat ?? 'DD/MM/YYYY',
  formType: template.formType ?? 'ANNUAL',
  targetAllDepartments: true,
  departmentIds: [],
  sections: template.sections.map((section, sectionIndex) => ({
    id: section.id,
    sectionName: section.sectionName,
    description: section.description ?? '',
    sortOrder: section.sortOrder ?? sectionIndex + 1,
    active: section.active ?? true,
    criteria: section.criteria.map((criteria, criteriaIndex) => ({
      id: criteria.id,
      criteriaText: criteria.criteriaText,
      description: criteria.description ?? '',
      sortOrder: criteria.sortOrder ?? criteriaIndex + 1,
      maxRating: criteria.maxRating || 5,
      ratingRequired: criteria.ratingRequired ?? true,
      active: criteria.active ?? true,
    })),
  })),
});

const normalizeForm = (form: AppraisalTemplateRequest): AppraisalTemplateRequest => ({
  templateName: form.templateName.trim(),
  description: form.description?.trim() ?? '',
  appraiseeSignatureId: form.appraiseeSignatureId ?? null,
  appraiserSignatureId: form.appraiserSignatureId ?? null,
  hrSignatureId: form.hrSignatureId ?? null,
  signatureDateFormat: form.signatureDateFormat ?? 'DD/MM/YYYY',
  formType: 'ANNUAL',
  targetAllDepartments: true,
  departmentIds: [],
  sections: form.sections.map((section, sectionIndex) => ({
    ...section,
    sectionName: section.sectionName.trim(),
    description: section.description?.trim() ?? '',
    sortOrder: sectionIndex + 1,
    active: true,
    criteria: section.criteria.map((criteria, criteriaIndex) => ({
      ...criteria,
      criteriaText: criteria.criteriaText.trim(),
      description: criteria.description?.trim() ?? '',
      sortOrder: criteriaIndex + 1,
      maxRating: criteria.maxRating || 5,
      ratingRequired: true,
      active: true,
    })),
  })),
});

type TemplateRecordLocationState = {
  message?: string;
  templateId?: number;
};

const signatureDateFormats: Array<'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD'> = [
  'DD/MM/YYYY',
  'MM/DD/YYYY',
  'YYYY-MM-DD',
];

const formatDateByPattern = (date: Date, pattern: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD') => {
  const day = `${date.getDate()}`.padStart(2, '0');
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const year = `${date.getFullYear()}`;
  if (pattern === 'MM/DD/YYYY') return `${month}/${day}/${year}`;
  if (pattern === 'YYYY-MM-DD') return `${year}-${month}-${day}`;
  return `${day}/${month}/${year}`;
};

const AppraisalTemplateRecordsPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const routeState = location.state as TemplateRecordLocationState | null;
  const [templates, setTemplates] = useState<AppraisalTemplateResponse[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<AppraisalTemplateResponse | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<AppraisalTemplateResponse | null>(null);
  const [editForm, setEditForm] = useState<AppraisalTemplateRequest | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [signatures, setSignatures] = useState<Signature[]>([]);
  const [signatureLoading, setSignatureLoading] = useState(false);

  const totalCriteria = useMemo(() => (
    selectedTemplate?.sections.reduce((sum, section) => sum + section.criteria.length, 0) ?? 0
  ), [selectedTemplate]);

  const editTotalCriteria = useMemo(() => (
    editForm?.sections.reduce((sum, section) => sum + section.criteria.length, 0) ?? 0
  ), [editForm]);
  const signatureById = useMemo(() => {
    const map = new Map<number, Signature>();
    signatures.forEach((item) => map.set(item.id, item));
    return map;
  }, [signatures]);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const templateList = await appraisalTemplateService.list();
      setTemplates(templateList);
      setSelectedTemplate((previous) => previous ? templateList.find((template) => template.id === previous.id) ?? null : null);
      setEditingTemplate((previous) => previous ? templateList.find((template) => template.id === previous.id) ?? null : null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (routeState?.message) {
      setMessage(routeState.message);
      window.history.replaceState({}, document.title);
    }
    void loadTemplates();
  }, []);

  useEffect(() => {
    const loadSignatures = async () => {
      try {
        setSignatureLoading(true);
        const data = await signatureService.list();
        setSignatures(data);
      } catch {
        setSignatures([]);
      } finally {
        setSignatureLoading(false);
      }
    };
    void loadSignatures();
  }, []);

  const openView = async (templateId: number) => {
    setLoading(true);
    setMessage('');
    try {
      const template = await appraisalTemplateService.get(templateId);
      setSelectedTemplate(template);
      setEditingTemplate(null);
      setEditForm(null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Template form load failed.');
    } finally {
      setLoading(false);
    }
  };

  const useThisTemplate = (templateId: number) => {
    navigate(`/hr/appraisal/create?templateId=${templateId}`);
  };

  const openEdit = async (templateId: number) => {
    setLoading(true);
    setMessage('');
    try {
      const template = await appraisalTemplateService.get(templateId);
      setEditingTemplate(template);
      setEditForm(toEditableForm(template));
      setSelectedTemplate(null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Template form load failed.');
    } finally {
      setLoading(false);
    }
  };

  const validateEditForm = () => {
    if (!editForm?.templateName.trim()) return 'Template name is required.';
    if (!editForm.sections.length || editTotalCriteria === 0) return 'At least one section and one criteria are required.';
    for (const section of editForm.sections) {
      if (!section.sectionName.trim()) return 'Section name is required.';
      for (const criteria of section.criteria) {
        if (!criteria.criteriaText.trim()) return 'Criteria text is required.';
      }
    }
    return '';
  };

  const saveEdit = async () => {
    if (!editingTemplate || !editForm) return;
    const validationMessage = validateEditForm();
    if (validationMessage) {
      setMessage(validationMessage);
      return;
    }

    setLoading(true);
    setMessage('');
    try {
      const normalizedName = editForm.templateName.trim().toLowerCase();
      if (templates.some((template) => template.id !== editingTemplate.id && template.templateName.trim().toLowerCase() === normalizedName)) {
        setMessage('Template name already exists. Please use a different template name.');
        setLoading(false);
        return;
      }

      const updated = await appraisalTemplateService.updateDraft(editingTemplate.id, normalizeForm(editForm));
      setMessage(`Template form record updated to v${updated.versionNo ?? (editingTemplate.versionNo ?? 1) + 1}.`);
      setEditingTemplate(updated);
      setEditForm(toEditableForm(updated));
      await loadTemplates();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Template update failed.');
    } finally {
      setLoading(false);
    }
  };

  const updateSection = (sectionIndex: number, patch: Partial<AppraisalSectionRequest>) => {
    setEditForm((previous) => previous ? {
      ...previous,
      sections: previous.sections.map((section, index) => (
        index === sectionIndex ? { ...section, ...patch } : section
      )),
    } : previous);
  };

  const updateCriterion = (
    sectionIndex: number,
    criteriaIndex: number,
    patch: Partial<AppraisalCriterionRequest>,
  ) => {
    setEditForm((previous) => previous ? {
      ...previous,
      sections: previous.sections.map((section, index) => {
        if (index !== sectionIndex) return section;
        return {
          ...section,
          criteria: section.criteria.map((criteria, innerIndex) => (
            innerIndex === criteriaIndex ? { ...criteria, ...patch } : criteria
          )),
        };
      }),
    } : previous);
  };

  const addSection = () => {
    setEditForm((previous) => previous ? {
      ...previous,
      sections: [
        ...previous.sections,
        {
          sectionName: 'New Section',
          description: '',
          sortOrder: previous.sections.length + 1,
          active: true,
          criteria: [makeCriteria('New criteria', 1)],
        },
      ],
    } : previous);
  };

  const removeSection = (sectionIndex: number) => {
    setEditForm((previous) => previous ? {
      ...previous,
      sections: previous.sections.filter((_, index) => index !== sectionIndex),
    } : previous);
  };

  const addCriteria = (sectionIndex: number) => {
    setEditForm((previous) => previous ? {
      ...previous,
      sections: previous.sections.map((section, index) => {
        if (index !== sectionIndex) return section;
        return {
          ...section,
          criteria: [...section.criteria, makeCriteria('New criteria', section.criteria.length + 1)],
        };
      }),
    } : previous);
  };

  const removeCriteria = (sectionIndex: number, criteriaIndex: number) => {
    setEditForm((previous) => previous ? {
      ...previous,
      sections: previous.sections.map((section, index) => {
        if (index !== sectionIndex) return section;
        return {
          ...section,
          criteria: section.criteria.filter((_, innerIndex) => innerIndex !== criteriaIndex),
        };
      }),
    } : previous);
  };

  let globalNo = 0;
  let editGlobalNo = 0;

  return (
    <div className="appraisal-page appraisal-template-records-page">
      <div className="appraisal-page-header">
        <div>
          <h1>Template Form Records</h1>
          <p>View and edit reusable blank appraisal form templates. Appraisal Create will use one of these template records.</p>
        </div>
        <div className="appraisal-button-row" style={{ marginTop: 0 }}>
          <button className="appraisal-button secondary" type="button" disabled={loading} onClick={() => void loadTemplates()}>
            Refresh
          </button>
          <button className="appraisal-button primary" type="button" onClick={() => { window.location.href = '/hr/appraisal/templates'; }}>
            Create New Template
          </button>
        </div>
      </div>

      {message && <div className="appraisal-card appraisal-message-card">{message}</div>}

      <div className="appraisal-card">
        <div className="appraisal-form-block-header">
          <div>
            <h2>Template Form Record List</h2>
            <p className="appraisal-muted">Template records are general reusable form structures. Any appraisal can use the same template record; created records remain as history and cannot be deleted.</p>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="appraisal-table appraisal-cycle-record-table">
            <thead>
              <tr>
                <th>Template Name</th>
                <th>Description</th>
                <th>Sections</th>
                <th>Criteria</th>
                <th>Version</th>
                <th>Created Date & Time</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {templates.length === 0 && (
                <tr>
                  <td colSpan={7}>
                    <div className="appraisal-empty">No template form records yet.</div>
                  </td>
                </tr>
              )}
              {templates.map((template) => {
                const criteriaCount = template.sections.reduce((sum, section) => sum + section.criteria.length, 0);
                return (
                  <tr key={template.id}>
                    <td>
                      <strong>{template.templateName}</strong><br />
                      <span className="appraisal-muted">Reusable appraisal form template</span>
                    </td>
                    <td>{template.description || '-'}</td>
                    <td>{template.sections.length}</td>
                    <td>{criteriaCount}</td>
                    <td>v{template.versionNo ?? 1}</td>
                    <td>{displayDateTime(template.createdAt)}</td>
                    <td>
                      <div className="appraisal-button-row record-actions">
                        <button className="appraisal-button ghost" type="button" onClick={() => void openView(template.id)}>View Form</button>
                        <button className="appraisal-button secondary" type="button" onClick={() => void openEdit(template.id)}>Edit</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {editingTemplate && editForm && (
        <div className="appraisal-card appraisal-form-sheet appraisal-template-record-view">
          <div className="appraisal-template-banner center">
            <h2>Edit Template Form Record</h2>
            <p>ACE Data Systems Ltd. | Current Version v{editingTemplate.versionNo ?? 1}</p>
          </div>

          <div className="appraisal-form-block">
            <div className="appraisal-form-block-header">
              <div>
                <h3>Template Setup</h3>
                <p className="appraisal-muted">Save changes to update this template record and move the version forward.</p>
              </div>
              <button className="appraisal-button ghost" type="button" onClick={() => { setEditingTemplate(null); setEditForm(null); }}>Close Edit</button>
            </div>
            <div className="appraisal-inline-grid two">
              <label className="appraisal-field">
                <span>Template Name</span>
                <input value={editForm.templateName} onChange={(event) => setEditForm({ ...editForm, templateName: event.target.value })} />
              </label>
              <label className="appraisal-field">
                <span>Description</span>
                <input value={editForm.description ?? ''} onChange={(event) => setEditForm({ ...editForm, description: event.target.value })} />
              </label>
              <label className="appraisal-field">
                <span>Appraisee Signature</span>
                <select
                  value={editForm.appraiseeSignatureId ?? ''}
                  onChange={(event) => setEditForm({ ...editForm, appraiseeSignatureId: event.target.value ? Number(event.target.value) : null })}
                >
                  <option value="">{signatureLoading ? 'Loading signatures...' : 'Select signature'}</option>
                  {signatures.map((item) => (
                    <option key={item.id} value={item.id}>{item.name}</option>
                  ))}
                </select>
              </label>
              <label className="appraisal-field">
                <span>Appraiser Signature</span>
                <select
                  value={editForm.appraiserSignatureId ?? ''}
                  onChange={(event) => setEditForm({ ...editForm, appraiserSignatureId: event.target.value ? Number(event.target.value) : null })}
                >
                  <option value="">{signatureLoading ? 'Loading signatures...' : 'Select signature'}</option>
                  {signatures.map((item) => (
                    <option key={item.id} value={item.id}>{item.name}</option>
                  ))}
                </select>
              </label>
              <label className="appraisal-field">
                <span>HR Signature</span>
                <select
                  value={editForm.hrSignatureId ?? ''}
                  onChange={(event) => setEditForm({ ...editForm, hrSignatureId: event.target.value ? Number(event.target.value) : null })}
                >
                  <option value="">{signatureLoading ? 'Loading signatures...' : 'Select signature'}</option>
                  {signatures.map((item) => (
                    <option key={item.id} value={item.id}>{item.name}</option>
                  ))}
                </select>
              </label>
              <label className="appraisal-field">
                <span>Date Format</span>
                <select
                  value={editForm.signatureDateFormat ?? 'DD/MM/YYYY'}
                  onChange={(event) => setEditForm({ ...editForm, signatureDateFormat: event.target.value as AppraisalTemplateRequest['signatureDateFormat'] })}
                >
                  {signatureDateFormats.map((format) => (
                    <option key={format} value={format}>{format}</option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <div className="appraisal-form-block">
            <div className="appraisal-form-block-header">
              <div>
                <h3>Evaluations</h3>
                <p className="appraisal-muted">Edit sections and criteria. Rating circles remain disabled in template setup.</p>
              </div>
              <button className="appraisal-button secondary" type="button" onClick={addSection}>Add Section</button>
            </div>

            {editForm.sections.map((section, sectionIndex) => (
              <div className="appraisal-section-card" key={`${section.sectionName}-${sectionIndex}`}>
                <div className="appraisal-section-header">
                  <div className="appraisal-section-title-wrap">
                    <input
                      className="appraisal-section-title-input"
                      value={section.sectionName}
                      onChange={(event) => updateSection(sectionIndex, { sectionName: event.target.value })}
                    />
                    <small>{section.criteria.length} criteria</small>
                  </div>
                  <div className="appraisal-button-row compact">
                    <button className="appraisal-button ghost" type="button" onClick={() => addCriteria(sectionIndex)}>Add Criteria</button>
                    <button className="appraisal-button danger" type="button" onClick={() => removeSection(sectionIndex)}>Delete Section</button>
                  </div>
                </div>

                <div className="appraisal-template-table-wrap">
                  <table className="appraisal-template-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Criteria</th>
                        <th>Description</th>
                        <th>Rating 1-5</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {section.criteria.map((criteria, criteriaIndex) => {
                        editGlobalNo += 1;
                        return (
                          <tr key={`${criteria.criteriaText}-${criteriaIndex}`}>
                            <td className="appraisal-center-cell">{editGlobalNo}</td>
                            <td>
                              <input
                                className="appraisal-table-input"
                                value={criteria.criteriaText}
                                onChange={(event) => updateCriterion(sectionIndex, criteriaIndex, { criteriaText: event.target.value })}
                              />
                            </td>
                            <td>
                              <input
                                className="appraisal-table-input"
                                value={criteria.description ?? ''}
                                onChange={(event) => updateCriterion(sectionIndex, criteriaIndex, { description: event.target.value })}
                              />
                            </td>
                            <td><AppraisalRatingDots value={null} max={criteria.maxRating || 5} disabled /></td>
                            <td>
                              <button className="appraisal-button danger small" type="button" onClick={() => removeCriteria(sectionIndex, criteriaIndex)}>
                                Delete
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}

            <div className="appraisal-summary-grid">
              <div className="appraisal-summary-card">
                <strong>Total Criteria</strong>
                <span>{editTotalCriteria}</span>
              </div>
              <div className="appraisal-summary-card">
                <strong>Next Version</strong>
                <span>v{(editingTemplate.versionNo ?? 1) + 1}</span>
              </div>
            </div>

            <div className="appraisal-button-row">
              <button className="appraisal-button primary" type="button" disabled={loading} onClick={() => void saveEdit()}>
                Save Changes
              </button>
              <button className="appraisal-button ghost" type="button" onClick={() => { setEditingTemplate(null); setEditForm(null); }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedTemplate && (
        <div className="appraisal-card appraisal-form-sheet appraisal-template-record-view">
          <div className="appraisal-template-banner center">
            <h2>{selectedTemplate.templateName}</h2>
            <p>ACE Data Systems Ltd. | Template Record Preview</p>
          </div>

          <div className="appraisal-form-block">
            <div className="appraisal-form-block-header">
              <div>
                <h3>Template Details</h3>
                <p className="appraisal-muted">Read-only blank template preview. Employee information and appraisal period dates are not stored in template records. Rating circles are visible but scores are not selected here.</p>
              </div>
              <div className="appraisal-button-row compact">
                <button className="appraisal-button primary" type="button" onClick={() => useThisTemplate(selectedTemplate.id)}>Use This Template</button>
                <button className="appraisal-button ghost" type="button" onClick={() => setSelectedTemplate(null)}>Close</button>
              </div>
            </div>
            <div className="appraisal-detail-grid">
              <div><strong>Version</strong><span>v{selectedTemplate.versionNo ?? 1}</span></div>
              <div><strong>Sections</strong><span>{selectedTemplate.sections.length}</span></div>
              <div><strong>Criteria</strong><span>{totalCriteria}</span></div>
              <div><strong>Created</strong><span>{displayDateTime(selectedTemplate.createdAt)}</span></div>
            </div>
            {selectedTemplate.description && (
              <div className="appraisal-review-block">
                <h4>Description</h4>
                <p>{selectedTemplate.description}</p>
              </div>
            )}
          </div>

          <div className="appraisal-form-block">
            <div className="appraisal-form-block-header">
              <div>
                <h3>Evaluations</h3>
                <p className="appraisal-muted">Sections and criteria saved in this template form record.</p>
              </div>
            </div>

            {selectedTemplate.sections.length === 0 && (
              <div className="appraisal-empty">No sections or criteria were found for this template.</div>
            )}

            {selectedTemplate.sections.map((section) => (
              <div className="appraisal-section-card" key={section.id}>
                <div className="appraisal-section-header">
                  <div className="appraisal-section-title-wrap">
                    <strong className="appraisal-section-readonly-title">{section.sectionName}</strong>
                    <small>{section.criteria.length} criteria</small>
                  </div>
                </div>

                <div className="appraisal-template-table-wrap">
                  <table className="appraisal-template-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Criteria</th>
                        <th>Description</th>
                        <th>Rating 1-5</th>
                      </tr>
                    </thead>
                    <tbody>
                      {section.criteria.map((criteria) => {
                        globalNo += 1;
                        return (
                          <tr key={criteria.id}>
                            <td className="appraisal-center-cell">{globalNo}</td>
                            <td>{criteria.criteriaText}</td>
                            <td>{criteria.description || '-'}</td>
                            <td><AppraisalRatingDots value={null} max={criteria.maxRating || 5} disabled /></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>

          <div className="appraisal-summary-grid">
            <div className="appraisal-summary-card">
              <strong>Total Criteria</strong>
              <span>{totalCriteria}</span>
            </div>
            <div className="appraisal-summary-card">
              <strong>Score Formula</strong>
              <span>Total points / (answered criteria x 5) x 100</span>
            </div>
          </div>

          <div className="appraisal-template-table-wrap score-band-wrap">
            <table className="appraisal-template-table score-band-table">
              <thead>
                <tr>
                  <th>Score</th>
                  <th>Rating</th>
                  <th>Explanation</th>
                </tr>
              </thead>
              <tbody>
                {scoreRanges.map((score) => (
                  <tr key={score.range}>
                    <td>{score.range}</td>
                    <td><span className="appraisal-status gray">{score.label}</span></td>
                    <td>{score.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>


          <div className="appraisal-signature-grid">
            <SignatureDisplayBlock
              label="Signature of Appraisee & Date"
              signature={selectedTemplate.appraiseeSignatureId ? signatureById.get(selectedTemplate.appraiseeSignatureId) : undefined}
              dateText={formatDateByPattern(new Date(), selectedTemplate.signatureDateFormat ?? 'DD/MM/YYYY')}
            />
            <SignatureDisplayBlock
              label="Signature of Appraiser & Date"
              signature={selectedTemplate.appraiserSignatureId ? signatureById.get(selectedTemplate.appraiserSignatureId) : undefined}
              dateText={formatDateByPattern(new Date(), selectedTemplate.signatureDateFormat ?? 'DD/MM/YYYY')}
            />
            <SignatureDisplayBlock
              label="HR Signature / Date / Designation"
              signature={selectedTemplate.hrSignatureId ? signatureById.get(selectedTemplate.hrSignatureId) : undefined}
              dateText={formatDateByPattern(new Date(), selectedTemplate.signatureDateFormat ?? 'DD/MM/YYYY')}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default AppraisalTemplateRecordsPage;

type SignatureDisplayBlockProps = {
  label: string;
  signature?: Signature;
  dateText: string;
};

const SignatureDisplayBlock = ({ label, signature, dateText }: SignatureDisplayBlockProps) => {
  const src = signature
    ? (signature.imageData.startsWith('data:') ? signature.imageData : `data:${signature.imageType};base64,${signature.imageData}`)
    : null;
  return (
    <div className="appraisal-signature-slot">
      {src ? (
        <img src={src} alt={signature?.name ?? 'signature'} className="appraisal-signature-image" />
      ) : (
        <span className="appraisal-signature-placeholder">{label}</span>
      )}
      <p className="appraisal-signature-date">Date: {dateText}</p>
      {signature ? <small className="appraisal-signature-name">{signature.name}</small> : null}
    </div>
  );
};
