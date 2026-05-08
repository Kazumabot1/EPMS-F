import { useEffect, useMemo, useState } from 'react';
import { employeeAssessmentService } from '../../services/employeeAssessmentService';
import type { AssessmentScoreRow } from '../../types/employeeAssessment';

const getErrorMessage = (error: unknown, fallback: string) => {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const response = (
      error as {
        response?: {
          data?: {
            message?: string;
            error?: string;
          };
          status?: number;
        };
      }
    ).response;

    return response?.data?.message || response?.data?.error || fallback;
  }

  if (error instanceof Error) {
    return error.message || fallback;
  }

  return fallback;
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
    case 'SUBMITTED':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    case 'DRAFT':
      return 'border-slate-200 bg-slate-50 text-slate-600';
    case 'APPROVED':
      return 'border-blue-200 bg-blue-50 text-blue-700';
    case 'REJECTED':
      return 'border-red-200 bg-red-50 text-red-700';
    default:
      return 'border-slate-200 bg-slate-50 text-slate-600';
  }
};

const formatDate = (value?: string | null) => {
  if (!value) return '—';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return date.toLocaleString();
};

const AssessmentScoreTablePage = () => {
  const [rows, setRows] = useState<AssessmentScoreRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const loadScoreTable = async () => {
    try {
      setLoading(true);
      setError('');

      const data = await employeeAssessmentService.scoreTable();
      setRows(data);
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          'Unable to load employee assessment score table.',
        ),
      );
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
        row.performanceLabel?.toLowerCase().includes(normalizedSearch);

      return matchesStatus && matchesSearch;
    });
  }, [rows, search, statusFilter]);

  const submittedRows = useMemo(
    () => rows.filter((row) => row.status === 'SUBMITTED'),
    [rows],
  );

  const averageScore = useMemo(() => {
    if (!submittedRows.length) return 0;

    const total = submittedRows.reduce(
      (sum, row) => sum + Number(row.scorePercent || 0),
      0,
    );

    return Number((total / submittedRows.length).toFixed(2));
  }, [submittedRows]);

  const topScore = useMemo(() => {
    if (!rows.length) return 0;

    return Math.max(...rows.map((row) => Number(row.scorePercent || 0)));
  }, [rows]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/40 to-purple-50 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 p-6 shadow-xl">
          <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/10" />
          <div className="absolute -bottom-20 right-20 h-56 w-56 rounded-full bg-white/10" />

          <div className="relative flex flex-col justify-between gap-5 md:flex-row md:items-center">
            <div>
              <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white backdrop-blur">
                <i className="bi bi-clipboard-data" />
                HR Assessment Scores
              </p>

              <h1 className="text-3xl font-bold text-white">
                Employee Assessment Score Table
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-indigo-100">
                Review submitted self-assessments, score percentages, performance labels,
                departments, and submission dates.
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
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  Total Records
                </p>
                <p className="mt-2 text-3xl font-bold text-slate-900">
                  {rows.length}
                </p>
              </div>

              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-xl text-indigo-600">
                <i className="bi bi-table" />
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-white bg-white/80 p-5 shadow-sm backdrop-blur">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  Submitted
                </p>
                <p className="mt-2 text-3xl font-bold text-emerald-600">
                  {submittedRows.length}
                </p>
              </div>

              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-xl text-emerald-600">
                <i className="bi bi-check2-circle" />
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-white bg-white/80 p-5 shadow-sm backdrop-blur">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  Average Score
                </p>
                <p className="mt-2 text-3xl font-bold text-blue-600">
                  {averageScore}%
                </p>
              </div>

              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-xl text-blue-600">
                <i className="bi bi-graph-up" />
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-white bg-white/80 p-5 shadow-sm backdrop-blur">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  Top Score
                </p>
                <p className="mt-2 text-3xl font-bold text-purple-600">
                  {topScore}%
                </p>
              </div>

              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-50 text-xl text-purple-600">
                <i className="bi bi-trophy" />
              </div>
            </div>
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
                placeholder="Search employee, code, department, period, label..."
              />
            </div>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
            >
              <option value="ALL">All Statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="SUBMITTED">Submitted</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
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
                Submitted employee self-assessments should appear here.
              </p>
            </div>

            <span className="inline-flex w-fit items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
              <span className="h-2 w-2 rounded-full bg-indigo-500" />
              HR view
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

              <h3 className="font-bold text-slate-900">
                No assessment scores found
              </h3>

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
                    <th className="px-6 py-4">Department</th>
                    <th className="px-6 py-4">Period</th>
                    <th className="px-6 py-4">Score</th>
                    <th className="px-6 py-4">Performance</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Submitted</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredRows.map((row) => (
                    <tr
                      key={`${row.id}-${row.employeeId ?? row.employeeCode ?? row.employeeName}`}
                      className="transition hover:bg-indigo-50/40"
                    >
                      <td className="px-6 py-5">
                        <div className="flex items-start gap-3">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-sm font-bold text-indigo-600">
                            {row.employeeName
                              ? row.employeeName
                                  .split(' ')
                                  .map((part) => part[0])
                                  .join('')
                                  .slice(0, 2)
                                  .toUpperCase()
                              : 'E'}
                          </div>

                          <div>
                            <div className="font-bold text-slate-900">
                              {row.employeeName || 'Unknown Employee'}
                            </div>
                            <div className="mt-1 text-xs text-slate-500">
                              {row.employeeCode || 'No employee code'}
                            </div>
                          </div>
                        </div>
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

                      <td className="px-6 py-5 text-xs text-slate-500">
                        {formatDate(row.submittedAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AssessmentScoreTablePage;