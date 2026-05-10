import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { appraisalTemplateService } from '../../services/appraisalService';
import { signatureService } from '../../services/signatureService';
import { extractApiErrorMessage } from '../../services/apiError';
import type {
  AppraisalCriterionRequest,
  AppraisalScoreBandRequest,
  AppraisalSectionRequest,
  AppraisalTemplateRequest,
  AppraisalTemplateResponse,
} from '../../types/appraisal';
import type { Signature } from '../../types/signature';
import AppraisalRatingDots from '../../components/appraisal/AppraisalRatingDots';
import './appraisal.css';

type TemplateModalMode = 'create' | 'edit' | 'view' | null;

type TemplateRecordLocationState = {
  message?: string;
  templateId?: number;
};


type ScoreBandLike = {
  minScore: number;
  maxScore: number;
  label: string;
  description?: string;
  sortOrder: number;
  active: boolean;
};

const defaultScoreBands = (): AppraisalScoreBandRequest[] => [
  { minScore: 86, maxScore: 100, label: 'Outstanding', description: 'Performance exceptional and far exceeds expectations.', sortOrder: 1, active: true },
  { minScore: 71, maxScore: 85, label: 'Exceeds Requirements', description: 'Performance is consistent and clearly meets essential requirements.', sortOrder: 2, active: true },
  { minScore: 60, maxScore: 70, label: 'Meet Requirement', description: 'Performance is satisfactory and meets requirements of the job.', sortOrder: 3, active: true },
  { minScore: 40, maxScore: 59, label: 'Need Improvement', description: 'Performance is inconsistent. Supervision and training are needed.', sortOrder: 4, active: true },
  { minScore: 0, maxScore: 39, label: 'Unsatisfactory', description: 'Performance does not meet the minimum requirement of the job.', sortOrder: 5, active: true },
];


const uniqueScoreBands = <T extends ScoreBandLike>(bands: T[]) => {
  const unique = new Map<string, T>();
  for (const band of bands) {
    const key = `${band.minScore}-${band.maxScore}-${band.label.trim().toLowerCase()}`;
    if (!unique.has(key)) {
      unique.set(key, band);
    }
  }
  return Array.from(unique.values()).sort((a, b) => a.sortOrder - b.sortOrder);
};

const makeCriteria = (criteriaText: string, sortOrder: number): AppraisalCriterionRequest => ({
  criteriaText,
  description: '',
  sortOrder,
  maxRating: 5,
  ratingRequired: true,
  active: true,
});

const defaultSections = (): AppraisalSectionRequest[] => [
  {
    sectionName: 'Job Knowledge / Technical Skills',
    description: '',
    sortOrder: 1,
    active: true,
    criteria: [
      makeCriteria('Process relevant knowledge of work.', 1),
      makeCriteria('Knowledge / technical competence / skill in the area of specialization.', 2),
    ],
  },
  {
    sectionName: 'Accountability',
    description: '',
    sortOrder: 2,
    active: true,
    criteria: [
      makeCriteria('Accomplish the Personal Business Objectives.', 1),
      makeCriteria('Committed to work.', 2),
      makeCriteria('Plans and organizes work effectively.', 3),
      makeCriteria('Proactive and takes initiative.', 4),
      makeCriteria('Has a sense of urgency in acting on work matters.', 5),
      makeCriteria('Willing to learn.', 6),
    ],
  },
  {
    sectionName: 'Problem Solving & Supervision',
    description: '',
    sortOrder: 3,
    active: true,
    criteria: [
      makeCriteria('Helps resolve staff problems related to work.', 1),
      makeCriteria('Handles problem situations effectively.', 2),
      makeCriteria('Is a positive role model for other staff.', 3),
      makeCriteria('Effectively supervises the work of subordinates.', 4),
    ],
  },
  {
    sectionName: 'Innovation',
    description: '',
    sortOrder: 4,
    active: true,
    criteria: [
      makeCriteria('Develops team members.', 1),
      makeCriteria('Shows originality and creativity in thinking.', 2),
      makeCriteria('Meets challenges with resourcefulness.', 3),
      makeCriteria('Generates suggestions for improving work.', 4),
      makeCriteria('Develops innovative approaches and ideas.', 5),
    ],
  },
  {
    sectionName: 'Team Work',
    description: '',
    sortOrder: 5,
    active: true,
    criteria: [
      makeCriteria('Able to work independently.', 1),
      makeCriteria('Willing to work with others in a team.', 2),
      makeCriteria('Share information and/or skills with colleague.', 3),
    ],
  },
  {
    sectionName: 'Quality Work',
    description: '',
    sortOrder: 6,
    active: true,
    criteria: [
      makeCriteria("Understands the company's norms.", 1),
      makeCriteria('Is accurate, thorough and careful with work performed.', 2),
      makeCriteria("Sustain the company's quality.", 3),
      makeCriteria('Seeks to continually improve processes and work methods.', 4),
    ],
  },
  {
    sectionName: 'Loyalty',
    description: '',
    sortOrder: 7,
    active: true,
    criteria: [
      makeCriteria('Able to work with minimum supervision.', 1),
      makeCriteria('Is trustworthy, responsible, and reliable.', 2),
      makeCriteria('Is willing to accept new responsibilities.', 3),
    ],
  },
  {
    sectionName: 'Attendance / Office Rules & Regulation Compliance',
    description: '',
    sortOrder: 8,
    active: true,
    criteria: [
      makeCriteria('Has good attendance.', 1),
      makeCriteria("Observation of office's rules and regulation.", 2),
      makeCriteria('Meets all compliance requirements without deductions.', 3),
    ],
  },
];

