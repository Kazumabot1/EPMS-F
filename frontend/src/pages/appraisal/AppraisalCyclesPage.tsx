import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { fetchDepartments } from '../../services/departmentService';
import type { Department } from '../../services/departmentService';
import { appraisalCycleService, appraisalTemplateService } from '../../services/appraisalService';
import { signatureService } from '../../services/signatureService';
import type {
  AppraisalCycleRequest,
  AppraisalCycleResponse,
  AppraisalCycleType,
  AppraisalScoreBandRequest,
  AppraisalTemplateResponse,
} from '../../types/appraisal';
import type { Signature } from '../../types/signature';
import AppraisalRatingDots from '../../components/appraisal/AppraisalRatingDots';
import './appraisal.css';

const currentYear = new Date().getFullYear();

type DateTextState = {
  startDate: string;
  endDate: string;
  submissionDeadline: string;
};

type SignatureDisplayBlockProps = {
  label: string;
  signature?: Signature;
  dateText: string;
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

const displayDate = (value?: string | null) => {
  if (!value) return '-';
  const [year, month, day] = value.slice(0, 10).split('-');
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
};

const displayDateTime = (value?: string | null) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}`;
};

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

const parseDisplayDate = (value: string) => {
  const trimmed = value.trim();
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(trimmed);
  if (!match) return null;
  const [, day, month, year] = match;
  const iso = `${year}-${month}-${day}`;
  const parsed = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return null;
  if (parsed.getFullYear() !== Number(year) || parsed.getMonth() + 1 !== Number(month) || parsed.getDate() !== Number(day)) {
    return null;
  }
  return iso;
};

const addMonthsMinusOneDay = (value: string) => {
  if (!value) return '';
  const date = new Date(`${value}T00:00:00`);
  date.setMonth(date.getMonth() + 6);
  date.setDate(date.getDate() - 1);
  return date.toISOString().slice(0, 10);
};

const addOneYear = (value?: string | null) => {
  if (!value) return null;
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  date.setFullYear(date.getFullYear() + 1);
  return date.toISOString().slice(0, 10);
};

const statusClass = (status: string) => {
  if (status === 'ACTIVE') return 'green';
  if (status === 'LOCKED') return 'amber';
  if (status === 'COMPLETED') return 'gray';
  return '';
};

const formatCycleType = (value: AppraisalCycleType) => {
  if (value === 'SEMI_ANNUAL') return 'Semi-Annual';
  if (value === 'CUSTOM') return 'Custom';
  return 'Annual';
};

const getPeriodNo = (cycleType: AppraisalCycleType, startDate?: string | null) => {
  if (cycleType === 'ANNUAL' || cycleType === 'CUSTOM') return 1;
  const month = Number(startDate?.slice(5, 7));
  return month && month <= 6 ? 1 : 2;
};

const getComputedDates = (cycleType: AppraisalCycleType, cycleYear: number, startDate?: string | null, customEndDate?: string | null) => {
  if (cycleType === 'ANNUAL') {
    return {
      startDate: `${cycleYear}-01-01`,
      endDate: `${cycleYear}-12-31`,
    };
  }
  if (cycleType === 'SEMI_ANNUAL') {
    const resolvedStart = startDate || `${cycleYear}-01-01`;
    return {
      startDate: resolvedStart,
      endDate: addMonthsMinusOneDay(resolvedStart),
    };
  }
  return {
    startDate: startDate || `${cycleYear}-01-01`,
    endDate: customEndDate || `${cycleYear}-12-31`,
  };
};

const emptyCycle = (): AppraisalCycleRequest => ({
  cycleName: '',
  templateId: 0,
  cycleType: 'ANNUAL',
  cycleYear: currentYear,
  periodNo: 1,
  startDate: `${currentYear}-01-01`,
  endDate: `${currentYear}-12-31`,
  submissionDeadline: '',
  departmentIds: [],
});

const buildDateText = (cycle: AppraisalCycleRequest): DateTextState => ({
  startDate: displayDate(cycle.startDate),
  endDate: displayDate(cycle.endDate),
  submissionDeadline: cycle.submissionDeadline ? displayDate(cycle.submissionDeadline) : '',
});

const buildReusePayload = (cycle: AppraisalCycleResponse): AppraisalCycleRequest => {
  const nextYear = Math.max(cycle.cycleYear + 1, currentYear);
  const nextStartDate = cycle.cycleType === 'ANNUAL' ? `${nextYear}-01-01` : addOneYear(cycle.startDate) || `${nextYear}-01-01`;
  const nextEndDate = cycle.cycleType === 'CUSTOM' ? addOneYear(cycle.endDate) || `${nextYear}-12-31` : undefined;
  const computed = getComputedDates(cycle.cycleType, nextYear, nextStartDate, nextEndDate);

  return {
    cycleName: `${cycle.cycleName} Copy`,
    templateId: cycle.templateId,
    cycleType: cycle.cycleType,
    cycleYear: nextYear,
    periodNo: getPeriodNo(cycle.cycleType, computed.startDate),
    startDate: computed.startDate,
    endDate: computed.endDate,
    submissionDeadline: computed.endDate,
    departmentIds: cycle.departmentIds ?? [],
  };
};

const AppraisalCyclesPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [cycles, setCycles] = useState<AppraisalCycleResponse[]>([]);
  const [templates, setTemplates] = useState<AppraisalTemplateResponse[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [signatures, setSignatures] = useState<Signature[]>([]);
  const [cycleForm, setCycleForm] = useState<AppraisalCycleRequest>(() => emptyCycle());
  const [cycleYearText, setCycleYearText] = useState(String(currentYear));
  const [dateText, setDateText] = useState<DateTextState>(() => buildDateText(emptyCycle()));
  const [targetAllDepartments, setTargetAllDepartments] = useState(true);
  const [selectedCycle, setSelectedCycle] = useState<AppraisalCycleResponse | null>(null);
  const [selectedCycleTemplate, setSelectedCycleTemplate] = useState<AppraisalTemplateResponse | null>(null);
  const [cycleViewLoading, setCycleViewLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');

  const signatureById = useMemo(() => new Map(signatures.map((signature) => [signature.id, signature])), [signatures]);

  const computedDates = useMemo(
    () => getComputedDates(cycleForm.cycleType, cycleForm.cycleYear, cycleForm.startDate, cycleForm.endDate),
    [cycleForm.cycleType, cycleForm.cycleYear, cycleForm.startDate, cycleForm.endDate],
  );

  const loadData = async () => {
    setLoading(true);
    try {
      const [cycleList, templateList, departmentList] = await Promise.all([
        appraisalCycleService.list(),
        appraisalTemplateService.list(),
        fetchDepartments(),
      ]);
      setCycles(cycleList);
      setTemplates(templateList);
      setDepartments(departmentList.filter((department) => department.status !== false));
      setSelectedCycle((previous) => (previous ? cycleList.find((cycle) => cycle.id === previous.id) ?? null : null));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
    signatureService.list().then(setSignatures).catch(() => setSignatures([]));
  }, []);

  useEffect(() => {
    const requestedTemplateId = Number(searchParams.get('templateId') || 0);
    const shouldOpen = searchParams.get('openCreate') === '1' || requestedTemplateId > 0;
    if (shouldOpen) {
      setShowCreateModal(true);
      if (requestedTemplateId > 0) {
        setCycleForm((previous) => ({ ...previous, templateId: requestedTemplateId }));
      }
    }
  }, [searchParams]);

  const resetForm = (templateId = 0) => {
    const fresh = { ...emptyCycle(), templateId };
    setCycleForm(fresh);
    setCycleYearText(String(currentYear));
    setDateText(buildDateText(fresh));
    setTargetAllDepartments(true);
  };

  const openCreateModal = (templateId = 0) => {
    resetForm(templateId);
    setMessage('');
    setShowCreateModal(true);
    if (templateId > 0) {
      setSearchParams({ templateId: String(templateId), openCreate: '1' });
    } else {
      setSearchParams({ openCreate: '1' });
    }
  };

  const closeCreateModal = () => {
    setShowCreateModal(false);
    setSearchParams({});
  };

  const openCycleView = async (cycle: AppraisalCycleResponse) => {
    setSelectedCycle(cycle);
    setSelectedCycleTemplate(null);
    setCycleViewLoading(true);
    try {
      const template = await appraisalTemplateService.get(cycle.templateId);
      setSelectedCycleTemplate(template);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to load selected cycle template.');
      setMessageType('error');
    } finally {
      setCycleViewLoading(false);
    }
  };

  const closeCycleView = () => {
    setSelectedCycle(null);
    setSelectedCycleTemplate(null);
  };

  const setCycleType = (cycleType: AppraisalCycleType) => {
    setCycleForm((previous) => {
      const dates = getComputedDates(cycleType, previous.cycleYear, `${previous.cycleYear}-01-01`, `${previous.cycleYear}-12-31`);
      const next = {
        ...previous,
        cycleType,
        startDate: dates.startDate,
        endDate: dates.endDate,
        periodNo: getPeriodNo(cycleType, dates.startDate),
      };
      setDateText((prev) => ({
        ...prev,
        startDate: displayDate(next.startDate),
        endDate: displayDate(next.endDate),
      }));
      return next;
    });
  };

  const setCycleYear = (value: string) => {
    setCycleYearText(value);
    const year = Number(value);
    if (!Number.isInteger(year)) return;
    setCycleForm((previous) => {
      const dates = getComputedDates(previous.cycleType, year, `${year}-01-01`, `${year}-12-31`);
      const next = {
        ...previous,
        cycleYear: year,
        startDate: dates.startDate,
        endDate: dates.endDate,
        periodNo: getPeriodNo(previous.cycleType, dates.startDate),
      };
      setDateText((prev) => ({
        ...prev,
        startDate: displayDate(next.startDate),
        endDate: displayDate(next.endDate),
      }));
      return next;
    });
  };

  const updateDateText = (field: keyof DateTextState, value: string) => {
    setDateText((previous) => ({ ...previous, [field]: value }));
    const parsed = parseDisplayDate(value);
    if (!parsed) return;
    if (field === 'submissionDeadline') {
      setCycleForm((previous) => ({ ...previous, submissionDeadline: parsed }));
      return;
    }
    setCycleForm((previous) => {
      if (field === 'startDate') {
        const computed = getComputedDates(previous.cycleType, previous.cycleYear, parsed, previous.endDate);
        setDateText((prev) => ({ ...prev, endDate: displayDate(computed.endDate) }));
        return {
          ...previous,
          startDate: computed.startDate,
          endDate: computed.endDate,
          periodNo: getPeriodNo(previous.cycleType, computed.startDate),
        };
      }
      return { ...previous, endDate: parsed };
    });
  };

  const toggleDepartment = (departmentId: number) => {
    setCycleForm((previous) => {
      const hasDepartment = previous.departmentIds.includes(departmentId);
      return {
        ...previous,
        departmentIds: hasDepartment
          ? previous.departmentIds.filter((id) => id !== departmentId)
          : [...previous.departmentIds, departmentId],
      };
    });
  };

  const validateCycle = () => {
    const year = Number(cycleYearText);
    if (!Number.isInteger(year)) return 'Cycle year must be a valid year.';
    if (year < currentYear) return 'Past years cannot be selected.';
    if (!cycleForm.cycleName.trim()) return 'Appraisal name is required.';
    if (!cycleForm.templateId) return 'Select a template form record.';
    if (cycleForm.cycleType !== 'ANNUAL' && !parseDisplayDate(dateText.startDate)) return 'Start date must use DD/MM/YYYY format.';
    if (cycleForm.cycleType === 'CUSTOM' && !parseDisplayDate(dateText.endDate)) return 'End date must use DD/MM/YYYY format.';
    if (cycleForm.cycleType === 'CUSTOM' && cycleForm.startDate && cycleForm.endDate && cycleForm.endDate < cycleForm.startDate) return 'End date cannot be before start date.';
    if (!targetAllDepartments && cycleForm.departmentIds.length === 0) return 'Select at least one department or choose all departments.';
    return '';
  };

  const runAction = async (action: () => Promise<unknown>, doneMessage: string) => {
    setLoading(true);
    setMessage('');
    try {
      await action();
      setMessage(doneMessage);
      setMessageType('success');
      await loadData();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Action failed.');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const createCycle = async () => {
    const validationMessage = validateCycle();
    if (validationMessage) {
      setMessage(validationMessage);
      setMessageType('error');
      return;
    }
    const year = Number(cycleYearText);
    const dates = getComputedDates(cycleForm.cycleType, year, cycleForm.startDate, cycleForm.endDate);
    await runAction(
      () => appraisalCycleService.create({
        ...cycleForm,
        cycleName: cycleForm.cycleName.trim(),
        cycleYear: year,
        startDate: dates.startDate,
        endDate: dates.endDate,
        periodNo: getPeriodNo(cycleForm.cycleType, dates.startDate),
        submissionDeadline: dates.endDate,
        departmentIds: targetAllDepartments ? [] : cycleForm.departmentIds,
      }),
      'Appraisal cycle created successfully as a draft record.',
    );
    resetForm();
    closeCreateModal();
  };

  const reuseCycle = async (cycle: AppraisalCycleResponse) => {
    await runAction(
      () => appraisalCycleService.reuse(cycle.id, buildReusePayload(cycle)),
      'Cycle re-used as a new draft record.',
    );
  };

  const renderScoreGuide = (template: AppraisalTemplateResponse) => {
    const bands = uniqueScoreBands(template.scoreBands?.length ? template.scoreBands : defaultScoreBands());
    return (
      <div className="appraisal-score-band-editor read-only">
        <div className="appraisal-score-band-head">
          <span>Score</span>
          <span>Rating</span>
          <span>Explanation</span>
        </div>
        {bands.map((band, index) => (
          <div className="appraisal-score-band-row" key={`${band.label}-${index}`}>
            <div className="appraisal-score-range-inputs">
              <strong>{String(band.minScore).padStart(2, '0')}-{band.maxScore}</strong>
            </div>
            <strong>{band.label}</strong>
            <span className="appraisal-muted">{band.description}</span>
          </div>
        ))}
      </div>
    );
  };

  const renderSignaturePreview = (template: AppraisalTemplateResponse) => {
    const dateFormat = template.signatureDateFormat ?? 'DD/MM/YYYY';
    const dateText = formatDateByPattern(new Date(), dateFormat);
    return (
      <div className="appraisal-form-block">
        <h3>Signature Section</h3>
        <div className="appraisal-signature-grid appraisal-template-signature-grid">
          <SignatureDisplayBlock
            label="Signature of Appraisee & Date"
            signature={template.appraiseeSignatureId ? signatureById.get(template.appraiseeSignatureId) : undefined}
            dateText={dateText}
          />
          <SignatureDisplayBlock
            label="Signature of Appraiser & Date"
            signature={template.appraiserSignatureId ? signatureById.get(template.appraiserSignatureId) : undefined}
            dateText={dateText}
          />
          <SignatureDisplayBlock
            label="HR Signature / Date / Designation"
            signature={template.hrSignatureId ? signatureById.get(template.hrSignatureId) : undefined}
            dateText={dateText}
          />
        </div>
      </div>
    );
  };

  const renderCycleFormPreview = () => {
    if (!selectedCycle) return null;
    let globalNo = 0;

    return (
      <div className="appraisal-modal-backdrop">
        <div className="appraisal-modal-box appraisal-modal-box-xl appraisal-cycle-view-modal">
          <div className="appraisal-modal-header">
            <div>
              <h2>View Appraisal Cycle</h2>
              <p>{selectedCycle.cycleName}</p>
            </div>
            <button className="appraisal-modal-close" type="button" onClick={closeCycleView}>
              <i className="bi bi-x-lg" />
            </button>
          </div>

          <div className="appraisal-modal-body template-form-modal-body">
            {cycleViewLoading && <div className="appraisal-empty">Loading appraisal cycle form...</div>}
            {!cycleViewLoading && !selectedCycleTemplate && <div className="appraisal-empty">Selected template form could not be loaded.</div>}
            {!cycleViewLoading && selectedCycleTemplate && (
              <>
                <div className="appraisal-template-summary-card appraisal-cycle-summary-card">
                  <div><strong>Appraisal Name</strong><span>{selectedCycle.cycleName}</span></div>
                  <div><strong>Template</strong><span>{selectedCycle.templateName || selectedCycleTemplate.templateName}</span></div>
                  <div><strong>Cycle Type</strong><span>{formatCycleType(selectedCycle.cycleType)}</span></div>
                  <div><strong>Cycle Year</strong><span>{selectedCycle.cycleYear}</span></div>
                  <div><strong>Start Date</strong><span>{displayDate(selectedCycle.startDate)}</span></div>
                  <div><strong>End Date</strong><span>{displayDate(selectedCycle.endDate)}</span></div>
                  <div><strong>Created At</strong><span>{displayDateTime(selectedCycle.createdAt)}</span></div>
                  <div><strong>Status</strong><span>{selectedCycle.status}</span></div>
                </div>

                <div className="appraisal-form-block">
                  <h3>Employee Information</h3>
                  <p className="appraisal-muted">HR can view cycle department and dates only. Employee fields are filled later by Project Manager.</p>
                  <div className="appraisal-inline-grid three appraisal-cycle-employee-grid">
                    <label className="appraisal-field">
                      <span>Employee Name</span>
                      <input value="" placeholder="Filled by Project Manager" readOnly disabled />
                    </label>
                    <label className="appraisal-field">
                      <span>Employee ID</span>
                      <input value="" placeholder="Filled by Project Manager" readOnly disabled />
                    </label>
                    <label className="appraisal-field">
                      <span>Current Position</span>
                      <input value="" placeholder="Filled by Project Manager" readOnly disabled />
                    </label>
                    <label className="appraisal-field">
                      <span>Department</span>
                      <input value={selectedCycle.departmentNames?.join(', ') || 'All Departments'} readOnly disabled />
                    </label>
                    <label className="appraisal-field">
                      <span>Assessment Date</span>
                      <input value={displayDate(selectedCycle.startDate)} readOnly disabled />
                    </label>
                    <label className="appraisal-field">
                      <span>Effective Date</span>
                      <input value={displayDate(selectedCycle.endDate)} readOnly disabled />
                    </label>
                  </div>
                </div>

                <div className="appraisal-form-block">
                  <h3>Evaluations</h3>
                  {selectedCycleTemplate.sections.map((section) => (
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
                            <div>Number of Questions Answered x 5</div>
                            <div className="formula-multiply">x 100</div>
                          </td>
                          <td>Auto calculated from PM ratings</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="appraisal-form-block">
                  <h3>Score Guide</h3>
                  {renderScoreGuide(selectedCycleTemplate)}
                </div>

                {renderSignaturePreview(selectedCycleTemplate)}
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="appraisal-page">
      <div className="appraisal-page-header">
        <div>
          <h1>Appraisal Cycles</h1>
          <p>Manage appraisal cycles created from reusable template forms.</p>
        </div>
        <button className="appraisal-button primary" type="button" onClick={() => openCreateModal()}>
          <i className="bi bi-plus-circle" />
          Create Appraisal Cycle
        </button>
      </div>

      {message && <div className={`appraisal-alert ${messageType}`}>{message}</div>}

      <div className="appraisal-card">
        <div className="appraisal-form-block-header">
          <div>
            <h2>Appraisal Cycles</h2>
            <p className="appraisal-muted">Created appraisal cycles are kept as records. Active cycles are visible to Project Managers.</p>
          </div>
          <button className="appraisal-button secondary" type="button" disabled={loading} onClick={() => void loadData()}>
            Refresh
          </button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="appraisal-table appraisal-cycle-record-table">
            <thead>
              <tr>
                <th>Appraisal Name</th>
                <th>Template</th>
                <th>Departments</th>
                <th>Cycle Type</th>
                <th>Cycle Year</th>
                <th>Start Date</th>
                <th>End Date</th>
                <th>Created At</th>
                <th>Status</th>
                <th>Locked</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {cycles.length === 0 && (
                <tr>
                  <td colSpan={11}>
                    <div className="appraisal-empty">No appraisal cycles yet.</div>
                  </td>
                </tr>
              )}
              {cycles.map((cycle) => (
                <tr key={cycle.id}>
                  <td><strong>{cycle.cycleName}</strong></td>
                  <td>{cycle.templateName || '-'}</td>
                  <td>{cycle.departmentNames?.join(', ') || 'All Departments'}</td>
                  <td>{formatCycleType(cycle.cycleType)}</td>
                  <td>{cycle.cycleYear}</td>
                  <td>{displayDate(cycle.startDate)}</td>
                  <td>{displayDate(cycle.endDate)}</td>
                  <td>{displayDateTime(cycle.createdAt)}</td>
                  <td><span className={`appraisal-status ${statusClass(cycle.status)}`}>{cycle.status}</span></td>
                  <td>{cycle.locked ? 'Yes' : 'No'}</td>
                  <td>
                    <div className="appraisal-button-row record-actions">
                      <button className="appraisal-button ghost" type="button" onClick={() => void openCycleView(cycle)}>View Cycle</button>
                      {cycle.status === 'DRAFT' && (
                        <button className="appraisal-button success" type="button" onClick={() => runAction(() => appraisalCycleService.activate(cycle.id), 'Cycle activated.')}>Active</button>
                      )}
                      {cycle.status === 'ACTIVE' && (
                        <button className="appraisal-button warning" type="button" onClick={() => runAction(() => appraisalCycleService.lock(cycle.id), 'Cycle locked.')}>Lock</button>
                      )}
                      {cycle.status !== 'COMPLETED' && (
                        <button className="appraisal-button secondary" type="button" onClick={() => runAction(() => appraisalCycleService.complete(cycle.id), 'Cycle completed.')}>Complete</button>
                      )}
                      <button className="appraisal-button ghost" type="button" onClick={() => reuseCycle(cycle)}>Re-use</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {renderCycleFormPreview()}

      {showCreateModal && (
        <div className="appraisal-modal-backdrop">
          <div className="appraisal-modal-box">
            <div className="appraisal-modal-header">
              <div>
                <h2>Create Appraisal Cycle</h2>
                <p>Set cycle year first, then choose template, period, and target departments.</p>
              </div>
              <button className="appraisal-modal-close" type="button" onClick={closeCreateModal}>
                <i className="bi bi-x-lg" />
              </button>
            </div>

            <div className="appraisal-modal-body">
              <div className="appraisal-inline-grid three">
                <label className="appraisal-field">
                  <span>Cycle Year</span>
                  <input value={cycleYearText} onChange={(event) => setCycleYear(event.target.value)} placeholder={String(currentYear)} />
                  <small>Current year or future years only.</small>
                </label>
                <label className="appraisal-field">
                  <span>Appraisal Name</span>
                  <input value={cycleForm.cycleName} onChange={(event) => setCycleForm({ ...cycleForm, cycleName: event.target.value })} placeholder="Enter appraisal name" />
                  <small>Manual entry required.</small>
                </label>
                <label className="appraisal-field">
                  <span>Cycle Type</span>
                  <select value={cycleForm.cycleType} onChange={(event) => setCycleType(event.target.value as AppraisalCycleType)}>
                    <option value="ANNUAL">Annual</option>
                    <option value="SEMI_ANNUAL">Semi-Annual</option>
                    <option value="CUSTOM">Custom</option>
                  </select>
                </label>
              </div>

              <div className="appraisal-inline-grid three">
                <label className="appraisal-field">
                  <span>Template Form</span>
                  <select value={cycleForm.templateId} onChange={(event) => setCycleForm({ ...cycleForm, templateId: Number(event.target.value) })}>
                    <option value={0}>Select template form record</option>
                    {templates.map((template) => (
                      <option key={template.id} value={template.id}>{template.templateName} v{template.versionNo}</option>
                    ))}
                  </select>
                </label>
                <label className="appraisal-field">
                  <span>Start Date</span>
                  <input
                    disabled={cycleForm.cycleType === 'ANNUAL'}
                    value={cycleForm.cycleType === 'ANNUAL' ? displayDate(computedDates.startDate) : dateText.startDate}
                    onChange={(event) => updateDateText('startDate', event.target.value)}
                    placeholder="DD/MM/YYYY"
                  />
                  <small>{cycleForm.cycleType === 'ANNUAL' ? 'System calculated from cycle year.' : 'Use DD/MM/YYYY.'}</small>
                </label>
                <label className="appraisal-field">
                  <span>End Date</span>
                  <input
                    disabled={cycleForm.cycleType !== 'CUSTOM'}
                    value={cycleForm.cycleType === 'CUSTOM' ? dateText.endDate : displayDate(computedDates.endDate)}
                    onChange={(event) => updateDateText('endDate', event.target.value)}
                    placeholder="DD/MM/YYYY"
                  />
                  <small>{cycleForm.cycleType === 'CUSTOM' ? 'Use DD/MM/YYYY.' : 'System calculated.'}</small>
                </label>
              </div>

              <div className="appraisal-department-box">
                <label className="appraisal-checkbox-line">
                  <input
                    type="checkbox"
                    checked={targetAllDepartments}
                    onChange={(event) => {
                      setTargetAllDepartments(event.target.checked);
                      if (event.target.checked) {
                        setCycleForm((previous) => ({ ...previous, departmentIds: [] }));
                      }
                    }}
                  />
                  <span>All Departments</span>
                </label>

                {!targetAllDepartments && (
                  <div className="appraisal-pill-list department-select-list">
                    {departments.map((department) => (
                      <label key={department.id} className="appraisal-pill selectable">
                        <input
                          type="checkbox"
                          checked={cycleForm.departmentIds.includes(department.id)}
                          onChange={() => toggleDepartment(department.id)}
                        />
                        {department.departmentName}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="appraisal-modal-footer">
              <button className="appraisal-button secondary" type="button" onClick={closeCreateModal}>Cancel</button>
              <button className="appraisal-button primary" type="button" disabled={loading} onClick={() => void createCycle()}>
                Create Appraisal Cycle
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AppraisalCyclesPage;
