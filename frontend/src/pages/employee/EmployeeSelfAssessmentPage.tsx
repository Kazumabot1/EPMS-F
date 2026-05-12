
import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { employeeAssessmentService } from '../../services/employeeAssessmentService';
import { signatureService } from '../../services/signatureService';
import SignatureModal from '../../components/signature/SignatureModal';
import type { Signature } from '../../types/signature';
import type {
  AssessmentItem,
  AssessmentRequest,
  AssessmentScoreBand,
  AssessmentStatus,
  EmployeeAssessment,
} from '../../types/employeeAssessment';
import '../appraisal/appraisal.css';

const LOCKED_STATUSES: AssessmentStatus[] = [
  'SUBMITTED',
  'PENDING_MANAGER',
  'PENDING_DEPARTMENT_HEAD',
  'PENDING_HR',
  'APPROVED',
  'DECLINED',
  'REJECTED',
];

const ratingOptions = [5, 4, 3, 2, 1];

const getErrorMessage = (error: unknown, fallback: string) => {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const response = (error as { response?: { data?: { message?: string; error?: string } } }).response;
    return response?.data?.message || response?.data?.error || fallback;
  }
  return error instanceof Error ? error.message || fallback : fallback;
};

const defaultScoreBands: AssessmentScoreBand[] = [
  { minScore: 86, maxScore: 100, label: 'Outstanding', description: 'Performance exceptional and far exceeds expectations.', sortOrder: 1 },
  { minScore: 71, maxScore: 85, label: 'Good', description: 'Performance is consistent. Clearly meets essential requirements of job.', sortOrder: 2 },
  { minScore: 60, maxScore: 70, label: 'Meet Requirement', description: 'Performance is satisfactory.', sortOrder: 3 },
  { minScore: 40, maxScore: 59, label: 'Need Improvement', description: 'Performance is inconsistent.', sortOrder: 4 },
  { minScore: 0, maxScore: 39, label: 'Unsatisfactory', description: 'Performance does not meet the minimum requirement.', sortOrder: 5 },
];

const flattenItems = (assessment: EmployeeAssessment): AssessmentItem[] =>
  assessment.sections.flatMap((s) => s.items.map((item) => ({ ...item, sectionTitle: item.sectionTitle || s.title })));

const itemNeedsYesNo = (item: AssessmentItem) => { const t = item.responseType ?? 'YES_NO_RATING'; return t === 'YES_NO' || t === 'YES_NO_RATING'; };
const itemNeedsRating = (item: AssessmentItem) => { const t = item.responseType ?? 'YES_NO_RATING'; return t === 'RATING' || t === 'YES_NO_RATING'; };

const answerIsMissing = (item: AssessmentItem) => {
  const t = item.responseType ?? 'YES_NO_RATING';
  if (item.isRequired === false) return false;
  if (t === 'TEXT') return !item.comment?.trim();
  if (t === 'YES_NO') return item.yesNoAnswer == null;
  if (t === 'YES_NO_RATING') return item.yesNoAnswer == null || item.rating == null;
  return item.rating == null;
};

const buildPayload = (assessment: EmployeeAssessment): AssessmentRequest => ({
  formId: assessment.formId ?? assessment.assessmentFormId ?? null,
  assessmentFormId: assessment.assessmentFormId ?? assessment.formId ?? null,
  period: assessment.period,
  remarks: assessment.remarks || '',
  items: flattenItems(assessment).map((item) => ({
    id: item.id ?? null, questionId: item.questionId ?? null,
    sectionTitle: item.sectionTitle, questionText: item.questionText,
    itemOrder: item.itemOrder, rating: item.rating ?? null,
    comment: item.comment || '', responseType: item.responseType ?? 'YES_NO_RATING',
    yesNoAnswer: item.yesNoAnswer ?? null,
  })),
});

const scoreBandForPercent = (percent: number, bands: AssessmentScoreBand[]) =>
  bands.find((b) => percent >= b.minScore && percent <= b.maxScore) ?? null;

const formatDate = (date?: string | null) => {
  if (!date) return '-';
  const p = new Date(date);
  return isNaN(p.getTime()) ? date : p.toLocaleDateString();
};

const signatureSrc = (imageData?: string | null, imageType?: string | null) => {
  if (!imageData) return '';
  return imageData.startsWith('data:') ? imageData : `data:${imageType || 'image/png'};base64,${imageData}`;
};