const emptyTemplate = (): AppraisalTemplateRequest => ({
  templateName: '',
  description: '',
  appraiseeSignatureId: null,
  appraiserSignatureId: null,
  hrSignatureId: null,
  signatureDateFormat: 'DD/MM/YYYY',
  formType: 'ANNUAL',
  targetAllDepartments: true,
  departmentIds: [],
  sections: defaultSections(),
  scoreBands: defaultScoreBands(),
});


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

const getSignatureImageSrc = (signature?: Signature) => {
  if (!signature) return null;
  return signature.imageData.startsWith('data:')
    ? signature.imageData
    : `data:${signature.imageType};base64,${signature.imageData}`;
};

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
  return value;
};

type SignatureDisplayBlockProps = {
  label: string;
  signature?: Signature;
  dateText: string;
};

const SignatureDisplayBlock = ({ label, signature, dateText }: SignatureDisplayBlockProps) => {
  const src = getSignatureImageSrc(signature);
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
      description: '',
      sortOrder: criteria.sortOrder ?? criteriaIndex + 1,
      maxRating: criteria.maxRating || 5,
      ratingRequired: criteria.ratingRequired ?? true,
      active: criteria.active ?? true,
    })),
  })),
  scoreBands: uniqueScoreBands(template.scoreBands?.length ? template.scoreBands : defaultScoreBands()).map((band, index) => ({
    id: band.id,
    minScore: band.minScore,
    maxScore: band.maxScore,
    label: band.label,
    description: band.description ?? '',
    sortOrder: band.sortOrder ?? index + 1,
    active: band.active ?? true,
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
      description: '',
      sortOrder: criteriaIndex + 1,
      maxRating: criteria.maxRating || 5,
      ratingRequired: true,
      active: true,
    })),
  })),
  scoreBands: uniqueScoreBands(form.scoreBands?.length ? form.scoreBands : defaultScoreBands()).map((band, index) => ({
    ...band,
    minScore: Number(band.minScore),
    maxScore: Number(band.maxScore),
    label: band.label,
    description: band.description ?? '',
    sortOrder: index + 1,
    active: true,
  })),
});

const AppraisalTemplateRecordsPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const routeState = location.state as TemplateRecordLocationState | null;
  const [templates, setTemplates] = useState<AppraisalTemplateResponse[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<AppraisalTemplateResponse | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<AppraisalTemplateResponse | null>(null);
  const [form, setForm] = useState<AppraisalTemplateRequest>(() => emptyTemplate());
  const [modalMode, setModalMode] = useState<TemplateModalMode>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');
  const [signatures, setSignatures] = useState<Signature[]>([]);
  const [signatureLoading, setSignatureLoading] = useState(false);

  const formTotalCriteria = useMemo(() => form.sections.reduce((sum, section) => sum + section.criteria.length, 0), [form.sections]);
  const selectedTotalCriteria = useMemo(() => selectedTemplate?.sections.reduce((sum, section) => sum + section.criteria.length, 0) ?? 0, [selectedTemplate]);
  const signatureById = useMemo(() => {
    const map = new Map<number, Signature>();
    signatures.forEach((item) => map.set(item.id, item));
    return map;
  }, [signatures]);

  const setAlert = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
    setMessage(text);
    setMessageType(type);
  };

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const templateList = await appraisalTemplateService.list();
      setTemplates(templateList);
    } catch (error) {
      setAlert(error instanceof Error ? error.message : 'Template forms load failed.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (routeState?.message) {
      setAlert(routeState.message, 'success');
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

  useEffect(() => {
    if (searchParams.get('openCreate') === '1') {
      openCreate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const closeModal = () => {
    setModalMode(null);
    setSelectedTemplate(null);
    setEditingTemplate(null);
    setForm(emptyTemplate());
    setSearchParams({});
  };

  const openCreate = () => {
    setForm(emptyTemplate());
    setSelectedTemplate(null);
    setEditingTemplate(null);
    setModalMode('create');
  };

  const openView = async (templateId: number) => {
    setLoading(true);
    try {
      const template = await appraisalTemplateService.get(templateId);
      setSelectedTemplate(template);
      setEditingTemplate(null);
      setModalMode('view');
    } catch (error) {
      setAlert(error instanceof Error ? error.message : 'Template form load failed.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const openEdit = async (templateId: number) => {
    setLoading(true);
    try {
      const template = await appraisalTemplateService.get(templateId);
      setEditingTemplate(template);
      setSelectedTemplate(null);
      setForm(toEditableForm(template));
      setModalMode('edit');
    } catch (error) {
      setAlert(error instanceof Error ? error.message : 'Template form load failed.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const useThisTemplate = (templateId: number) => {
    navigate(`/hr/appraisal/cycles?templateId=${templateId}&openCreate=1`);
  };

  const validateTemplateForm = () => {
    if (!form.templateName.trim()) return 'Template name is required.';
    if (!form.description?.trim()) return 'Description is required.';
    if (!form.sections.length || formTotalCriteria === 0) return 'At least one section and one criteria are required.';
    for (const section of form.sections) {
      if (!section.sectionName.trim()) return 'Section name is required.';
      if (!section.criteria.length) return `At least one criteria is required in ${section.sectionName || 'each section'}.`;
      for (const criteria of section.criteria) {
        if (!criteria.criteriaText.trim()) return 'Criteria text is required.';
      }
    }
    const bands = uniqueScoreBands(form.scoreBands?.length ? form.scoreBands : defaultScoreBands());
    for (const band of bands) {
      if (Number.isNaN(Number(band.minScore)) || Number.isNaN(Number(band.maxScore))) return 'Score range values must be numbers.';
      if (Number(band.minScore) < 0 || Number(band.maxScore) > 100 || Number(band.minScore) > Number(band.maxScore)) {
        return 'Score ranges must be valid values between 0 and 100.';
      }
    }
    return '';
  };

  const createTemplate = async () => {
    const validationMessage = validateTemplateForm();
    if (validationMessage) {
      setAlert(validationMessage, 'error');
      return;
    }
    setLoading(true);
    try {
      const created = await appraisalTemplateService.create(normalizeForm(form));
      setAlert(`Template form "${created.templateName}" created successfully.`, 'success');
      closeModal();
      await loadTemplates();
    } catch (error) {
      setAlert(extractApiErrorMessage(error, 'Form template create failed.'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const saveEdit = async () => {
    if (!editingTemplate) return;
    const validationMessage = validateTemplateForm();
    if (validationMessage) {
      setAlert(validationMessage, 'error');
      return;
    }
    setLoading(true);
    try {
      const updated = await appraisalTemplateService.updateDraft(editingTemplate.id, normalizeForm(form));
      setAlert(`Template form "${updated.templateName}" updated successfully to v${updated.versionNo ?? (editingTemplate.versionNo ?? 1) + 1}.`, 'success');
      closeModal();
      await loadTemplates();
    } catch (error) {
      setAlert(extractApiErrorMessage(error, 'Template update failed.'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const updateSection = (sectionIndex: number, patch: Partial<AppraisalSectionRequest>) => {
    setForm((previous) => ({
      ...previous,
      sections: previous.sections.map((section, index) => (index === sectionIndex ? { ...section, ...patch } : section)),
    }));
  };

  const updateCriterion = (sectionIndex: number, criteriaIndex: number, patch: Partial<AppraisalCriterionRequest>) => {
    setForm((previous) => ({
      ...previous,
      sections: previous.sections.map((section, index) => {
        if (index !== sectionIndex) return section;
        return {
          ...section,
          criteria: section.criteria.map((criteria, innerIndex) => (innerIndex === criteriaIndex ? { ...criteria, ...patch } : criteria)),
        };
      }),
    }));
  };

  const addSection = () => {
    setForm((previous) => ({
      ...previous,
      sections: [
        ...previous.sections,
        {
          sectionName: '',
          description: '',
          sortOrder: previous.sections.length + 1,
          active: true,
          criteria: [makeCriteria('', 1)],
        },
      ],
    }));
  };

  const removeSection = (sectionIndex: number) => {
    setForm((previous) => ({ ...previous, sections: previous.sections.filter((_, index) => index !== sectionIndex) }));
  };

  const addCriteria = (sectionIndex: number) => {
    setForm((previous) => ({
      ...previous,
      sections: previous.sections.map((section, index) => {
        if (index !== sectionIndex) return section;
        return { ...section, criteria: [...section.criteria, makeCriteria('', section.criteria.length + 1)] };
      }),
    }));
  };

  const removeCriteria = (sectionIndex: number, criteriaIndex: number) => {
    setForm((previous) => ({
      ...previous,
      sections: previous.sections.map((section, index) => {
        if (index !== sectionIndex) return section;
        return { ...section, criteria: section.criteria.filter((_, innerIndex) => innerIndex !== criteriaIndex) };
      }),
    }));
  };

  const updateScoreBand = (bandIndex: number, patch: Partial<AppraisalScoreBandRequest>) => {
    setForm((previous) => ({
      ...previous,
      scoreBands: uniqueScoreBands(previous.scoreBands?.length ? previous.scoreBands : defaultScoreBands()).map((band, index) => (
        index === bandIndex ? { ...band, ...patch } : band
      )),
    }));
  };

  const renderScoreBandEditor = (bands: AppraisalScoreBandRequest[], readOnly = false) => (
    <div className="appraisal-score-band-editor">
      <div className="appraisal-score-band-head">
        <span>Score</span>
        <span>Rating</span>
        <span>Explanation</span>
      </div>
      {bands.map((band, index) => (
        <div className="appraisal-score-band-row" key={`${band.label}-${index}`}>
          <div className="appraisal-score-range-inputs">
            {readOnly ? (
              <strong>{String(band.minScore).padStart(2, '0')}-{band.maxScore}</strong>
            ) : (
              <>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={band.minScore}
                  onChange={(event) => updateScoreBand(index, { minScore: Number(event.target.value) })}
                />
                <span>-</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={band.maxScore}
                  onChange={(event) => updateScoreBand(index, { maxScore: Number(event.target.value) })}
                />
              </>
            )}
          </div>
          <strong>{band.label}</strong>
          <span className="appraisal-muted">{band.description}</span>
        </div>
      ))}
    </div>
  );



  const renderTemplateSignatureSection = (readOnly = false) => {
    const appraiseeSignature = form.appraiseeSignatureId ? signatureById.get(form.appraiseeSignatureId) : undefined;
    const appraiserSignature = form.appraiserSignatureId ? signatureById.get(form.appraiserSignatureId) : undefined;
    const hrSignature = form.hrSignatureId ? signatureById.get(form.hrSignatureId) : undefined;
    const dateFormat = form.signatureDateFormat ?? 'DD/MM/YYYY';
    const dateText = formatDateByPattern(new Date(), dateFormat);

    return (
      <div className="appraisal-form-block">
        <h3>Signature Section</h3>
        {!readOnly && <p className="appraisal-muted">Choose saved signatures and date format to print directly in this template.</p>}
        {!readOnly && (
          <div className="appraisal-inline-grid two appraisal-signature-controls">
            <label className="appraisal-field">
              <span>Appraisee Signature</span>
              <select
                value={form.appraiseeSignatureId ?? ''}
                onChange={(event) => setForm({ ...form, appraiseeSignatureId: event.target.value ? Number(event.target.value) : null })}
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
                value={form.appraiserSignatureId ?? ''}
                onChange={(event) => setForm({ ...form, appraiserSignatureId: event.target.value ? Number(event.target.value) : null })}
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
                value={form.hrSignatureId ?? ''}
                onChange={(event) => setForm({ ...form, hrSignatureId: event.target.value ? Number(event.target.value) : null })}
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
                value={dateFormat}
                onChange={(event) => setForm({ ...form, signatureDateFormat: event.target.value as AppraisalTemplateRequest['signatureDateFormat'] })}
              >
                {signatureDateFormats.map((format) => (
                  <option key={format} value={format}>{format}</option>
                ))}
              </select>
            </label>
          </div>
        )}
        <div className="appraisal-signature-grid appraisal-template-signature-grid">
          <SignatureDisplayBlock label="Signature of Appraisee & Date" signature={appraiseeSignature} dateText={dateText} />
          <SignatureDisplayBlock label="Signature of Appraiser & Date" signature={appraiserSignature} dateText={dateText} />
          <SignatureDisplayBlock label="HR Signature / Date / Designation" signature={hrSignature} dateText={dateText} />
        </div>
      </div>
    );
  };

  const renderTemplateSignaturePreview = () => {
    if (!selectedTemplate) return null;
    const dateFormat = selectedTemplate.signatureDateFormat ?? 'DD/MM/YYYY';
    const dateText = formatDateByPattern(new Date(), dateFormat);
    return (
      <div className="appraisal-form-block">
        <h3>Signature Section</h3>
        <div className="appraisal-signature-grid appraisal-template-signature-grid">
          <SignatureDisplayBlock
            label="Signature of Appraisee & Date"
            signature={selectedTemplate.appraiseeSignatureId ? signatureById.get(selectedTemplate.appraiseeSignatureId) : undefined}
            dateText={dateText}
          />
          <SignatureDisplayBlock
            label="Signature of Appraiser & Date"
            signature={selectedTemplate.appraiserSignatureId ? signatureById.get(selectedTemplate.appraiserSignatureId) : undefined}
            dateText={dateText}
          />
          <SignatureDisplayBlock
            label="HR Signature / Date / Designation"
            signature={selectedTemplate.hrSignatureId ? signatureById.get(selectedTemplate.hrSignatureId) : undefined}
            dateText={dateText}
          />
        </div>
      </div>
    );
  };

  const renderTemplateEditor = () => {
    let globalNo = 0;
    return (
      <>
        <div className="appraisal-form-block">
          <h3>Template Setup</h3>
          <div className="appraisal-inline-grid two">
            <label className="appraisal-field">
              <span>Template Name <b className="appraisal-required">*</b></span>
              <input value={form.templateName} onChange={(event) => setForm({ ...form, templateName: event.target.value })} placeholder="Enter template name" />
            </label>
            <label className="appraisal-field">
              <span>Description <b className="appraisal-required">*</b></span>
              <input value={form.description ?? ''} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Enter template purpose" />
            </label>
          </div>
          <p className="appraisal-muted">This template stores only reusable form structure. Employee data, dates, ratings, and actual total points are filled later in the appraisal cycle review flow.</p>
        </div>

        <div className="appraisal-form-block">
          <div className="appraisal-form-block-header">
            <div>
              <h3>Evaluations</h3>
              <p className="appraisal-muted">Add sections and criteria. Rating circles are shown for design only and are disabled in template setup.</p>
            </div>
          </div>

          {form.sections.map((section, sectionIndex) => (
            <div className="appraisal-section-card" key={`section-${sectionIndex}`}>
              <div className="appraisal-section-header">
                <div className="appraisal-section-title-wrap">
                  <input
                    className="appraisal-section-title-input"
                    value={section.sectionName}
                    onChange={(event) => updateSection(sectionIndex, { sectionName: event.target.value })}
                    placeholder="Section name"
                  />
                  <small>{section.criteria.length} criteria</small>
                </div>
                <div className="appraisal-button-row compact">
                  <button className="appraisal-button ghost" type="button" onClick={() => addCriteria(sectionIndex)}>Add Row</button>
                  <button className="appraisal-button danger" type="button" onClick={() => removeSection(sectionIndex)}>Delete Section</button>
                </div>
              </div>
              <div className="appraisal-template-table-wrap">
                <table className="appraisal-template-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Criteria <b className="appraisal-required">*</b></th>
                      <th>Rating 1-5</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {section.criteria.map((criteria, criteriaIndex) => {
                      globalNo += 1;
                      return (
                        <tr key={`criteria-${sectionIndex}-${criteriaIndex}`}>
                          <td className="appraisal-center-cell">{globalNo}</td>
                          <td>
                            <input value={criteria.criteriaText} onChange={(event) => updateCriterion(sectionIndex, criteriaIndex, { criteriaText: event.target.value })} placeholder="Enter criteria" />
                          </td>
                          <td><AppraisalRatingDots value={null} max={criteria.maxRating || 5} disabled /></td>
                          <td className="appraisal-center-cell">
                            <button className="appraisal-button danger tiny" type="button" onClick={() => removeCriteria(sectionIndex, criteriaIndex)}>X</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
          <button className="appraisal-button secondary appraisal-add-section-bottom" type="button" onClick={addSection}>Add Section</button>
        </div>

        <div className="appraisal-form-block">
          <h3>Score Calculation</h3>
          <div className="appraisal-score-formula-card in-block">
            <div className="appraisal-total-points-strip">
              <strong>Total Points</strong>
              <span>Auto-filled after PM submits rating points.</span>
            </div>
            <table className="appraisal-score-formula-table">
              <thead>
                <tr>
                  <th>Analysis</th>
                  <th>Formula</th>
                  <th>Score</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>Total Points</strong></td>
                  <td>
                    <div className="formula-main">Total Point</div>
                    <div className="formula-divider" />
                    <div>Number of Questions Answered × 5</div>
                    <div className="formula-multiply">× 100</div>
                  </td>
                  <td>Auto calculated from PM ratings</td>
                </tr>
              </tbody>
            </table>
            <p className="appraisal-muted">Total criteria: {formTotalCriteria}. Actual Total Points and Score are shown only after PM gives ratings.</p>
          </div>
        </div>

        <div className="appraisal-form-block">
          <h3>Score Guide</h3>
          <p className="appraisal-muted">Customize score ranges only. Rating labels and explanations stay as the standard appraisal guide.</p>
          {renderScoreBandEditor(uniqueScoreBands(form.scoreBands?.length ? form.scoreBands : defaultScoreBands()))}
        </div>

        {renderTemplateSignatureSection()}
      </>
    );
  };

  const renderTemplatePreview = () => {
    if (!selectedTemplate) return null;
    let globalNo = 0;
    const bands = uniqueScoreBands(selectedTemplate.scoreBands?.length ? selectedTemplate.scoreBands : defaultScoreBands());
    return (
      <>
        <div className="appraisal-template-summary-card">
          <div><strong>Template Name</strong><span>{selectedTemplate.templateName}</span></div>
          <div><strong>Description</strong><span>{selectedTemplate.description || '-'}</span></div>
          <div><strong>Version</strong><span>v{selectedTemplate.versionNo ?? 1}</span></div>
          <div><strong>Created At</strong><span>{displayDateTime(selectedTemplate.createdAt)}</span></div>
        </div>

        <div className="appraisal-form-block">
          <h3>Evaluations</h3>
          {selectedTemplate.sections.map((section) => (
            <div className="appraisal-section-card" key={section.id}>
              <div className="appraisal-section-header">
                <div className="appraisal-section-title-wrap">
                  <strong>{section.sectionName}</strong>
                  <small>{section.criteria.length} criteria</small>
                </div>
              </div>
              <div className="appraisal-template-table-wrap">
                <table className="appraisal-template-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Criteria</th>
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

        <div className="appraisal-form-block">
          <h3>Score Calculation</h3>
          <div className="appraisal-score-formula-card in-block">
            <div className="appraisal-total-points-strip">
              <strong>Total Points</strong>
              <span>Actual total points are shown after PM submits ratings.</span>
            </div>
            <table className="appraisal-score-formula-table">
              <thead>
                <tr>
                  <th>Analysis</th>
                  <th>Formula</th>
                  <th>Score</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>Total Points</strong></td>
                  <td>
                    <div className="formula-main">Total Point</div>
                    <div className="formula-divider" />
                    <div>Number of Questions Answered × 5</div>
                    <div className="formula-multiply">× 100</div>
                  </td>
                  <td>Auto calculated from PM ratings</td>
                </tr>
              </tbody>
            </table>
            <p className="appraisal-muted">Total criteria: {selectedTotalCriteria}. Score will be calculated on employee appraisal forms after PM ratings.</p>
          </div>
        </div>

        <div className="appraisal-form-block">
          <h3>Score Guide</h3>
          {renderScoreBandEditor(bands, true)}
        </div>

        {renderTemplateSignaturePreview()}
      </>
    );
  };

  return (
    <div className="appraisal-page appraisal-template-records-page">
      <div className="appraisal-page-header">
        <div>
          <h1>Template Forms</h1>
          <p>Create, view, and edit reusable blank appraisal form templates. Any appraisal cycle can use any template form.</p>
        </div>
        <div className="appraisal-button-row" style={{ marginTop: 0 }}>
          <button className="appraisal-button secondary" type="button" disabled={loading} onClick={() => void loadTemplates()}>Refresh</button>
          <button className="appraisal-button primary" type="button" onClick={openCreate}>Create New Template</button>
        </div>
      </div>

      {message && <div className={`appraisal-alert ${messageType}`}>{message}</div>}

      <div className="appraisal-card">
        <div className="appraisal-form-block-header">
          <div>
            <h2>Template Forms</h2>
            <p className="appraisal-muted">Template forms are reusable masters. They remain as records and cannot be deleted.</p>
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
                <th>Created At</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {templates.length === 0 && (
                <tr><td colSpan={7}><div className="appraisal-empty">No template forms yet.</div></td></tr>
              )}
              {templates.map((template) => {
                const criteriaCount = template.sections.reduce((sum, section) => sum + section.criteria.length, 0);
                return (
                  <tr key={template.id}>
                    <td><strong>{template.templateName}</strong><br /><span className="appraisal-muted">Reusable appraisal form template</span></td>
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

      {modalMode && (
        <div className="appraisal-modal-backdrop">
          <div className="appraisal-modal-box appraisal-modal-box-xl">
            <div className="appraisal-modal-header">
              <div>
                <h2>{modalMode === 'create' ? 'Create New Template' : modalMode === 'edit' ? 'Edit Template Form' : 'View Template Form'}</h2>
                <p>{modalMode === 'view' ? 'Read-only template form preview.' : 'Fill required fields and customize sections, criteria, and score ranges.'}</p>
              </div>
              <button className="appraisal-modal-close" type="button" onClick={closeModal}><i className="bi bi-x-lg" /></button>
            </div>
            <div className="appraisal-modal-body template-form-modal-body">
              <div className="appraisal-template-banner center">
                <h2>Performance Evaluation Form</h2>
                <p>ACE Data Systems Ltd.</p>
              </div>
              {modalMode === 'view' ? renderTemplatePreview() : renderTemplateEditor()}
            </div>
            <div className="appraisal-modal-footer">
              <button className="appraisal-button secondary" type="button" onClick={closeModal}>Close</button>
              {modalMode === 'view' && selectedTemplate && (
                <button className="appraisal-button primary" type="button" onClick={() => useThisTemplate(selectedTemplate.id)}>Use This Template</button>
              )}
              {modalMode === 'create' && (
                <button className="appraisal-button primary" type="button" disabled={loading} onClick={() => void createTemplate()}>Create Template</button>
              )}
              {modalMode === 'edit' && (
                <button className="appraisal-button primary" type="button" disabled={loading} onClick={() => void saveEdit()}>Save Changes</button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AppraisalTemplateRecordsPage;
