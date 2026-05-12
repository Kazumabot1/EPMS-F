
import { useEffect, useMemo, useState } from 'react';
import { authStorage } from '../../services/authStorage';
import { employeeAssessmentService } from '../../services/employeeAssessmentService';
import type {
  AssessmentItem,
  AssessmentScoreBand,
  AssessmentScoreRow,
  AssessmentStatus,
  EmployeeAssessment,
} from '../../types/employeeAssessment';
import '../appraisal/appraisal.css';

type RoleFlags = {
  isHr: boolean;
  isDepartmentHead: boolean;
};

const getErrorMessage = (error: unknown, fallback: string) => {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const response = (
      error as {
        response?: {
          data?: {
            message?: string;
            error?: string;
          };
        };
      }
    ).response;

    return response?.data?.message || response?.data?.error || fallback;
  }

  return error instanceof Error ? error.message || fallback : fallback;
};

const normalizeRoleName = (role: string) =>
  role
    .replace(/^ROLE_/i, '')
    .replace(/[\s-]+/g, '_')
    .toUpperCase();

const getCurrentRoleFlags = (): RoleFlags => {
  const user = authStorage.getUser();
  const roles = (user?.roles ?? []).map((role: string) => normalizeRoleName(role));
  const dashboard = String(user?.dashboard ?? '').toUpperCase();

  return {
    isHr: roles.includes('HR') || roles.includes('ADMIN') || dashboard.includes('HR'),
    isDepartmentHead:
      roles.includes('DEPARTMENT_HEAD') ||
      roles.includes('DEPARTMENTHEAD') ||
      dashboard.includes('DEPARTMENT_HEAD'),
  };
};

const scoreBadgeClass = (label?: string) => {
  switch (label) {
    case 'Outstanding':
      return 'border-emerald-300 bg-emerald-100 text-emerald-800';
    case 'Good':
      return 'border-blue-300 bg-blue-100 text-blue-800';
    case 'Meet Requirement':
      return 'border-yellow-300 bg-yellow-100 text-yellow-800';
    case 'Need Improvement':
      return 'border-orange-300 bg-orange-100 text-orange-800';
    case 'Unsatisfactory':
      return 'border-red-300 bg-red-100 text-red-800';
    default:
      return 'border-slate-300 bg-slate-100 text-slate-700';
  }
};

const statusBadgeClass = (status?: string) => {
  switch (status) {
    case 'DRAFT':
      return 'border-slate-200 bg-slate-50 text-slate-600';
    case 'SUBMITTED':
      return 'border-violet-200 bg-violet-50 text-violet-700';
    case 'PENDING_MANAGER':
      return 'border-yellow-200 bg-yellow-50 text-yellow-800';
    case 'PENDING_DEPARTMENT_HEAD':
      return 'border-orange-200 bg-orange-50 text-orange-800';
    case 'PENDING_HR':
      return 'border-sky-200 bg-sky-50 text-sky-700';
    case 'APPROVED':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    case 'DECLINED':
    case 'REJECTED':
      return 'border-red-200 bg-red-50 text-red-700';
    default:
      return 'border-slate-200 bg-slate-50 text-slate-600';
  }
};

const formatDateTime = (value?: string | null) => {
  if (!value) return '—';

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
};

const formatDate = (value?: string | null) => {
  if (!value) return '-';

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
};

const signatureSrc = (imageData?: string | null, imageType?: string | null) => {
  if (!imageData) return '';
  return imageData.startsWith('data:')
    ? imageData
    : `data:${imageType || 'image/png'};base64,${imageData}`;
};

const flattenItems = (assessment: EmployeeAssessment): AssessmentItem[] =>
  assessment.sections.flatMap((section) =>
    section.items.map((item) => ({
      ...item,
      sectionTitle: item.sectionTitle || section.title,
    })),
  );

const ratingOptions = [5, 4, 3, 2, 1];