const statusBanner = (status: AssessmentStatus, declineReason?: string | null) => {
  const banners: Record<string, { bg: string; icon: string; title: string; message: string }> = {
    PENDING_MANAGER: { bg: '#fef9c3', icon: '⏳', title: 'Awaiting Manager Signature', message: 'Your self-assessment has been submitted. Your manager needs to review and sign it.' },
    PENDING_DEPARTMENT_HEAD: { bg: '#fef3c7', icon: '🔄', title: 'Awaiting Department Head Signature', message: 'Your manager has signed. The department head needs to review and sign next.' },
    PENDING_HR: { bg: '#dbeafe', icon: '📋', title: 'Awaiting HR Approval', message: 'All signatures collected. HR is reviewing your self-assessment.' },
    APPROVED: { bg: '#dcfce7', icon: '✅', title: 'Approved', message: 'Your self-assessment has been approved by HR and is now final.' },
    DECLINED: { bg: '#fee2e2', icon: '❌', title: 'Declined by HR', message: declineReason ? `Reason: ${declineReason}` : 'Your self-assessment was declined by HR.' },
    SUBMITTED: { bg: '#ede9fe', icon: '📨', title: 'Submitted', message: 'Your self-assessment has been submitted.' },
    REJECTED: { bg: '#fee2e2', icon: '❌', title: 'Rejected', message: declineReason || 'Your self-assessment was rejected.' },
  };
  return banners[status] ?? null;
};

interface SignatureSlotProps {
  label: string;
  imageData?: string | null;
  imageType?: string | null;
  name?: string | null;
  signedAt?: string | null;
  placeholder?: boolean;
}

const SignatureSlot = ({ label, imageData, imageType, name, signedAt, placeholder }: SignatureSlotProps) => (
  <div className="appraisal-signature-slot">
    {imageData ? (
      <>
        <img src={signatureSrc(imageData, imageType)} alt={name || label} className="appraisal-signature-image" />
        <p className="appraisal-signature-date">Date: {formatDate(signedAt)}</p>
        <small className="appraisal-signature-name">{name || label}</small>
      </>
    ) : (
      <span className="appraisal-signature-placeholder">{placeholder ? label : `${label} — Pending`}</span>
    )}
  </div>
);

