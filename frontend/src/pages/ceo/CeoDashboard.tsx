import { useEffect, useMemo, useState } from 'react';
import api from '../../services/api';

interface AppraisalReview {
  id: number;
  appraisalId: number;

  employeeId?: number | null;
  employeeName?: string | null;
  employeeCode?: string | null;

  departmentId?: number | null;
  departmentName?: string | null;

  positionName?: string | null;

  cycleId?: number | null;
  cycleName?: string | null;

  managerName?: string | null;
  departmentHeadName?: string | null;

  reviewType?: string | null;
  reviewStatus?: string | null;
  reviewDecision?: string | null;

  totalScore?: number | null;
  scorePercent?: number | null;
  performanceLabel?: string | null;

  comments?: string | null;
  recommendation?: string | null;

  pmSubmittedAt?: string | null;
  deptHeadSubmittedAt?: string | null;
  hrApprovedAt?: string | null;
  updatedAt?: string | null;
}

const statusColor: Record<string, { bg: string; color: string }> = {
  PM_DRAFT: { bg: '#f1f5f9', color: '#475569' },
  DEPT_HEAD_PENDING: { bg: '#fef9c3', color: '#ca8a04' },
  HR_PENDING: { bg: '#dbeafe', color: '#2563eb' },
  COMPLETED: { bg: '#dcfce7', color: '#16a34a' },
  RETURNED: { bg: '#ffedd5', color: '#ea580c' },
  REJECTED: { bg: '#fee2e2', color: '#dc2626' },

  SUBMITTED: { bg: '#dcfce7', color: '#16a34a' },
  PENDING: { bg: '#fef9c3', color: '#ca8a04' },
  IN_PROGRESS: { bg: '#dbeafe', color: '#2563eb' },
  APPROVED: { bg: '#f0fdf4', color: '#15803d' },
};

const unwrap = <T,>(payload: any, fallback: T): T =>
  payload?.data?.data ?? payload?.data ?? fallback;

const formatStatus = (value?: string | null) =>
  value ? value.replace(/_/g, ' ') : 'Unknown';

const formatDate = (value?: string | null) => {
  if (!value) return '—';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return date.toLocaleDateString();
};

const percentText = (value?: number | null) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return '—';
  }

  return `${Number(value).toFixed(0)}%`;
};