const statusOptions: Array<{ value: 'ALL' | AssessmentStatus; label: string }> = [
  { value: 'ALL', label: 'All Statuses' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'SUBMITTED', label: 'Submitted' },
  { value: 'PENDING_MANAGER', label: 'Pending Manager' },
  { value: 'PENDING_DEPARTMENT_HEAD', label: 'Pending Department Head' },
  { value: 'PENDING_HR', label: 'Pending HR' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'DECLINED', label: 'Declined' },
  { value: 'REJECTED', label: 'Rejected' },
];

const defaultScoreBands: AssessmentScoreBand[] = [
  {
    minScore: 86,
    maxScore: 100,
    label: 'Outstanding',
    description:
      'Performance exceptional and far exceeds expectations. Consistently demonstrates excellent standards in all job requirements.',
    sortOrder: 1,
  },
  {
    minScore: 71,
    maxScore: 85,
    label: 'Good',
    description: 'Performance is consistent. Clearly meets essential requirements of job.',
    sortOrder: 2,
  },
  {
    minScore: 60,
    maxScore: 70,
    label: 'Meet Requirement',
    description: 'Performance is satisfactory. Meets requirements of the job.',
    sortOrder: 3,
  },
  {
    minScore: 40,
    maxScore: 59,
    label: 'Need Improvement',
    description:
      'Performance is inconsistent. Meets requirements of the job occasionally. Supervision and training is required for most problem areas.',
    sortOrder: 4,
  },
  {
    minScore: 0,
    maxScore: 39,
    label: 'Unsatisfactory',
    description: 'Performance does not meet the minimum requirement of the job.',
    sortOrder: 5,
  },
];

const SignatureSlot = ({
  label,
  imageData,
  imageType,
  name,
  signedAt,
}: {
  label: string;
  imageData?: string | null;
  imageType?: string | null;
  name?: string | null;
  signedAt?: string | null;
}) => (
  <div className="appraisal-signature-slot">
    {imageData ? (
      <>
        <img
          src={signatureSrc(imageData, imageType)}
          alt={name || label}
          className="appraisal-signature-image"
        />
        <p className="appraisal-signature-date">Date: {formatDate(signedAt)}</p>
        <small className="appraisal-signature-name">{name || label}</small>
      </>
    ) : (
      <span className="appraisal-signature-placeholder">{label} — Pending</span>
    )}
  </div>
);

