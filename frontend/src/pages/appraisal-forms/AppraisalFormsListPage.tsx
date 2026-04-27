import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import ConfirmModal from '../../components/ConfirmModal';
import EmptyState from '../../components/EmptyState';
import LoadingSpinner from '../../components/LoadingSpinner';
import { useAppraisalForms } from '../../hooks/useAppraisalForms';

const scoreBadgeClass = (label: string) => {
  switch (label) {
    case 'Outstanding':
      return 'bg-emerald-100 text-emerald-800 border border-emerald-300';
    case 'Good':
      return 'bg-blue-100 text-blue-800 border border-blue-300';
    case 'Meet Requirement':
      return 'bg-yellow-100 text-yellow-800 border border-yellow-300';
    case 'Need Improvement':
      return 'bg-orange-100 text-orange-800 border border-orange-300';
    default:
      return 'bg-red-100 text-red-800 border border-red-300';
  }
};

const AppraisalFormsListPage = () => {
  const navigate = useNavigate();
  const { data, loadForms, deleteForm, loading, error } = useAppraisalForms();
  const [targetDeleteId, setTargetDeleteId] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    loadForms().catch(() => toast.error('Failed to load appraisal forms.'));
  }, [loadForms]);

  const filteredData = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return data;
    return data.filter(
      (item) =>
        item.employeeName.toLowerCase().includes(q) ||
        item.employeeId.toLowerCase().includes(q) ||
        item.department.toLowerCase().includes(q),
    );
  }, [data, query]);

  const onConfirmDelete = async () => {
    if (!targetDeleteId) return;
    try {
      await deleteForm(targetDeleteId);
      toast.success('Appraisal form deleted.');
      setTargetDeleteId(null);
    } catch {
      toast.error('Failed to delete appraisal form.');
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-100 to-slate-200 p-6">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-slate-200/60 bg-white/90 p-6 shadow-sm backdrop-blur-sm md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 shadow-md">
            <i className="bi bi-clipboard-check text-xl text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Appraisal Forms</h1>
            <p className="text-sm text-slate-500">Manage employee performance evaluations</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => navigate('/hr/appraisal-forms/create')}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-blue-700 hover:shadow-lg active:scale-95"
        >
          <i className="bi bi-plus-circle text-base" />
          New Appraisal
        </button>
      </div>

      {/* Search */}
      <div className="mb-5 flex items-center gap-3 rounded-xl border border-slate-200/60 bg-white/80 p-3 shadow-sm backdrop-blur-sm">
        <i className="bi bi-search text-slate-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by employee name, ID, or department..."
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
        />
        {query && (
          <button onClick={() => setQuery('')} className="text-slate-400 hover:text-slate-600">
            <i className="bi bi-x-circle" />
          </button>
        )}
      </div>

      {/* Content */}
      {loading && !data.length ? (
        <LoadingSpinner label="Loading appraisal forms..." />
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50/80 p-4 text-sm text-red-700 backdrop-blur-sm">
          <i className="bi bi-exclamation-triangle mr-2" />
          {error}
        </div>
      ) : !filteredData.length ? (
        <EmptyState
          title="No appraisal forms found"
          description="Create your first appraisal form to start evaluating employee performance."
        />
      ) : (
        <div className="grid gap-4">
          {filteredData.map((item) => (
            <div
              key={item.id}
              className="group relative overflow-hidden rounded-2xl border border-slate-200/60 bg-white/90 shadow-sm backdrop-blur-sm transition hover:border-blue-300 hover:shadow-md"
            >
              <div className="flex flex-col gap-4 p-5 md:flex-row md:items-center">
                {/* Left: employee info */}
                <div className="flex flex-1 items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-lg font-bold text-slate-500 shadow-inner">
                    {item.employeeName.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-base font-semibold text-slate-800">{item.employeeName}</h3>
                    <p className="truncate text-sm text-slate-500">
                      {item.employeeId} &bull; {item.department}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      <i className="bi bi-calendar-event mr-1" />
                      Assessed on {item.assessmentDate || 'N/A'}
                    </p>
                  </div>
                </div>

                {/* Center: score */}
                <div className="flex items-center gap-4 md:justify-center">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-slate-800">{item.score}%</p>
                    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold mt-1 ${scoreBadgeClass(item.performanceLabel)}`}>
                      {item.performanceLabel}
                    </span>
                  </div>
                </div>

                {/* Right: actions */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => navigate(`/hr/appraisal-forms/${item.id}`)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 active:scale-95"
                  >
                    <i className="bi bi-eye" />
                    View
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate(`/hr/appraisal-forms/${item.id}/edit`)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-white px-3 py-2 text-xs font-medium text-blue-600 transition hover:border-blue-300 hover:bg-blue-50 active:scale-95"
                  >
                    <i className="bi bi-pencil" />
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => setTargetDeleteId(item.id)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-medium text-red-500 transition hover:border-red-300 hover:bg-red-50 active:scale-95"
                  >
                    <i className="bi bi-trash3" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmModal
        open={Boolean(targetDeleteId)}
        title="Delete appraisal form?"
        message="This action cannot be undone. The selected appraisal record will be permanently removed."
        confirmText="Delete"
        loading={loading}
        onCancel={() => setTargetDeleteId(null)}
        onConfirm={onConfirmDelete}
      />
    </div>
  );
};

export default AppraisalFormsListPage;