const CeoDashboard = () => {
  const [reviews, setReviews] = useState<AppraisalReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await api.get('/appraisal-reviews');
      const data = unwrap<AppraisalReview[]>(response, []);

      setReviews(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error('Failed to load CEO appraisal reports', err);
      setError(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          'Unable to load appraisal reports. Please try again later.',
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const summary = useMemo(
    () => ({
      total: reviews.length,
      draft: reviews.filter((item) => item.reviewStatus === 'PM_DRAFT').length,
      deptPending: reviews.filter((item) => item.reviewStatus === 'DEPT_HEAD_PENDING').length,
      hrPending: reviews.filter((item) => item.reviewStatus === 'HR_PENDING').length,
      completed: reviews.filter((item) => item.reviewStatus === 'COMPLETED').length,
    }),
    [reviews],
  );

  const filtered = reviews.filter((review) => {
    const q = search.trim().toLowerCase();

    if (!q) return true;

    return (
      String(review.id).includes(q) ||
      String(review.appraisalId).includes(q) ||
      (review.employeeName ?? '').toLowerCase().includes(q) ||
      (review.employeeCode ?? '').toLowerCase().includes(q) ||
      (review.departmentName ?? '').toLowerCase().includes(q) ||
      (review.positionName ?? '').toLowerCase().includes(q) ||
      (review.cycleName ?? '').toLowerCase().includes(q) ||
      (review.reviewType ?? '').toLowerCase().includes(q) ||
      (review.reviewStatus ?? '').toLowerCase().includes(q) ||
      (review.performanceLabel ?? '').toLowerCase().includes(q) ||
      (review.comments ?? '').toLowerCase().includes(q) ||
      (review.recommendation ?? '').toLowerCase().includes(q)
    );
  });

  return (
    <div
      style={{
        padding: '2rem',
        maxWidth: '1200px',
        margin: '0 auto',
        fontFamily: 'Inter, sans-serif',
      }}
    >
      <div style={{ marginBottom: '2rem' }}>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '.4rem',
            background: 'linear-gradient(135deg,#7c3aed,#a78bfa)',
            color: '#fff',
            fontSize: '.75rem',
            fontWeight: 600,
            padding: '.3rem .8rem',
            borderRadius: '999px',
            marginBottom: '.75rem',
            textTransform: 'uppercase',
            letterSpacing: '.05em',
          }}
        >
          <i className="bi bi-eye" /> CEO · Read-Only
        </span>

        <h1
          style={{
            fontSize: '1.8rem',
            fontWeight: 700,
            color: '#1e293b',
            margin: '0 0 .25rem',
          }}
        >
          Report Review Centre
        </h1>

        <p style={{ color: '#64748b', margin: 0 }}>
          Executive view of appraisal reports. CEO accounts can review reports only.
        </p>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '.75rem',
          background: '#ede9fe',
          border: '1px solid #c4b5fd',
          borderRadius: '10px',
          padding: '1rem 1.25rem',
          marginBottom: '1.5rem',
          fontSize: '.88rem',
          color: '#5b21b6',
        }}
      >
        <i className="bi bi-info-circle-fill" style={{ fontSize: '1.1rem', flexShrink: 0 }} />
        <span>
          CEO access is read-only. Creating, editing, signing, submitting, approving, or
          deleting records remains restricted to Employee, Manager, Department Head, HR,
          or Admin workflows.
        </span>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.75rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Total Reports', value: summary.total, color: '#6366f1' },
          { label: 'Manager Draft', value: summary.draft, color: '#64748b' },
          { label: 'Dept Head Pending', value: summary.deptPending, color: '#ca8a04' },
          { label: 'HR Pending', value: summary.hrPending, color: '#2563eb' },
          { label: 'Completed', value: summary.completed, color: '#16a34a' },
        ].map((chip) => (
          <div
            key={chip.label}
            style={{
              background: '#fff',
              border: '1px solid #e2e8f0',
              borderRadius: '10px',
              padding: '.75rem 1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '.6rem',
              boxShadow: '0 1px 3px rgba(0,0,0,.04)',
              minWidth: '145px',
            }}
          >
            <strong style={{ fontSize: '1.5rem', fontWeight: 700, color: chip.color }}>
              {chip.value}
            </strong>
            <span style={{ fontSize: '.78rem', color: '#64748b', lineHeight: 1.2 }}>
              {chip.label}
            </span>
          </div>
        ))}
      </div>

      <div
        style={{
          display: 'flex',
          gap: '.75rem',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '1.25rem',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ position: 'relative', maxWidth: '420px', flex: '1 1 320px' }}>
          <i
            className="bi bi-search"
            style={{
              position: 'absolute',
              left: '.85rem',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#94a3b8',
              fontSize: '.9rem',
              pointerEvents: 'none',
            }}
          />

          <input
            type="search"
            placeholder="Search employee, department, cycle, status..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            style={{
              width: '100%',
              boxSizing: 'border-box',
              padding: '.6rem .85rem .6rem 2.2rem',
              border: '1.5px solid #e2e8f0',
              borderRadius: '8px',
              fontSize: '.88rem',
              outline: 'none',
              background: '#fff',
              fontFamily: 'inherit',
              color: '#1e293b',
            }}
          />
        </div>

        <button
          type="button"
          onClick={load}
          disabled={loading}
          style={{
            border: '1px solid #c4b5fd',
            background: '#fff',
            color: '#6d28d9',
            borderRadius: 8,
            padding: '.6rem .9rem',
            fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          <i className={`bi ${loading ? 'bi-arrow-repeat' : 'bi-arrow-clockwise'}`} /> Refresh
        </button>
      </div>

      {loading && (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#7c3aed' }}>
          <i
            className="bi bi-arrow-repeat"
            style={{ fontSize: '1.5rem', display: 'block', marginBottom: '.5rem' }}
          />
          Loading reports...
        </div>
      )}

      {error && !loading && (
        <div
          style={{
            background: '#fee2e2',
            border: '1px solid #fca5a5',
            borderRadius: '10px',
            padding: '1rem 1.25rem',
            color: '#dc2626',
            fontSize: '.9rem',
          }}
        >
          <i className="bi bi-exclamation-circle" /> {error}
        </div>
      )}

      {!loading && !error && (
        <div
          style={{
            background: '#fff',
            border: '1px solid #e2e8f0',
            borderRadius: '14px',
            overflow: 'hidden',
            boxShadow: '0 1px 4px rgba(0,0,0,.05)',
          }}
        >
          <div
            style={{
              padding: '1rem 1.25rem',
              borderBottom: '1px solid #f1f5f9',
              display: 'flex',
              alignItems: 'center',
              gap: '.5rem',
            }}
          >
            <i className="bi bi-file-earmark-text" style={{ color: '#7c3aed' }} />

            <strong style={{ fontSize: '.95rem', color: '#1e293b' }}>
              Appraisal Reports
            </strong>

            <span
              style={{
                marginLeft: 'auto',
                background: '#ede9fe',
                color: '#7c3aed',
                fontSize: '.72rem',
                fontWeight: 600,
                padding: '.2rem .6rem',
                borderRadius: '999px',
              }}
            >
              {filtered.length} record{filtered.length !== 1 ? 's' : ''}
            </span>
          </div>

          {filtered.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
              <i
                className="bi bi-inbox"
                style={{ fontSize: '2rem', display: 'block', marginBottom: '.5rem' }}
              />
              {reviews.length === 0 ? 'No appraisal reports found.' : 'No records match your search.'}
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.88rem' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    {[
                      '#',
                      'Employee',
                      'Department',
                      'Cycle',
                      'Status',
                      'Score',
                      'Label',
                      'Manager',
                      'Dept Head',
                      'Updated',
                      'Comments',
                    ].map((header) => (
                      <th
                        key={header}
                        style={{
                          padding: '.75rem 1rem',
                          textAlign: 'left',
                          fontWeight: 600,
                          fontSize: '.78rem',
                          color: '#64748b',
                          textTransform: 'uppercase',
                          letterSpacing: '.04em',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {filtered.map((review, index) => {
                    const status = review.reviewStatus ?? 'UNKNOWN';
                    const color = statusColor[status] ?? {
                      bg: '#f1f5f9',
                      color: '#475569',
                    };

                    return (
                      <tr key={review.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '.75rem 1rem', color: '#94a3b8', fontSize: '.8rem' }}>
                          {index + 1}
                        </td>

                        <td style={{ padding: '.75rem 1rem' }}>
                          <strong style={{ color: '#1e293b' }}>
                            {review.employeeName || '—'}
                          </strong>
                          <div style={{ color: '#64748b', fontSize: '.78rem' }}>
                            {review.employeeCode || `Report #${review.appraisalId}`}
                          </div>
                        </td>

                        <td style={{ padding: '.75rem 1rem', color: '#334155' }}>
                          {review.departmentName || '—'}
                        </td>

                        <td style={{ padding: '.75rem 1rem', color: '#334155' }}>
                          {review.cycleName || '—'}
                        </td>

                        <td style={{ padding: '.75rem 1rem' }}>
                          <span
                            style={{
                              background: color.bg,
                              color: color.color,
                              fontSize: '.72rem',
                              fontWeight: 700,
                              padding: '.2rem .65rem',
                              borderRadius: '999px',
                              textTransform: 'uppercase',
                              letterSpacing: '.04em',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {formatStatus(status)}
                          </span>
                        </td>

                        <td style={{ padding: '.75rem 1rem', fontWeight: 600, color: '#1e293b' }}>
                          {percentText(review.scorePercent)}
                        </td>

                        <td style={{ padding: '.75rem 1rem', color: '#334155' }}>
                          {review.performanceLabel || '—'}
                        </td>

                        <td style={{ padding: '.75rem 1rem', color: '#334155' }}>
                          {review.managerName || '—'}
                        </td>

                        <td style={{ padding: '.75rem 1rem', color: '#334155' }}>
                          {review.departmentHeadName || '—'}
                        </td>

                        <td style={{ padding: '.75rem 1rem', color: '#64748b' }}>
                          {formatDate(review.updatedAt)}
                        </td>

                        <td
                          style={{
                            padding: '.75rem 1rem',
                            color: '#64748b',
                            maxWidth: '260px',
                          }}
                        >
                          <span
                            style={{
                              display: 'block',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                            title={review.comments || review.recommendation || ''}
                          >
                            {review.comments || review.recommendation || '—'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CeoDashboard;