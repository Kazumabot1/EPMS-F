import { useEffect, useMemo, useState } from 'react';
import {
  assessmentFormService,
  type AssessmentFormPayload,
  type AssessmentFormResponse,
  type AssessmentResponseType,
  type AssessmentTargetRole,
} from '../../../services/assessmentFormService';

const TARGET_ROLES: { label: string; value: AssessmentTargetRole }[] = [
  { label: 'Employee', value: 'Employee' },
  { label: 'Manager', value: 'Manager' },
  { label: 'Department Head', value: 'DepartmentHead' },
];

const RESPONSE_TYPES: AssessmentResponseType[] = ['RATING', 'TEXT', 'YES_NO'];
const RATING_OPTIONS = [1, 2, 3, 4, 5];

const RESPONSE_TYPE_LABELS: Record<AssessmentResponseType, string> = {
  RATING: 'Rating',
  TEXT: 'Text',
  YES_NO: 'Yes / No',
};

const today = () => new Date().toISOString().slice(0, 10);

const defaultEndDate = () => {
  const date = new Date();
  date.setMonth(date.getMonth() + 1);
  return date.toISOString().slice(0, 10);
};

const emptyForm = (): AssessmentFormPayload => ({
  formName: '',
  description: '',
  startDate: today(),
  endDate: defaultEndDate(),
  targetRoles: ['Employee'],
  sections: [
    {
      title: 'Performance',
      orderNo: 1,
      questions: [
        {
          questionText: '',
          responseType: 'RATING',
          isRequired: true,
          weight: 1,
        },
      ],
    },
  ],
});

const formatDate = (value?: string) => {
  if (!value) return '—';
  return new Date(value).toLocaleDateString();
};

const normalizeIntegerOneToFive = (value: number) => {
  if (!Number.isFinite(value)) return 1;
  const rounded = Math.round(value);
  if (rounded < 1) return 1;
  if (rounded > 5) return 5;
  return rounded;
};