const EmployeeSelfAssessmentPage = () => {
  const [assessment, setAssessment] = useState<EmployeeAssessment | null>(null);
  const [ownSignature, setOwnSignature] = useState<Signature | null>(null);
  const [signatureOpen, setSignatureOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadOwnSignature = async () => {
    const signatures = await signatureService.list();
    setOwnSignature(signatures.find((s) => s.isDefault) ?? signatures[0] ?? null);
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await employeeAssessmentService.getLatestDraft();
        setAssessment(data);
        try { await loadOwnSignature(); } catch { setOwnSignature(null); }
      } catch (err) {
        setError(getErrorMessage(err, 'Unable to load self-assessment form.'));
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const scoreBands = useMemo(() => {
    const bands = assessment?.scoreBands?.length ? assessment.scoreBands : defaultScoreBands;
    return [...bands].sort((a, b) => Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0));
  }, [assessment?.scoreBands]);

  const preview = useMemo(() => {
    if (!assessment) return { answered: 0, total: 0, totalScore: 0, maxScore: 0, percent: 0, label: 'Not scored' };
    const items = flattenItems(assessment).filter((i) => i.isRequired !== false);
    const answeredItems = items.filter((i) => !answerIsMissing(i));
    const ratingItems = items.filter((i) => itemNeedsRating(i) && i.rating != null);
    const totalScore = ratingItems.reduce((s, i) => s + Number(i.rating || 0) * Number(i.weight || 1), 0);
    const maxScore = ratingItems.reduce((s, i) => s + 5 * Number(i.weight || 1), 0);
    const percent = maxScore === 0 ? 0 : Number(((totalScore * 100) / maxScore).toFixed(2));
    const activeBand = scoreBandForPercent(percent, scoreBands);
    return { answered: answeredItems.length, total: items.length, totalScore, maxScore, percent, label: answeredItems.length === 0 ? 'Not scored' : (activeBand?.label ?? 'Not scored') };
  }, [assessment, scoreBands]);

  const updateAssessmentField = (name: 'period' | 'remarks', value: string) =>
    setAssessment((prev) => (prev ? { ...prev, [name]: value } : prev));

  const updateItem = (sectionTitle: string, itemOrder: number, patch: Partial<Pick<AssessmentItem, 'rating' | 'comment' | 'yesNoAnswer'>>) => {
    setAssessment((prev) => {
      if (!prev) return prev;
      return { ...prev, sections: prev.sections.map((section) => ({ ...section, items: section.items.map((item) => (item.sectionTitle || section.title) === sectionTitle && item.itemOrder === itemOrder ? { ...item, ...patch } : item) })) };
    });
  };

  const saveDraft = async () => {
    if (!assessment) return null;
    if (LOCKED_STATUSES.includes(assessment.status)) {
      setError('This self-assessment has already been submitted and cannot be edited.');
      return null;
    }
    setSaving(true); setMessage(''); setError('');
    try {
      const saved = await employeeAssessmentService.saveDraft(buildPayload(assessment), assessment.id);
      setAssessment(saved);
      setMessage('Draft saved successfully.');
      return saved;
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to save self-assessment draft.'));
      return null;
    } finally { setSaving(false); }
  };

  const submitAssessment = async () => {
    if (!assessment) return;
    if (LOCKED_STATUSES.includes(assessment.status)) { setError('You have already submitted this self-assessment.'); return; }
    const missing = flattenItems(assessment).filter(answerIsMissing);
    if (missing.length) { setError('Please answer every required assessment subject before submitting.'); return; }
    if (!ownSignature) { setError('Please create and set your own default signature before submitting.'); setSignatureOpen(true); return; }
    setSubmitting(true); setMessage(''); setError('');
    try {
      const payload = buildPayload(assessment);
      const submitted = assessment.id
        ? await employeeAssessmentService.submit(assessment.id, payload)
        : await employeeAssessmentService.submit(payload);
      setAssessment(submitted);
      setMessage('Self-assessment submitted. Your manager will be notified to sign.');
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to submit self-assessment.'));
    } finally { setSubmitting(false); }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => { e.preventDefault(); await submitAssessment(); };
  const closeSignatureModal = () => { setSignatureOpen(false); void loadOwnSignature(); };

  if (loading) return <div className="appraisal-page"><div className="appraisal-card"><p className="appraisal-muted">Loading self-assessment...</p></div></div>;
  if (error && !assessment) return <div className="appraisal-page"><div className="appraisal-card"><p style={{ color: '#b91c1c' }}>{error}</p></div></div>;
  if (!assessment) return <div className="appraisal-page"><div className="appraisal-card"><p className="appraisal-muted">No self-assessment form is available for your role.</p></div></div>;

  const isLocked = LOCKED_STATUSES.includes(assessment.status);
  const activeBand = scoreBandForPercent(preview.percent, scoreBands);
  const banner = statusBanner(assessment.status, assessment.declineReason);

  return (
    <div className="appraisal-page">
      <SignatureModal open={signatureOpen} onClose={closeSignatureModal} />

      <form onSubmit={handleSubmit} className="appraisal-card appraisal-form-sheet">
        <div className="appraisal-template-banner center">
          <h2>{assessment.formName || 'Employee Self-assessment Form'}</h2>
          <p>{assessment.companyName || 'ACE Data Systems Ltd.'}</p>
        </div>

        {/* Workflow status banner */}
        {banner && (
          <div style={{ background: banner.bg, border: `1px solid ${banner.bg}`, borderRadius: 10, padding: '14px 20px', marginBottom: 18 }}>
            <strong style={{ fontSize: '1rem' }}>{banner.icon} {banner.title}</strong>
            <p style={{ margin: '4px 0 0', fontSize: '0.875rem', color: '#374151' }}>{banner.message}</p>
          </div>
        )}

        {/* Employee Info */}
        <div className="appraisal-employee-info-grid">
          <div className="appraisal-info-field"><span>Employee Name :</span><input value={assessment.employeeName || '-'} readOnly /></div>
          <div className="appraisal-info-field"><span>Employee ID :</span><input value={assessment.employeeCode || '-'} readOnly /></div>
          <div className="appraisal-info-field"><span>Current Position :</span><input value={assessment.currentPosition || '-'} readOnly /></div>
          <div className="appraisal-info-field"><span>Department :</span><input value={assessment.departmentName || '-'} readOnly /></div>
          <div className="appraisal-info-field"><span>Assessment Date :</span><input value={formatDate(assessment.assessmentDate)} readOnly /></div>
          <div className="appraisal-info-field"><span>Manager Name :</span><input value={assessment.managerName || '-'} readOnly /></div>
          <div className="appraisal-info-field">
            <span>Assessment Period :</span>
            <input value={assessment.period || ''} readOnly={isLocked} onChange={(e) => updateAssessmentField('period', e.target.value)} required />
          </div>
          <div className="appraisal-info-field"><span>Status :</span><input value={assessment.status} readOnly /></div>
        </div>

        {/* Assessment table */}
        <section className="appraisal-section-card">
          <div className="appraisal-section-header">
            <strong>Assessment Subjects</strong>
            <span className="appraisal-muted">{flattenItems(assessment).length} question(s)</span>
          </div>
          <div className="self-assessment-table-wrap">
            <table className="self-assessment-table">
              <thead>
                <tr>
                  <th rowSpan={2}>No.</th>
                  <th rowSpan={2}>Assessment Subject</th>
                  <th rowSpan={2}>Yes</th>
                  <th rowSpan={2}>No</th>
                  <th colSpan={5}>Rating</th>
                </tr>
                <tr>{ratingOptions.map((r) => <th key={r}>{r}</th>)}</tr>
              </thead>
              <tbody>
                {assessment.sections.flatMap((section) =>
                  section.items.map((item) => {
                    const st = item.sectionTitle || section.title;
                    return (
                      <tr key={`${st}-${item.itemOrder}-${item.questionId ?? item.id ?? ''}`}>
                        <td>{item.itemOrder}</td>
                        <td>
                          <strong>{item.questionText}</strong>
                          {item.responseType === 'TEXT' ? (
                            <textarea rows={2} disabled={isLocked} value={item.comment || ''} onChange={(e) => updateItem(st, item.itemOrder, { comment: e.target.value })} placeholder="Write your answer..." />
                          ) : (
                            <input disabled={isLocked} value={item.comment || ''} onChange={(e) => updateItem(st, item.itemOrder, { comment: e.target.value })} placeholder="Optional comment..." />
                          )}
                        </td>
                        <td>{itemNeedsYesNo(item) ? <input type="checkbox" disabled={isLocked} checked={item.yesNoAnswer === true} onChange={() => updateItem(st, item.itemOrder, { yesNoAnswer: item.yesNoAnswer === true ? null : true })} /> : '-'}</td>
                        <td>{itemNeedsYesNo(item) ? <input type="checkbox" disabled={isLocked} checked={item.yesNoAnswer === false} onChange={() => updateItem(st, item.itemOrder, { yesNoAnswer: item.yesNoAnswer === false ? null : false })} /> : '-'}</td>
                        {ratingOptions.map((rating) => (
                          <td key={rating}>{itemNeedsRating(item) ? <input type="radio" name={`rating-${st}-${item.itemOrder}`} disabled={isLocked} checked={item.rating === rating} onChange={() => updateItem(st, item.itemOrder, { rating })} /> : '-'}</td>
                        ))}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Score summary */}
        <div className="appraisal-summary-grid">
          <div className="appraisal-summary-card"><strong>Score</strong><span>{preview.percent}%</span></div>
          <div className="appraisal-summary-card"><strong>Formula</strong><span>{preview.totalScore} / {preview.maxScore || 0} x 100</span></div>
        </div>

        <div className="appraisal-inline-grid">
          <div className="appraisal-review-block">
            <h4>Formula</h4>
            <p><strong>Score = Total Points / (Questions × 5) × 100</strong></p>
            <p>Current score: {preview.totalScore} / {preview.maxScore || 0} = <strong>{preview.percent}%</strong></p>
            <p>Current range: <strong>{preview.label}</strong>{activeBand?.description ? ` — ${activeBand.description}` : ''}</p>
            <p className="appraisal-muted">Answered {preview.answered} of {preview.total} required item(s).</p>
          </div>
          <div className="appraisal-review-block">
            <h4>Score Explanation</h4>
            <table className="self-assessment-score-table">
              <tbody>
                {scoreBands.map((band) => (
                  <tr key={`${band.minScore}-${band.maxScore}`}>
                    <td><strong>{String(band.minScore).padStart(2, '0')}-{band.maxScore}</strong></td>
                    <td><strong>{band.label}</strong><br /><span className="appraisal-muted">{band.description}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Other remarks */}
        <div className="appraisal-review-block">
          <h4>Other remarks</h4>
          <label className="appraisal-field">
            <textarea rows={4} disabled={isLocked} value={assessment.remarks || ''} onChange={(e) => updateAssessmentField('remarks', e.target.value)} placeholder="Write achievements, blockers, or development needs..." />
          </label>
        </div>

        {/* Comments from reviewers */}
        {assessment.managerComment && (
          <div className="appraisal-review-block">
            <h4>Manager's Comment</h4>
            <p>{assessment.managerComment}</p>
          </div>
        )}
        {assessment.departmentHeadComment && (
          <div className="appraisal-review-block">
            <h4>Department Head's Comment</h4>
            <p>{assessment.departmentHeadComment}</p>
          </div>
        )}
        {assessment.hrComment && (
          <div className="appraisal-review-block">
            <h4>HR Comment</h4>
            <p>{assessment.hrComment}</p>
          </div>
        )}
        {assessment.declineReason && assessment.status === 'DECLINED' && (
          <div className="appraisal-review-block" style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: 14 }}>
            <h4 style={{ color: '#dc2626' }}>Decline Reason</h4>
            <p>{assessment.declineReason}</p>
          </div>
        )}

        {/* 4-slot signature grid */}
        <div className="appraisal-signature-grid self-assessment-signature-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
          {/* Employee signature */}
          <div className="appraisal-signature-slot">
            {assessment.employeeSignatureImageData ? (
              <>
                <img src={signatureSrc(assessment.employeeSignatureImageData, assessment.employeeSignatureImageType)} alt="Employee signature" className="appraisal-signature-image" />
                <p className="appraisal-signature-date">Date: {formatDate(assessment.employeeSignedAt || assessment.submittedAt)}</p>
                <small className="appraisal-signature-name">{assessment.employeeSignatureName || 'Employee'}</small>
              </>
            ) : ownSignature && !isLocked ? (
              <>
                <img src={signatureSrc(ownSignature.imageData, ownSignature.imageType)} alt={ownSignature.name} className="appraisal-signature-image" />
                <p className="appraisal-signature-date">Date: {formatDate(new Date().toISOString())}</p>
                <small className="appraisal-signature-name">{ownSignature.name}</small>
              </>
            ) : (
              <>
                <span className="appraisal-signature-placeholder">Signature of Employee &amp; Date</span>
                {!isLocked && <button type="button" className="appraisal-button secondary" style={{ marginTop: 12, width: 'fit-content' }} onClick={() => setSignatureOpen(true)}>Create Signature</button>}
              </>
            )}
          </div>

          {/* Manager signature */}
          <SignatureSlot label="Signature of Manager & Date" imageData={assessment.managerSignatureImageData} imageType={assessment.managerSignatureImageType} name={assessment.managerSignatureName} signedAt={assessment.managerSignedAt} />

          {/* Dept Head signature */}
          <SignatureSlot label="Signature of Dept. Head & Date" imageData={assessment.departmentHeadSignatureImageData} imageType={assessment.departmentHeadSignatureImageType} name={assessment.departmentHeadSignatureName} signedAt={assessment.departmentHeadSignedAt} />

          {/* HR signature */}
          <SignatureSlot label="Signature of HR & Date" imageData={assessment.hrSignatureImageData} imageType={assessment.hrSignatureImageType} name={assessment.hrSignatureName} signedAt={assessment.hrSignedAt} />
        </div>

        {ownSignature && !isLocked && (
          <div className="appraisal-button-row">
            <button type="button" className="appraisal-button secondary" onClick={() => setSignatureOpen(true)}>Change My Signature</button>
          </div>
        )}

        <div className="appraisal-review-block">
          <h4>Review by</h4>
          <p>HR Department</p>
        </div>

        {message && <p style={{ color: '#047857', fontWeight: 700, margin: '18px' }}>{message}</p>}
        {error && <p style={{ color: '#b91c1c', fontWeight: 700, margin: '18px' }}>{error}</p>}

        {!isLocked && (
          <div className="appraisal-button-row final-actions">
            <button className="appraisal-button secondary" type="button" disabled={saving || submitting} onClick={() => void saveDraft()}>
              {saving ? 'Saving...' : 'Save Draft'}
            </button>
            <button className="appraisal-button primary" type="submit" disabled={saving || submitting}>
              {submitting ? 'Submitting...' : 'Submit Assessment'}
            </button>
          </div>
        )}
      </form>
    </div>
  );
};

export default EmployeeSelfAssessmentPage;