const SignatureBadges = ({ row }: { row: AssessmentScoreRow }) => {
  const badges = [
    { label: 'Employee', signed: row.employeeSigned },
    { label: 'Manager', signed: row.managerSigned },
    { label: 'Dept Head', signed: row.departmentHeadSigned },
    { label: 'HR', signed: row.hrSigned },
  ];

  return (
    <div className="flex min-w-[160px] flex-wrap gap-1.5">
      {badges.map((badge) => (
        <span
          key={badge.label}
          className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-bold ${
            badge.signed
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-slate-200 bg-slate-50 text-slate-500'
          }`}
        >
          <i className={`bi ${badge.signed ? 'bi-check-circle-fill' : 'bi-clock'}`} />
          {badge.label}
        </span>
      ))}
    </div>
  );
};

const AssessmentDetailModal = ({
  assessment,
  roleFlags,
  onClose,
  onChanged,
}: {
  assessment: EmployeeAssessment;
  roleFlags: RoleFlags;
  onClose: () => void;
  onChanged: (assessment: EmployeeAssessment) => void;
}) => {
  const scoreBands = assessment.scoreBands?.length
    ? assessment.scoreBands
    : defaultScoreBands;

  const items = flattenItems(assessment);
  const canDeptHeadSign = roleFlags.isDepartmentHead && assessment.status === 'PENDING_DEPARTMENT_HEAD';
  const canHrAct = roleFlags.isHr && assessment.status === 'PENDING_HR';

  const [deptHeadComment, setDeptHeadComment] = useState('');
  const [hrComment, setHrComment] = useState('');
  const [declineReason, setDeclineReason] = useState('');
  const [actionError, setActionError] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [submittingAction, setSubmittingAction] = useState<'dept-head' | 'approve' | 'decline' | null>(null);

  const handleDeptHeadSign = async () => {
    if (!assessment.id) return;

    setSubmittingAction('dept-head');
    setActionError('');
    setActionMessage('');

    try {
      const updated = await employeeAssessmentService.departmentHeadSign(
        assessment.id,
        deptHeadComment.trim() || undefined,
      );
      setActionMessage('Assessment signed and forwarded to HR.');
      onChanged(updated);
    } catch (err) {
      setActionError(getErrorMessage(err, 'Unable to sign assessment.'));
    } finally {
      setSubmittingAction(null);
    }
  };

  const handleHrApprove = async () => {
    if (!assessment.id) return;

    setSubmittingAction('approve');
    setActionError('');
    setActionMessage('');

    try {
      const updated = await employeeAssessmentService.hrApprove(
        assessment.id,
        hrComment.trim() || undefined,
      );
      setActionMessage('Assessment approved.');
      onChanged(updated);
    } catch (err) {
      setActionError(getErrorMessage(err, 'Unable to approve assessment.'));
    } finally {
      setSubmittingAction(null);
    }
  };

  const handleHrDecline = async () => {
    if (!assessment.id) return;

    const reason = declineReason.trim();

    if (!reason) {
      setActionError('Decline reason is required.');
      return;
    }

    setSubmittingAction('decline');
    setActionError('');
    setActionMessage('');

    try {
      const updated = await employeeAssessmentService.hrDecline(
        assessment.id,
        reason,
        hrComment.trim() || undefined,
      );
      setActionMessage('Assessment declined.');
      onChanged(updated);
    } catch (err) {
      setActionError(getErrorMessage(err, 'Unable to decline assessment.'));
    } finally {
      setSubmittingAction(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/60 p-4">
      <div className="w-full max-w-6xl rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Self-Assessment Details</h2>
            <p className="text-sm text-slate-500">
              Review the employee submission, signatures, comments, and workflow actions.
            </p>
          </div>

          <button
            className="rounded-full border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
            type="button"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        <div className="appraisal-page-shell" style={{ padding: 16 }}>
          <div className="appraisal-card appraisal-form-sheet">
            <div className="appraisal-template-banner">
              <h2>{assessment.formName || 'Employee Self-assessment Form'}</h2>
              <p>{assessment.companyName || 'ACE Data Systems Ltd.'}</p>
            </div>

            <div className="appraisal-inline-grid">
              <div className="appraisal-review-block">
                <h4>Employee Information</h4>
                <p><strong>Employee Name:</strong> {assessment.employeeName || '-'}</p>
                <p><strong>Employee ID:</strong> {assessment.employeeCode || '-'}</p>
                <p><strong>Current Position:</strong> {assessment.currentPosition || '-'}</p>
                <p><strong>Department:</strong> {assessment.departmentName || '-'}</p>
              </div>

              <div className="appraisal-review-block">
                <h4>Assessment Information</h4>
                <p><strong>Assessment Date:</strong> {formatDate(assessment.assessmentDate)}</p>
                <p><strong>Manager Name:</strong> {assessment.managerName || '-'}</p>
                <p><strong>Department Head:</strong> {assessment.departmentHeadName || '-'}</p>
                <p><strong>Period:</strong> {assessment.period || '-'}</p>
                <p>
                  <strong>Status:</strong>{' '}
                  <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${statusBadgeClass(assessment.status)}`}>
                    {assessment.status}
                  </span>
                </p>
                <p><strong>Score:</strong> {assessment.scorePercent ?? 0}% ({assessment.totalScore ?? 0}/{assessment.maxScore ?? 0})</p>
                <p><strong>Performance:</strong> {assessment.performanceLabel || '-'}</p>
              </div>
            </div>

            <section className="appraisal-section-card">
              <div className="appraisal-section-header">
                <strong>Assessment Subjects</strong>
                <span className="appraisal-muted">{items.length} question(s)</span>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table className="self-assessment-table">
                  <thead>
                    <tr>
                      <th rowSpan={2}>No.</th>
                      <th rowSpan={2}>Assessment Subject</th>
                      <th rowSpan={2}>Yes</th>
                      <th rowSpan={2}>No</th>
                      <th colSpan={5}>Rating</th>
                      <th rowSpan={2}>Comment</th>
                    </tr>

                    <tr>
                      {ratingOptions.map((rating) => (
                        <th key={rating}>{rating}</th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {items.map((item) => (
                      <tr key={`${item.itemOrder}-${item.questionId ?? item.id ?? item.questionText}`}>
                        <td>{item.itemOrder}</td>
                        <td><strong>{item.questionText}</strong></td>
                        <td>{item.yesNoAnswer === true ? '✓' : ''}</td>
                        <td>{item.yesNoAnswer === false ? '✓' : ''}</td>

                        {ratingOptions.map((rating) => (
                          <td key={rating}>{item.rating === rating ? '●' : ''}</td>
                        ))}

                        <td>{item.comment || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <div className="appraisal-inline-grid">
              <div className="appraisal-review-block">
                <h4>Employee Remarks</h4>
                <p>{assessment.remarks || '-'}</p>
              </div>

              <div className="appraisal-review-block">
                <h4>Score Explanation</h4>

                <table className="self-assessment-score-table">
                  <tbody>
                    {scoreBands.map((band) => (
                      <tr key={`${band.minScore}-${band.maxScore}-${band.label}`}>
                        <td><strong>{String(band.minScore).padStart(2, '0')}-{band.maxScore}</strong></td>
                        <td>
                          <strong>{band.label}</strong>
                          <br />
                          <span className="appraisal-muted">{band.description}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="appraisal-inline-grid">
              <div className="appraisal-review-block">
                <h4>Manager's Comment</h4>
                <p>{assessment.managerComment || 'No manager comment yet.'}</p>
              </div>

              <div className="appraisal-review-block">
                <h4>Department Head's Comment</h4>
                <p>{assessment.departmentHeadComment || 'No department head comment yet.'}</p>
              </div>
            </div>

            <div className="appraisal-inline-grid">
              <div className="appraisal-review-block">
                <h4>HR Comment</h4>
                <p>{assessment.hrComment || 'No HR comment yet.'}</p>
              </div>

              <div className="appraisal-review-block">
                <h4>Decline Reason</h4>
                <p>{assessment.declineReason || 'Not declined.'}</p>
              </div>
            </div>

            <div className="appraisal-signature-grid self-assessment-signature-grid" style={{ gridTemplateColumns: 'repeat(4, minmax(160px, 1fr))' }}>
              <SignatureSlot
                label="Signature of Employee & Date"
                imageData={assessment.employeeSignatureImageData}
                imageType={assessment.employeeSignatureImageType}
                name={assessment.employeeSignatureName || assessment.employeeName}
                signedAt={assessment.employeeSignedAt || assessment.submittedAt}
              />
              <SignatureSlot
                label="Signature of Manager & Date"
                imageData={assessment.managerSignatureImageData}
                imageType={assessment.managerSignatureImageType}
                name={assessment.managerSignatureName || assessment.managerName}
                signedAt={assessment.managerSignedAt}
              />
              <SignatureSlot
                label="Signature of Dept. Head & Date"
                imageData={assessment.departmentHeadSignatureImageData}
                imageType={assessment.departmentHeadSignatureImageType}
                name={assessment.departmentHeadSignatureName || assessment.departmentHeadName}
                signedAt={assessment.departmentHeadSignedAt}
              />
              <SignatureSlot
                label="Signature of HR & Date"
                imageData={assessment.hrSignatureImageData}
                imageType={assessment.hrSignatureImageType}
                name={assessment.hrSignatureName || 'HR'}
                signedAt={assessment.hrSignedAt || assessment.approvedAt}
              />
            </div>

            {(canDeptHeadSign || canHrAct) && (
              <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <h4 className="mb-4 text-base font-bold text-slate-900">Workflow Action</h4>

                {canDeptHeadSign && (
                  <div className="space-y-4">
                    <label className="block text-sm font-semibold text-slate-700">
                      Department head comment optional
                      <textarea
                        value={deptHeadComment}
                        onChange={(event) => setDeptHeadComment(event.target.value)}
                        rows={3}
                        className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                        placeholder="Add a comment before forwarding to HR..."
                      />
                    </label>

                    <button
                      type="button"
                      disabled={submittingAction !== null}
                      onClick={() => void handleDeptHeadSign()}
                      className="rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-60"
                    >
                      {submittingAction === 'dept-head' ? 'Signing...' : 'Sign & Forward to HR'}
                    </button>
                  </div>
                )}

                {canHrAct && (
                  <div className="grid gap-5 lg:grid-cols-2">
                    <div className="space-y-4 rounded-2xl border border-emerald-200 bg-white p-4">
                      <h5 className="font-bold text-emerald-800">Approve Assessment</h5>
                      <label className="block text-sm font-semibold text-slate-700">
                        HR comment optional
                        <textarea
                          value={hrComment}
                          onChange={(event) => setHrComment(event.target.value)}
                          rows={3}
                          className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                          placeholder="Add final HR comment..."
                        />
                      </label>
                      <button
                        type="button"
                        disabled={submittingAction !== null}
                        onClick={() => void handleHrApprove()}
                        className="rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60"
                      >
                        {submittingAction === 'approve' ? 'Approving...' : 'Approve'}
                      </button>
                    </div>

                    <div className="space-y-4 rounded-2xl border border-red-200 bg-white p-4">
                      <h5 className="font-bold text-red-800">Decline Assessment</h5>
                      <label className="block text-sm font-semibold text-slate-700">
                        Decline reason required
                        <textarea
                          value={declineReason}
                          onChange={(event) => setDeclineReason(event.target.value)}
                          rows={3}
                          className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-red-500 focus:ring-4 focus:ring-red-100"
                          placeholder="Explain why this assessment is declined..."
                        />
                      </label>
                      <button
                        type="button"
                        disabled={submittingAction !== null}
                        onClick={() => void handleHrDecline()}
                        className="rounded-2xl bg-red-600 px-5 py-3 text-sm font-bold text-white shadow-sm hover:bg-red-700 disabled:opacity-60"
                      >
                        {submittingAction === 'decline' ? 'Declining...' : 'Decline'}
                      </button>
                    </div>
                  </div>
                )}

                {actionMessage && (
                  <p className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">
                    {actionMessage}
                  </p>
                )}
                {actionError && (
                  <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                    {actionError}
                  </p>
                )}
              </div>
            )}

            {!canDeptHeadSign && !canHrAct && (
              <div className="appraisal-review-block">
                <h4>Review by</h4>
                <p>HR Department</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const AssessmentScoreTablePage = () => {
  const [rows, setRows] = useState<AssessmentScoreRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailLoadingId, setDetailLoadingId] = useState<number | null>(null);
  const [selectedAssessment, setSelectedAssessment] = useState<EmployeeAssessment | null>(null);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | AssessmentStatus>('ALL');

  const roleFlags = useMemo(() => getCurrentRoleFlags(), []);

  const pageLabel = roleFlags.isDepartmentHead && !roleFlags.isHr ? 'Department Head view' : 'HR view';

  const loadScoreTable = async () => {
    try {
      setLoading(true);
      setError('');

      const data = await employeeAssessmentService.scoreTable();
      setRows(data);
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to load employee assessment score table.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadScoreTable();
  }, []);

  const filteredRows = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return rows.filter((row) => {
      const matchesStatus =
        statusFilter === 'ALL' || row.status === statusFilter;

      const matchesSearch =
        !normalizedSearch ||
        row.employeeName?.toLowerCase().includes(normalizedSearch) ||
        row.employeeCode?.toLowerCase().includes(normalizedSearch) ||
        row.departmentName?.toLowerCase().includes(normalizedSearch) ||
        row.period?.toLowerCase().includes(normalizedSearch) ||
        row.status?.toLowerCase().includes(normalizedSearch) ||
        row.performanceLabel?.toLowerCase().includes(normalizedSearch) ||
        row.formName?.toLowerCase().includes(normalizedSearch);

      return matchesStatus && matchesSearch;
    });
  }, [rows, search, statusFilter]);

  const activeRows = useMemo(
    () => rows.filter((row) => row.status !== 'DRAFT'),
    [rows],
  );

  const averageScore = useMemo(() => {
    if (!activeRows.length) return 0;

    const total = activeRows.reduce(
      (sum, row) => sum + Number(row.scorePercent || 0),
      0,
    );

    return Number((total / activeRows.length).toFixed(2));
  }, [activeRows]);

  const pendingHrRows = useMemo(
    () => rows.filter((row) => row.status === 'PENDING_HR'),
    [rows],
  );

  const topScore = useMemo(() => {
    if (!rows.length) return 0;

    return Math.max(...rows.map((row) => Number(row.scorePercent || 0)));
  }, [rows]);

  const openDetails = async (row: AssessmentScoreRow) => {
    try {
      setDetailLoadingId(row.id);
      setError('');

      const data = await employeeAssessmentService.getById(row.id);
      setSelectedAssessment(data);
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to open assessment details.'));
    } finally {
      setDetailLoadingId(null);
    }
  };

  const handleAssessmentChanged = async (updated: EmployeeAssessment) => {
    setSelectedAssessment(updated);
    await loadScoreTable();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/40 to-purple-50 p-6">
      {selectedAssessment && (
        <AssessmentDetailModal
          assessment={selectedAssessment}
          roleFlags={roleFlags}
          onClose={() => setSelectedAssessment(null)}
          onChanged={(updated) => void handleAssessmentChanged(updated)}
        />
      )}

      <div className="mx-auto max-w-7xl space-y-6">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 p-6 shadow-xl">
          <div className="relative flex flex-col justify-between gap-5 md:flex-row md:items-center">
            <div>
              <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white backdrop-blur">
                <i className="bi bi-clipboard-data" />
                Assessment Workflow
              </p>

              <h1 className="text-3xl font-bold text-white">
                Employee Self-Assessment Scores
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-indigo-100">
                Review self-assessments, signatures, manager comments, department head approval, and HR final actions.
              </p>
            </div>

            <button
              type="button"
              onClick={() => void loadScoreTable()}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-bold text-indigo-700 shadow-lg shadow-indigo-900/20 transition hover:-translate-y-0.5 hover:bg-indigo-50"
            >
              <i className={`bi bi-arrow-repeat ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-3xl border border-white bg-white/80 p-5 shadow-sm backdrop-blur">
            <p className="text-sm font-medium text-slate-500">Total Records</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">{rows.length}</p>
          </div>

          <div className="rounded-3xl border border-white bg-white/80 p-5 shadow-sm backdrop-blur">
            <p className="text-sm font-medium text-slate-500">In Workflow</p>
            <p className="mt-2 text-3xl font-bold text-emerald-600">{activeRows.length}</p>
          </div>

          <div className="rounded-3xl border border-white bg-white/80 p-5 shadow-sm backdrop-blur">
            <p className="text-sm font-medium text-slate-500">Pending HR</p>
            <p className="mt-2 text-3xl font-bold text-blue-600">{pendingHrRows.length}</p>
          </div>

          <div className="rounded-3xl border border-white bg-white/80 p-5 shadow-sm backdrop-blur">
            <p className="text-sm font-medium text-slate-500">Top Score</p>
            <p className="mt-2 text-3xl font-bold text-purple-600">{topScore}%</p>
          </div>
        </div>

        <div className="rounded-3xl border border-white bg-white/90 p-5 shadow-sm backdrop-blur">
          <div className="grid gap-3 md:grid-cols-[1fr_220px_auto] md:items-center">
            <div className="relative">
              <i className="bi bi-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />

              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="w-full rounded-2xl border border-slate-300 bg-white py-3 pl-11 pr-4 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                placeholder="Search employee, code, department, form, period, status, label..."
              />
            </div>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as 'ALL' | AssessmentStatus)}
              className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>

            <span className="rounded-full bg-indigo-50 px-4 py-2 text-center text-xs font-bold text-indigo-700">
              Showing {filteredRows.length} of {rows.length}
            </span>
          </div>
        </div>

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 shadow-sm">
            <i className="bi bi-exclamation-triangle mr-2" />
            {error}
          </div>
        )}

        <div className="overflow-hidden rounded-3xl border border-white bg-white/90 shadow-sm backdrop-blur">
          <div className="flex flex-col justify-between gap-3 border-b border-slate-100 px-6 py-5 md:flex-row md:items-center">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Assessment Score Records
              </h2>

              <p className="text-sm text-slate-500">
                Click View Details to review the employee's full self-assessment.
              </p>
            </div>

            <span className="inline-flex w-fit items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
              <span className="h-2 w-2 rounded-full bg-indigo-500" />
              {pageLabel}
            </span>
          </div>

          {loading ? (
            <div className="p-12 text-center text-sm text-slate-500">
              <i className="bi bi-arrow-repeat mb-3 block animate-spin text-3xl text-indigo-600" />
              Loading assessment scores...
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="p-12 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-indigo-50 text-3xl text-indigo-600">
                <i className="bi bi-clipboard-x" />
              </div>

              <h3 className="font-bold text-slate-900">No assessment scores found</h3>

              <p className="mt-1 text-sm text-slate-500">
                Once employees submit self-assessments, their scores will appear here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50/80 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-6 py-4">Employee</th>
                    <th className="px-6 py-4">Form</th>
                    <th className="px-6 py-4">Department</th>
                    <th className="px-6 py-4">Period</th>
                    <th className="px-6 py-4">Score</th>
                    <th className="px-6 py-4">Performance</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Signatures</th>
                    <th className="px-6 py-4">Submitted</th>
                    <th className="px-6 py-4 text-right">Action</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredRows.map((row) => (
                    <tr
                      key={`${row.id}-${row.employeeId ?? row.employeeCode ?? row.employeeName}`}
                      className="transition hover:bg-indigo-50/40"
                    >
                      <td className="px-6 py-5">
                        <div className="font-bold text-slate-900">
                          {row.employeeName || 'Unknown Employee'}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          {row.employeeCode || 'No employee code'}
                        </div>
                      </td>

                      <td className="px-6 py-5 text-slate-600">
                        {row.formName || '-'}
                      </td>

                      <td className="px-6 py-5 text-slate-600">
                        {row.departmentName || 'No department'}
                      </td>

                      <td className="px-6 py-5 font-medium text-slate-700">
                        {row.period || '—'}
                      </td>

                      <td className="px-6 py-5">
                        <div className="min-w-[140px]">
                          <div className="flex items-center justify-between gap-3">
                            <span className="font-bold text-slate-900">
                              {row.scorePercent ?? 0}%
                            </span>

                            <span className="text-xs text-slate-500">
                              {row.totalScore ?? 0}/{row.maxScore ?? 0}
                            </span>
                          </div>

                          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className="h-full rounded-full bg-indigo-600"
                              style={{
                                width: `${Math.min(Number(row.scorePercent || 0), 100)}%`,
                              }}
                            />
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-5">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${scoreBadgeClass(
                            row.performanceLabel,
                          )}`}
                        >
                          {row.performanceLabel || 'Not scored'}
                        </span>
                      </td>

                      <td className="px-6 py-5">
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${statusBadgeClass(
                            row.status,
                          )}`}
                        >
                          {row.status || '—'}
                        </span>
                      </td>

                      <td className="px-6 py-5">
                        <SignatureBadges row={row} />
                      </td>

                      <td className="px-6 py-5 text-xs text-slate-500">
                        {formatDateTime(row.submittedAt)}
                      </td>

                      <td className="px-6 py-5 text-right">
                        <button
                          type="button"
                          disabled={detailLoadingId === row.id}
                          onClick={() => void openDetails(row)}
                          className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-60"
                        >
                          {detailLoadingId === row.id ? 'Opening...' : 'View Details'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <p className="text-right text-xs text-slate-500">Average active workflow score: {averageScore}%</p>
      </div>
    </div>
  );
};

export default AssessmentScoreTablePage;

