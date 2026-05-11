import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { employeeAssessmentService } from '../../services/employeeAssessmentService';
import type {
  AssessmentItem,
  AssessmentRequest,
  AssessmentScoreBand,
  EmployeeAssessment,
} from '../../types/employeeAssessment';

const ratingOptions = [5, 4, 3, 2, 1];

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

  if (error instanceof Error) {
    return error.message || fallback;
  }

  return fallback;
};

const flattenItems = (assessment: EmployeeAssessment): AssessmentItem[] =>
  assessment.sections.flatMap((section) =>
    section.items.map((item) => ({
      ...item,
      sectionTitle: item.sectionTitle || section.title,
    })),
  );

const itemNeedsYesNo = (item: AssessmentItem) => {
  const responseType = item.responseType ?? 'YES_NO_RATING';
  return responseType === 'YES_NO' || responseType === 'YES_NO_RATING';
};

const itemNeedsRating = (item: AssessmentItem) => {
  const responseType = item.responseType ?? 'YES_NO_RATING';
  return responseType === 'RATING' || responseType === 'YES_NO_RATING';
};

const answerIsMissing = (item: AssessmentItem) => {
  const responseType = item.responseType ?? 'YES_NO_RATING';

  if (item.isRequired === false) {
    return false;
  }

  if (responseType === 'TEXT') {
    return !item.comment?.trim();
  }

  if (responseType === 'YES_NO') {
    return item.yesNoAnswer === null || item.yesNoAnswer === undefined;
  }

  if (responseType === 'YES_NO_RATING') {
    return (
      item.yesNoAnswer === null ||
      item.yesNoAnswer === undefined ||
      item.rating === null ||
      item.rating === undefined
    );
  }

  return item.rating === null || item.rating === undefined;
};

const buildPayload = (assessment: EmployeeAssessment): AssessmentRequest => ({
  formId: assessment.formId ?? assessment.assessmentFormId ?? null,
  assessmentFormId: assessment.assessmentFormId ?? assessment.formId ?? null,
  period: assessment.period,
  remarks: assessment.remarks || '',
  items: flattenItems(assessment).map((item) => ({
    id: item.id ?? null,
    questionId: item.questionId ?? null,
    sectionTitle: item.sectionTitle,
    questionText: item.questionText,
    itemOrder: item.itemOrder,
    rating: item.rating ?? null,
    comment: item.comment || '',
    responseType: item.responseType ?? 'YES_NO_RATING',
    yesNoAnswer: item.yesNoAnswer ?? null,
  })),
});

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

const scoreBandForPercent = (percent: number, bands: AssessmentScoreBand[]) =>
  bands.find((band) => percent >= band.minScore && percent <= band.maxScore) ?? null;

const formatDate = (date?: string | null) => {
  if (!date) return '';

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return date;
  }

  return parsed.toLocaleDateString();
};

const EmployeeSelfAssessmentPage = () => {
  const [assessment, setAssessment] = useState<EmployeeAssessment | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');

      try {
        const data = await employeeAssessmentService.getLatestDraft();
        setAssessment(data);
      } catch (err) {
        setError(getErrorMessage(err, 'Unable to load self-assessment form.'));
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const scoreBands = useMemo(() => {
    const bands = assessment?.scoreBands?.length
      ? assessment.scoreBands
      : defaultScoreBands;

    return [...bands].sort(
      (a, b) => Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0),
    );
  }, [assessment?.scoreBands]);

  const preview = useMemo(() => {
    if (!assessment) {
      return {
        answered: 0,
        total: 0,
        totalScore: 0,
        maxScore: 0,
        percent: 0,
        label: 'Not scored',
      };
    }

    const items = flattenItems(assessment).filter((item) => item.isRequired !== false);
    const answeredItems = items.filter((item) => !answerIsMissing(item));
    const ratingItems = items.filter(
      (item) => itemNeedsRating(item) && item.rating !== null && item.rating !== undefined,
    );

    const totalScore = ratingItems.reduce(
      (sum, item) => sum + Number(item.rating || 0) * Number(item.weight || 1),
      0,
    );

    const maxScore = ratingItems.reduce(
      (sum, item) => sum + 5 * Number(item.weight || 1),
      0,
    );

    const percent =
      maxScore === 0 ? 0 : Number(((totalScore * 100) / maxScore).toFixed(2));

    const activeBand = scoreBandForPercent(percent, scoreBands);

    return {
      answered: answeredItems.length,
      total: items.length,
      totalScore,
      maxScore,
      percent,
      label: answeredItems.length === 0 ? 'Not scored' : activeBand?.label ?? 'Not scored',
    };
  }, [assessment, scoreBands]);

  const updateAssessmentField = (name: 'period' | 'remarks', value: string) => {
    setAssessment((prev) => (prev ? { ...prev, [name]: value } : prev));
  };

  const updateItem = (
    sectionTitle: string,
    itemOrder: number,
    patch: Partial<Pick<AssessmentItem, 'rating' | 'comment' | 'yesNoAnswer'>>,
  ) => {
    setAssessment((prev) => {
      if (!prev) return prev;

      return {
        ...prev,
        sections: prev.sections.map((section) => {
          if (section.title !== sectionTitle) return section;

          return {
            ...section,
            items: section.items.map((item) =>
              item.itemOrder === itemOrder ? { ...item, ...patch } : item,
            ),
          };
        }),
      };
    });
  };

  const saveDraft = async () => {
    if (!assessment) return null;

    setSaving(true);
    setMessage('');
    setError('');

    try {
      const saved = await employeeAssessmentService.saveDraft(
        buildPayload(assessment),
        assessment.id,
      );

      setAssessment(saved);
      setMessage('Draft saved successfully.');
      return saved;
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          'Unable to save self-assessment draft. You can still try Submit Assessment.',
        ),
      );
      return null;
    } finally {
      setSaving(false);
    }
  };

  const submitAssessment = async () => {
    if (!assessment) return;

    const missing = flattenItems(assessment).filter(answerIsMissing);

    if (missing.length) {
      setError('Please answer every required assessment subject before submitting.');
      return;
    }

    setSubmitting(true);
    setMessage('');
    setError('');

    try {
      const payload = buildPayload(assessment);
      const submitted = assessment.id
        ? await employeeAssessmentService.submit(assessment.id, payload)
        : await employeeAssessmentService.submit(payload);

      setAssessment(submitted);
      setMessage('Self-assessment submitted successfully. Your score table has been updated.');
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to submit self-assessment.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await submitAssessment();
  };

  if (loading) {
    return (
      <div className="rounded-xl bg-white p-6 text-sm text-slate-600 shadow-sm">
        Loading self-assessment...
      </div>
    );
  }

  if (error && !assessment) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {error}
      </div>
    );
  }

  if (!assessment) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600 shadow-sm">
        No self-assessment form is available for your role.
      </div>
    );
  }

  const isSubmitted = assessment.status === 'SUBMITTED';
  const activeBand = scoreBandForPercent(preview.percent, scoreBands);

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <form
        onSubmit={handleSubmit}
        className="mx-auto max-w-6xl overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-sm"
      >
        <div className="border-b border-slate-300 p-6 text-center">
          <h1 className="text-2xl font-bold text-slate-900">
            {assessment.formName || 'Employee Self-assessment Form'}
          </h1>
          <p className="mt-1 text-sm font-semibold text-slate-600">
            {assessment.companyName || 'ACE Data Systems Ltd.'}
          </p>
        </div>

        <div className="grid grid-cols-1 border-b border-slate-300 md:grid-cols-2">
          <div className="space-y-2 border-slate-300 p-5 md:border-r">
            <InfoRow label="Employee Name" value={assessment.employeeName} />
            <InfoRow label="Employee ID" value={assessment.employeeCode || ''} />
            <InfoRow label="Current Position" value={assessment.currentPosition || ''} />
            <InfoRow label="Department" value={assessment.departmentName || ''} />
          </div>

          <div className="space-y-2 p-5">
            <InfoRow label="Assessment Date" value={formatDate(assessment.assessmentDate)} />
            <InfoRow label="Manager Name" value={assessment.managerName || ''} />
            <label className="grid grid-cols-[145px_1fr] items-center gap-3 text-sm">
              <span className="font-semibold text-slate-700">Assessment Period :</span>
              <input
                type="text"
                value={assessment.period || ''}
                disabled={isSubmitted}
                onChange={(event) => updateAssessmentField('period', event.target.value)}
                className="rounded border border-slate-300 px-2 py-1 text-sm outline-none focus:border-blue-500 disabled:bg-slate-100"
                required
              />
            </label>
            <InfoRow label="Status" value={assessment.status} />
          </div>
        </div>

        <div className="overflow-x-auto p-5">
          <table className="w-full min-w-[860px] border-collapse text-sm">
            <thead>
              <tr className="bg-slate-100 text-slate-800">
                <th rowSpan={2} className="border border-slate-400 px-3 py-2 text-left">
                  No.
                </th>
                <th rowSpan={2} className="border border-slate-400 px-3 py-2 text-left">
                  Assessment Subject
                </th>
                <th rowSpan={2} className="border border-slate-400 px-3 py-2 text-center">
                  Yes
                </th>
                <th rowSpan={2} className="border border-slate-400 px-3 py-2 text-center">
                  No
                </th>
                <th colSpan={5} className="border border-slate-400 px-3 py-2 text-center">
                  Rating
                </th>
              </tr>
              <tr className="bg-slate-100 text-slate-800">
                {ratingOptions.map((rating) => (
                  <th key={rating} className="border border-slate-400 px-3 py-2 text-center">
                    {rating}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {assessment.sections.map((section) =>
                section.items.map((item) => {
                  const sectionTitle = item.sectionTitle || section.title;

                  return (
                    <tr key={`${sectionTitle}-${item.itemOrder}`}>
                      <td className="border border-slate-300 px-3 py-2 text-center font-semibold">
                        {item.itemOrder}
                      </td>

                      <td className="border border-slate-300 px-3 py-2">
                        <div className="font-medium text-slate-900">{item.questionText}</div>

                        {item.responseType === 'TEXT' && (
                          <textarea
                            value={item.comment || ''}
                            disabled={isSubmitted}
                            onChange={(event) =>
                              updateItem(sectionTitle, item.itemOrder, {
                                comment: event.target.value,
                              })
                            }
                            className="mt-2 w-full rounded border border-slate-300 px-2 py-1 text-sm outline-none focus:border-blue-500 disabled:bg-slate-100"
                            rows={2}
                            placeholder="Write your answer..."
                          />
                        )}
                      </td>

                      <td className="border border-slate-300 px-3 py-2 text-center">
                        {itemNeedsYesNo(item) ? (
                          <input
                            type="checkbox"
                            checked={item.yesNoAnswer === true}
                            disabled={isSubmitted}
                            onChange={() =>
                              updateItem(sectionTitle, item.itemOrder, {
                                yesNoAnswer: item.yesNoAnswer === true ? null : true,
                              })
                            }
                            className="h-5 w-5"
                          />
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>

                      <td className="border border-slate-300 px-3 py-2 text-center">
                        {itemNeedsYesNo(item) ? (
                          <input
                            type="checkbox"
                            checked={item.yesNoAnswer === false}
                            disabled={isSubmitted}
                            onChange={() =>
                              updateItem(sectionTitle, item.itemOrder, {
                                yesNoAnswer: item.yesNoAnswer === false ? null : false,
                              })
                            }
                            className="h-5 w-5"
                          />
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>

                      {ratingOptions.map((rating) => (
                        <td key={rating} className="border border-slate-300 px-3 py-2 text-center">
                          {itemNeedsRating(item) ? (
                            <input
                              type="radio"
                              name={`rating-${sectionTitle}-${item.itemOrder}`}
                              checked={item.rating === rating}
                              disabled={isSubmitted}
                              onChange={() =>
                                updateItem(sectionTitle, item.itemOrder, {
                                  rating,
                                })
                              }
                              className="h-4 w-4"
                            />
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  );
                }),
              )}
            </tbody>
          </table>
        </div>

        <div className="grid grid-cols-1 gap-5 border-t border-slate-300 p-5 lg:grid-cols-[1fr_340px]">
          <div className="space-y-4">
            <div>
              <h2 className="mb-2 text-sm font-bold uppercase text-slate-700">Formula</h2>

              <div className="rounded border border-slate-300 bg-slate-50 p-4 text-sm text-slate-700">
                <div className="font-semibold">
                  Score = Total Points / (Number of Questions Answered x 5) x 100
                </div>

                <div className="mt-2">
                  Current score: {preview.totalScore} / {preview.maxScore || 0} ={' '}
                  <span className="font-bold">{preview.percent}%</span>
                </div>

                <div className="mt-1">
                  Current range:{' '}
                  <span className="font-bold">{preview.label}</span>
                  {activeBand?.description ? ` - ${activeBand.description}` : ''}
                </div>
              </div>
            </div>

            <label className="block text-sm font-semibold text-slate-700">
              Other remarks:
              <textarea
                value={assessment.remarks || ''}
                disabled={isSubmitted}
                onChange={(event) => updateAssessmentField('remarks', event.target.value)}
                className="mt-2 w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 disabled:bg-slate-100"
                rows={5}
                placeholder="Write your remarks..."
              />
            </label>

            <div className="rounded border border-slate-300 p-4 text-sm text-slate-700">
              <div className="font-semibold">Manager's Comment for self-assessment result:</div>

              <div className="mt-8 min-h-16 border-b border-slate-300 text-slate-400">
                {assessment.managerComment || ''}
              </div>
            </div>
          </div>

          <div>
            <h2 className="mb-2 text-sm font-bold uppercase text-slate-700">
              Score Explanation
            </h2>

            <table className="w-full border-collapse text-sm">
              <tbody>
                {scoreBands.map((band) => (
                  <tr key={`${band.minScore}-${band.maxScore}-${band.label}`}>
                    <td className="w-20 border border-slate-300 px-2 py-2 font-semibold">
                      {String(band.minScore).padStart(2, '0')}-{band.maxScore}
                    </td>

                    <td className="border border-slate-300 px-2 py-2">
                      <div className="font-semibold">{band.label}</div>

                      {band.description && (
                        <div className="text-xs text-slate-500">{band.description}</div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 border-t border-slate-300 p-8 text-sm md:grid-cols-2">
          <div className="pt-10 text-center">
            <div className="border-t border-slate-500 pt-2 font-semibold">
              Signature of Employee & Date
            </div>
          </div>

          <div className="pt-10 text-center">
            <div className="border-t border-slate-500 pt-2 font-semibold">
              Signature of Manager & Date
            </div>
          </div>
        </div>

        <div className="border-t border-slate-300 p-5 text-sm">
          <div className="font-semibold">Review by:</div>
          <div>HR Department</div>
        </div>

        {message && (
          <div className="mx-5 mb-4 rounded border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
            {message}
          </div>
        )}

        {error && (
          <div className="mx-5 mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {!isSubmitted && (
          <div className="flex flex-col gap-3 border-t border-slate-300 p-5 sm:flex-row sm:justify-end">
            <button
              type="button"
              disabled={saving || submitting}
              onClick={() => void saveDraft()}
              className="rounded-lg border border-slate-300 px-5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Save Draft'}
            </button>

            <button
              type="submit"
              disabled={saving || submitting}
              className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
            >
              {submitting ? 'Submitting...' : 'Submit Assessment'}
            </button>
          </div>
        )}
      </form>
    </div>
  );
};

const InfoRow = ({ label, value }: { label: string; value: string }) => (
  <div className="grid grid-cols-[145px_1fr] gap-3 text-sm">
    <span className="font-semibold text-slate-700">{label} :</span>
    <span className="min-h-6 border-b border-slate-300 text-slate-900">{value}</span>
  </div>
);

export default EmployeeSelfAssessmentPage;