const AssessmentFormBuilderPage = () => {
  const [forms, setForms] = useState<AssessmentFormResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<AssessmentFormPayload>(emptyForm());
  const [error, setError] = useState('');

  const activeForms = useMemo(
    () => forms.filter((item) => item.isActive !== false),
    [forms],
  );

  const totalSections = useMemo(() => {
    return forms.reduce((total, item) => total + (item.sections?.length ?? 0), 0);
  }, [forms]);

  const totalQuestions = useMemo(() => {
    return forms.reduce((total, item) => {
      return (
        total +
        (item.sections?.reduce(
          (sectionTotal, section) =>
            sectionTotal + (section.questions?.length ?? 0),
          0,
        ) ?? 0)
      );
    }, 0);
  }, [forms]);

  const getQuestionCount = (item: AssessmentFormResponse) => {
    return (
      item.sections?.reduce(
        (total, section) => total + (section.questions?.length ?? 0),
        0,
      ) ?? 0
    );
  };

  const loadForms = async () => {
    try {
      setLoading(true);
      setError('');

      const data = await assessmentFormService.getAll();
      setForms(data);
    } catch (err) {
      console.error('Failed to load assessment forms', err);
      setError('Failed to load assessment forms.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadForms();
  }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm());
    setError('');
    setPreviewOpen(false);
    setModalOpen(true);
  };

  const openEdit = (item: AssessmentFormResponse) => {
    setEditingId(item.id);

    setForm({
      formName: item.formName,
      description: item.description ?? '',
      startDate: item.startDate ?? today(),
      endDate: item.endDate ?? defaultEndDate(),
      targetRoles: item.targetRoles?.length ? item.targetRoles : ['Employee'],
      sections: item.sections?.length
        ? item.sections.map((section, sectionIndex) => ({
            id: section.id,
            title: section.title,
            orderNo: section.orderNo ?? sectionIndex + 1,
            questions: section.questions?.length
              ? section.questions.map((question) => ({
                  id: question.id,
                  questionText: question.questionText,
                  responseType: question.responseType,
                  isRequired: question.isRequired ?? true,
                  weight: normalizeIntegerOneToFive(Number(question.weight ?? 1)),
                }))
              : [
                  {
                    questionText: '',
                    responseType: 'RATING',
                    isRequired: true,
                    weight: 1,
                  },
                ],
          }))
        : emptyForm().sections,
    });

    setError('');
    setPreviewOpen(false);
    setModalOpen(true);
  };

  const updateRole = (role: AssessmentTargetRole) => {
    setForm((prev) => {
      const exists = prev.targetRoles.includes(role);

      const nextRoles = exists
        ? prev.targetRoles.filter((item) => item !== role)
        : [...prev.targetRoles, role];

      return {
        ...prev,
        targetRoles: nextRoles.length ? nextRoles : prev.targetRoles,
      };
    });
  };

  const updateSectionTitle = (sectionIndex: number, title: string) => {
    setForm((prev) => ({
      ...prev,
      sections: prev.sections.map((section, index) =>
        index === sectionIndex ? { ...section, title } : section,
      ),
    }));
  };

  const updateQuestion = (
    sectionIndex: number,
    questionIndex: number,
    patch: Partial<AssessmentFormPayload['sections'][number]['questions'][number]>,
  ) => {
    setForm((prev) => ({
      ...prev,
      sections: prev.sections.map((section, sIndex) =>
        sIndex === sectionIndex
          ? {
              ...section,
              questions: section.questions.map((question, qIndex) =>
                qIndex === questionIndex ? { ...question, ...patch } : question,
              ),
            }
          : section,
      ),
    }));
  };

  const addSection = () => {
    setForm((prev) => ({
      ...prev,
      sections: [
        ...prev.sections,
        {
          title: `Section ${prev.sections.length + 1}`,
          orderNo: prev.sections.length + 1,
          questions: [
            {
              questionText: '',
              responseType: 'RATING',
              isRequired: true,
              weight: 1,
            },
          ],
        },
      ],
    }));
  };

  const removeSection = (sectionIndex: number) => {
    setForm((prev) => {
      if (prev.sections.length === 1) return prev;

      return {
        ...prev,
        sections: prev.sections
          .filter((_, index) => index !== sectionIndex)
          .map((section, index) => ({
            ...section,
            orderNo: index + 1,
          })),
      };
    });
  };

  const moveSection = (sectionIndex: number, direction: -1 | 1) => {
    setForm((prev) => {
      const target = sectionIndex + direction;

      if (target < 0 || target >= prev.sections.length) {
        return prev;
      }

      const next = [...prev.sections];
      [next[sectionIndex], next[target]] = [next[target], next[sectionIndex]];

      return {
        ...prev,
        sections: next.map((section, index) => ({
          ...section,
          orderNo: index + 1,
        })),
      };
    });
  };

  const addQuestion = (sectionIndex: number) => {
    setForm((prev) => ({
      ...prev,
      sections: prev.sections.map((section, index) =>
        index === sectionIndex
          ? {
              ...section,
              questions: [
                ...section.questions,
                {
                  questionText: '',
                  responseType: 'RATING',
                  isRequired: true,
                  weight: 1,
                },
              ],
            }
          : section,
      ),
    }));
  };

  const removeQuestion = (sectionIndex: number, questionIndex: number) => {
    setForm((prev) => ({
      ...prev,
      sections: prev.sections.map((section, index) => {
        if (index !== sectionIndex) return section;
        if (section.questions.length === 1) return section;

        return {
          ...section,
          questions: section.questions.filter((_, qIndex) => qIndex !== questionIndex),
        };
      }),
    }));
  };

  const validate = () => {
    if (!form.formName.trim()) return 'Form name is required.';
    if (!form.startDate) return 'Start date is required.';
    if (!form.endDate) return 'End date is required.';

    if (new Date(form.startDate) > new Date(form.endDate)) {
      return 'Start date cannot be later than end date.';
    }

    if (!form.targetRoles.length) return 'Select at least one target role.';
    if (!form.sections.length) return 'Add at least one section.';

    for (const section of form.sections) {
      if (!section.title.trim()) return 'Every section needs a title.';
      if (!section.questions.length) return 'Every section needs at least one question.';

      for (const question of section.questions) {
        if (!question.questionText.trim()) return 'Every question needs text.';

        if (!Number.isInteger(Number(question.weight))) {
          return 'Rating/weight must be a whole number from 1 to 5.';
        }

        if (Number(question.weight) < 1 || Number(question.weight) > 5) {
          return 'Rating/weight must be between 1 and 5.';
        }
      }
    }

    return '';
  };

  const saveForm = async () => {
    const validationError = validate();

    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setSaving(true);
      setError('');

      const payload: AssessmentFormPayload = {
        ...form,
        formName: form.formName.trim(),
        description: form.description?.trim(),
        startDate: form.startDate,
        endDate: form.endDate,
        sections: form.sections.map((section, sectionIndex) => ({
          ...section,
          title: section.title.trim(),
          orderNo: sectionIndex + 1,
          questions: section.questions.map((question) => ({
            ...question,
            questionText: question.questionText.trim(),
            weight: normalizeIntegerOneToFive(Number(question.weight || 1)),
          })),
        })),
      };

      if (editingId) {
        await assessmentFormService.update(editingId, payload);
      } else {
        await assessmentFormService.create(payload);
      }

      setModalOpen(false);
      setPreviewOpen(false);
      await loadForms();
    } catch (err) {
      console.error('Failed to save assessment form', err);
      setError('Failed to save assessment form.');
    } finally {
      setSaving(false);
    }
  };

  const deactivate = async (id: number) => {
    const ok = window.confirm('Deactivate this assessment form?');
    if (!ok) return;

    try {
      setError('');
      await assessmentFormService.deactivate(id);
      await loadForms();
    } catch (err) {
      console.error('Failed to deactivate assessment form', err);
      setError('Failed to deactivate assessment form.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/40 to-purple-50 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 p-6 shadow-xl">
          <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/10" />
          <div className="absolute -bottom-20 right-20 h-56 w-56 rounded-full bg-white/10" />

          <div className="relative flex flex-col justify-between gap-5 md:flex-row md:items-center">
            <div>
              <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white backdrop-blur">
                <i className="bi bi-ui-checks-grid" />
                HR Assessment Forms
              </p>

              <h1 className="text-3xl font-bold text-white">
                Self-Assessment Form Builder
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-indigo-100">
                Create assessment forms with date ranges, sections, questions,
                role targeting, and rating-only 1 to 5 radio scoring.
              </p>
            </div>

            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-bold text-indigo-700 shadow-lg shadow-indigo-900/20 transition hover:-translate-y-0.5 hover:bg-indigo-50"
            >
              <i className="bi bi-plus-circle" />
              Create Form
            </button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-3xl border border-white bg-white/80 p-5 shadow-sm backdrop-blur">
            <p className="text-sm font-medium text-slate-500">Total Forms</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">{forms.length}</p>
          </div>

          <div className="rounded-3xl border border-white bg-white/80 p-5 shadow-sm backdrop-blur">
            <p className="text-sm font-medium text-slate-500">Active Forms</p>
            <p className="mt-2 text-3xl font-bold text-emerald-600">{activeForms.length}</p>
          </div>

          <div className="rounded-3xl border border-white bg-white/80 p-5 shadow-sm backdrop-blur">
            <p className="text-sm font-medium text-slate-500">Sections</p>
            <p className="mt-2 text-3xl font-bold text-violet-600">{totalSections}</p>
          </div>

          <div className="rounded-3xl border border-white bg-white/80 p-5 shadow-sm backdrop-blur">
            <p className="text-sm font-medium text-slate-500">Questions</p>
            <p className="mt-2 text-3xl font-bold text-purple-600">{totalQuestions}</p>
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
              <h2 className="text-lg font-bold text-slate-900">Assessment Forms</h2>
              <p className="text-sm text-slate-500">
                Manage active and inactive HR assessment templates.
              </p>
            </div>

            <span className="inline-flex w-fit items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
              <span className="h-2 w-2 rounded-full bg-indigo-500" />
              {activeForms.length} active form(s)
            </span>
          </div>

          {loading ? (
            <div className="p-12 text-center text-sm text-slate-500">
              <i className="bi bi-arrow-repeat mb-3 block animate-spin text-3xl text-indigo-600" />
              Loading forms...
            </div>
          ) : forms.length === 0 ? (
            <div className="p-12 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-indigo-50 text-3xl text-indigo-600">
                <i className="bi bi-clipboard-plus" />
              </div>
              <h3 className="font-bold text-slate-900">No assessment forms yet</h3>
              <p className="mt-1 text-sm text-slate-500">
                Create one to start collecting employee assessments.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50/80 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-6 py-4">Form</th>
                    <th className="px-6 py-4">Period</th>
                    <th className="px-6 py-4">Target Roles</th>
                    <th className="px-6 py-4">Structure</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Updated</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {forms.map((item) => (
                    <tr key={item.id} className="transition hover:bg-indigo-50/40">
                      <td className="px-6 py-5">
                        <div className="font-bold text-slate-900">{item.formName}</div>
                        <div className="mt-1 max-w-md truncate text-xs text-slate-500">
                          {item.description || 'No description'}
                        </div>
                      </td>

                      <td className="px-6 py-5 text-xs font-semibold text-slate-600">
                        {formatDate(item.startDate)} - {formatDate(item.endDate)}
                      </td>

                      <td className="px-6 py-5">
                        <div className="flex flex-wrap gap-1.5">
                          {(item.targetRoles || []).map((role) => (
                            <span
                              key={role}
                              className="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700"
                            >
                              {role}
                            </span>
                          ))}
                        </div>
                      </td>

                      <td className="px-6 py-5">
                        <div className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                          <span>{item.sections?.length ?? 0} section(s)</span>
                          <span>{getQuestionCount(item)} question(s)</span>
                        </div>
                      </td>

                      <td className="px-6 py-5">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
                            item.isActive
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {item.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>

                      <td className="px-6 py-5 text-xs text-slate-500">
                        {item.updatedAt ? new Date(item.updatedAt).toLocaleString() : '—'}
                      </td>

                      <td className="px-6 py-5">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openEdit(item)}
                            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
                          >
                            Edit
                          </button>

                          {item.isActive !== false && (
                            <button
                              type="button"
                              onClick={() => deactivate(item.id)}
                              className="rounded-xl border border-red-200 bg-white px-3 py-2 text-xs font-bold text-red-600 shadow-sm transition hover:bg-red-50"
                            >
                              Deactivate
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="my-6 w-full max-w-6xl overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-white">
                    {editingId ? 'Edit Assessment Form' : 'Create Assessment Form'}
                  </h2>

                  <p className="mt-1 text-sm text-indigo-100">
                    Ratings are fixed to 1, 2, 3, 4, and 5 only.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-2xl bg-white/15 p-2 text-white transition hover:bg-white/25"
                >
                  <i className="bi bi-x-lg" />
                </button>
              </div>
            </div>

            <div className="max-h-[75vh] overflow-y-auto bg-slate-50 px-6 py-5">
              <div className="space-y-5">
                <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="block">
                      <span className="mb-1 block text-sm font-bold text-slate-700">
                        Form Name
                      </span>

                      <input
                        className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                        value={form.formName}
                        onChange={(e) =>
                          setForm((prev) => ({ ...prev, formName: e.target.value }))
                        }
                        placeholder="e.g. Annual Self Assessment"
                      />
                    </label>

                    <label className="block">
                      <span className="mb-1 block text-sm font-bold text-slate-700">
                        Description
                      </span>

                      <input
                        className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                        value={form.description}
                        onChange={(e) =>
                          setForm((prev) => ({ ...prev, description: e.target.value }))
                        }
                        placeholder="Optional"
                      />
                    </label>

                    <label className="block">
                      <span className="mb-1 block text-sm font-bold text-slate-700">
                        Start Date
                      </span>

                      <input
                        type="date"
                        className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                        value={form.startDate}
                        onChange={(e) =>
                          setForm((prev) => ({ ...prev, startDate: e.target.value }))
                        }
                      />
                    </label>

                    <label className="block">
                      <span className="mb-1 block text-sm font-bold text-slate-700">
                        End Date
                      </span>

                      <input
                        type="date"
                        className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                        value={form.endDate}
                        onChange={(e) =>
                          setForm((prev) => ({ ...prev, endDate: e.target.value }))
                        }
                      />
                    </label>
                  </div>

                  <div className="mt-5">
                    <span className="mb-2 block text-sm font-bold text-slate-700">
                      Target Roles
                    </span>

                    <div className="flex flex-wrap gap-2">
                      {TARGET_ROLES.map((role) => (
                        <button
                          key={role.value}
                          type="button"
                          onClick={() => updateRole(role.value)}
                          className={`rounded-full border px-4 py-2 text-sm font-bold transition ${
                            form.targetRoles.includes(role.value)
                              ? 'border-indigo-500 bg-indigo-600 text-white shadow-md shadow-indigo-200'
                              : 'border-slate-300 bg-white text-slate-600 hover:border-indigo-300 hover:bg-indigo-50'
                          }`}
                        >
                          {role.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  {form.sections.map((section, sectionIndex) => (
                    <div
                      key={sectionIndex}
                      className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
                    >
                      <div className="flex flex-col gap-3 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-indigo-50 px-5 py-4 md:flex-row md:items-center">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-600 text-sm font-bold text-white">
                          {sectionIndex + 1}
                        </div>

                        <input
                          className="flex-1 rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                          value={section.title}
                          onChange={(e) =>
                            updateSectionTitle(sectionIndex, e.target.value)
                          }
                          placeholder="Section title"
                        />

                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => moveSection(sectionIndex, -1)}
                            disabled={sectionIndex === 0}
                            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <i className="bi bi-arrow-up" />
                          </button>

                          <button
                            type="button"
                            onClick={() => moveSection(sectionIndex, 1)}
                            disabled={sectionIndex === form.sections.length - 1}
                            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <i className="bi bi-arrow-down" />
                          </button>

                          <button
                            type="button"
                            onClick={() => removeSection(sectionIndex)}
                            disabled={form.sections.length === 1}
                            className="rounded-xl border border-red-200 bg-white px-3 py-2 text-xs font-bold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            <i className="bi bi-trash" />
                          </button>
                        </div>
                      </div>

                      <div className="space-y-3 p-5">
                        {section.questions.map((question, questionIndex) => (
                          <div
                            key={questionIndex}
                            className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                          >
                            <div className="mb-3 flex items-center justify-between">
                              <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
                                Question {questionIndex + 1}
                              </span>

                              <button
                                type="button"
                                onClick={() =>
                                  removeQuestion(sectionIndex, questionIndex)
                                }
                                disabled={section.questions.length === 1}
                                className="rounded-lg px-2 py-1 text-xs font-bold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                Remove
                              </button>
                            </div>

                            <div className="grid gap-3 md:grid-cols-[1fr_150px_150px_120px] md:items-center">
                              <input
                                className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                                value={question.questionText}
                                onChange={(e) =>
                                  updateQuestion(sectionIndex, questionIndex, {
                                    questionText: e.target.value,
                                  })
                                }
                                placeholder="Question text"
                              />

                              <select
                                className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                                value={question.responseType}
                                onChange={(e) =>
                                  updateQuestion(sectionIndex, questionIndex, {
                                    responseType: e.target.value as AssessmentResponseType,
                                  })
                                }
                              >
                                {RESPONSE_TYPES.map((type) => (
                                  <option key={type} value={type}>
                                    {RESPONSE_TYPE_LABELS[type]}
                                  </option>
                                ))}
                              </select>

                              <select
                                className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
                                value={normalizeIntegerOneToFive(Number(question.weight))}
                                onChange={(e) =>
                                  updateQuestion(sectionIndex, questionIndex, {
                                    weight: Number(e.target.value),
                                  })
                                }
                              >
                                {RATING_OPTIONS.map((rating) => (
                                  <option key={rating} value={rating}>
                                    Weight {rating}
                                  </option>
                                ))}
                              </select>

                              <label className="flex items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-600">
                                <input
                                  type="checkbox"
                                  checked={question.isRequired}
                                  onChange={(e) =>
                                    updateQuestion(sectionIndex, questionIndex, {
                                      isRequired: e.target.checked,
                                    })
                                  }
                                />
                                Required
                              </label>
                            </div>

                            {question.responseType === 'RATING' && (
                              <div className="mt-4 rounded-2xl border border-indigo-100 bg-white p-3">
                                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-indigo-600">
                                  Rating limit: only 1, 2, 3, 4, 5
                                </p>

                                <div className="flex flex-wrap gap-3">
                                  {RATING_OPTIONS.map((rating) => (
                                    <label
                                      key={rating}
                                      className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-700"
                                    >
                                      <input type="radio" disabled />
                                      {rating}
                                    </label>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}

                        <button
                          type="button"
                          onClick={() => addQuestion(sectionIndex)}
                          className="inline-flex items-center gap-2 rounded-2xl border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-sm font-bold text-indigo-700 transition hover:bg-indigo-100"
                        >
                          <i className="bi bi-plus-circle" />
                          Add Question
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={addSection}
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-700 shadow-sm transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700"
                >
                  <i className="bi bi-plus-circle" />
                  Add Section
                </button>

                {previewOpen && (
                  <div className="rounded-3xl border border-indigo-200 bg-indigo-50 p-5 shadow-sm">
                    <div className="mb-4 flex items-center justify-between">
                      <h3 className="text-lg font-bold text-indigo-950">
                        Live Preview
                      </h3>

                      <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-indigo-700">
                        {form.sections.length} section(s)
                      </span>
                    </div>

                    <div className="space-y-5 rounded-3xl bg-white p-5 shadow-sm">
                      <div>
                        <h4 className="text-xl font-bold text-slate-900">
                          {form.formName || 'Untitled Form'}
                        </h4>

                        <p className="mt-1 text-sm text-slate-500">
                          {form.description || 'No description'}
                        </p>

                        <p className="mt-2 text-xs font-bold text-slate-500">
                          Period: {formatDate(form.startDate)} - {formatDate(form.endDate)}
                        </p>

                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {form.targetRoles.map((role) => (
                            <span
                              key={role}
                              className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700"
                            >
                              {role}
                            </span>
                          ))}
                        </div>
                      </div>

                      {form.sections.map((section, index) => (
                        <div
                          key={index}
                          className="rounded-2xl border border-slate-200 p-4"
                        >
                          <h5 className="mb-4 font-bold text-slate-900">
                            {index + 1}. {section.title || 'Untitled Section'}
                          </h5>

                          <div className="space-y-4">
                            {section.questions.map((question, qIndex) => (
                              <div key={qIndex} className="rounded-xl bg-slate-50 p-4">
                                <p className="text-sm font-bold text-slate-800">
                                  {qIndex + 1}.{' '}
                                  {question.questionText || 'Untitled question'}
                                  {question.isRequired && (
                                    <span className="text-red-500"> *</span>
                                  )}
                                </p>

                                <p className="mt-1 text-xs font-medium text-slate-400">
                                  {RESPONSE_TYPE_LABELS[question.responseType]} · Weight:{' '}
                                  {normalizeIntegerOneToFive(Number(question.weight || 1))}
                                </p>

                                {question.responseType === 'RATING' && (
                                  <div className="mt-3 flex flex-wrap gap-3">
                                    {RATING_OPTIONS.map((rating) => (
                                      <label
                                        key={rating}
                                        className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-600"
                                      >
                                        <input type="radio" disabled />
                                        {rating}
                                      </label>
                                    ))}
                                  </div>
                                )}

                                {question.responseType === 'TEXT' && (
                                  <div className="mt-3 h-24 rounded-2xl border border-slate-300 bg-white" />
                                )}

                                {question.responseType === 'YES_NO' && (
                                  <div className="mt-3 flex gap-2">
                                    <span className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-600">
                                      Yes
                                    </span>
                                    <span className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-600">
                                      No
                                    </span>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-slate-100 bg-white px-6 py-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setPreviewOpen((prev) => !prev)}
                className="rounded-2xl border border-slate-300 px-5 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              >
                {previewOpen ? 'Hide Preview' : 'Preview'}
              </button>

              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-2xl border border-slate-300 px-5 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => void saveForm()}
                disabled={saving}
                className="rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-200 transition hover:-translate-y-0.5 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? (
                  <>
                    <i className="bi bi-arrow-repeat mr-2 animate-spin" />
                    Saving...
                  </>
                ) : editingId ? (
                  'Update Form'
                ) : (
                  'Create Form'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssessmentFormBuilderPage;