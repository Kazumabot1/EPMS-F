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
  { label: 'Project Manager', value: 'ProjectManager' },
];

const RESPONSE_TYPES: AssessmentResponseType[] = ['RATING', 'TEXT', 'YES_NO'];

const emptyForm = (): AssessmentFormPayload => ({
  formName: '',
  description: '',
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
    [forms]
  );

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
                  weight: question.weight ?? 1,
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
        index === sectionIndex ? { ...section, title } : section
      ),
    }));
  };

  const updateQuestion = (
    sectionIndex: number,
    questionIndex: number,
    patch: Partial<AssessmentFormPayload['sections'][number]['questions'][number]>
  ) => {
    setForm((prev) => ({
      ...prev,
      sections: prev.sections.map((section, sIndex) =>
        sIndex === sectionIndex
          ? {
              ...section,
              questions: section.questions.map((question, qIndex) =>
                qIndex === questionIndex ? { ...question, ...patch } : question
              ),
            }
          : section
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
      if (target < 0 || target >= prev.sections.length) return prev;

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
          : section
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
    if (!form.targetRoles.length) return 'Select at least one target role.';
    if (!form.sections.length) return 'Add at least one section.';

    for (const section of form.sections) {
      if (!section.title.trim()) return 'Every section needs a title.';
      if (!section.questions.length) return 'Every section needs at least one question.';

      for (const question of section.questions) {
        if (!question.questionText.trim()) return 'Every question needs text.';
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
        sections: form.sections.map((section, sectionIndex) => ({
          ...section,
          title: section.title.trim(),
          orderNo: sectionIndex + 1,
          questions: section.questions.map((question) => ({
            ...question,
            questionText: question.questionText.trim(),
            weight: Number(question.weight || 1),
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
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:flex-row md:items-center">
          <div>
            <p className="mb-2 inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-indigo-700">
              <i className="bi bi-ui-checks-grid" />
              HR Assessment Forms
            </p>

            <h1 className="text-2xl font-bold text-slate-900">
              Self-Assessment Form Builder
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Create sections and questions for employees, managers, department heads, and project managers.
              CEO and Admin roles are excluded.
            </p>
          </div>

          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
          >
            <i className="bi bi-plus-circle" />
            Create Form
          </button>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <i className="bi bi-exclamation-triangle mr-2" />
            {error}
          </div>
        )}

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="font-semibold text-slate-800">Assessment Forms</h2>
            <p className="text-sm text-slate-500">{activeForms.length} active form(s)</p>
          </div>

          {loading ? (
            <div className="p-8 text-center text-sm text-slate-500">
              <i className="bi bi-arrow-repeat mr-2 animate-spin" />
              Loading forms...
            </div>
          ) : forms.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">
              No assessment forms yet. Create one to replace the hardcoded self-assessment template.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-3">Form</th>
                    <th className="px-5 py-3">Target Roles</th>
                    <th className="px-5 py-3">Sections</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Updated</th>
                    <th className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {forms.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="px-5 py-4">
                        <div className="font-semibold text-slate-800">{item.formName}</div>
                        <div className="max-w-md truncate text-xs text-slate-500">
                          {item.description || 'No description'}
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-1">
                          {(item.targetRoles || []).map((role) => (
                            <span
                              key={role}
                              className="rounded-full bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700"
                            >
                              {role}
                            </span>
                          ))}
                        </div>
                      </td>

                      <td className="px-5 py-4 text-slate-600">
                        {item.sections?.length ?? 0}
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-semibold ${
                            item.isActive
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {item.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-slate-500">
                        {item.updatedAt ? new Date(item.updatedAt).toLocaleString() : '—'}
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openEdit(item)}
                            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() => deactivate(item.id)}
                            className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                          >
                            Deactivate
                          </button>
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
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4">
          <div className="my-6 w-full max-w-5xl rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {editingId ? 'Edit Assessment Form' : 'Create Assessment Form'}
                </h2>

                <p className="text-sm text-slate-500">
                  Build the self-assessment form HR wants employees to complete.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <i className="bi bi-x-lg" />
              </button>
            </div>

            <div className="space-y-5 px-6 py-5">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-sm font-semibold text-slate-700">
                    Form Name
                  </span>

                  <input
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                    value={form.formName}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, formName: e.target.value }))
                    }
                    placeholder="e.g. Annual Self Assessment"
                  />
                </label>

                <label className="block">
                  <span className="mb-1 block text-sm font-semibold text-slate-700">
                    Description
                  </span>

                  <input
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                    value={form.description}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, description: e.target.value }))
                    }
                    placeholder="Optional"
                  />
                </label>
              </div>

              <div>
                <span className="mb-2 block text-sm font-semibold text-slate-700">
                  Target Roles
                </span>

                <div className="flex flex-wrap gap-2">
                  {TARGET_ROLES.map((role) => (
                    <button
                      key={role.value}
                      type="button"
                      onClick={() => updateRole(role.value)}
                      className={`rounded-full border px-3 py-1.5 text-sm font-medium ${
                        form.targetRoles.includes(role.value)
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                          : 'border-slate-300 bg-white text-slate-600'
                      }`}
                    >
                      {role.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                {form.sections.map((section, sectionIndex) => (
                  <div
                    key={sectionIndex}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center">
                      <input
                        className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold outline-none focus:border-indigo-500"
                        value={section.title}
                        onChange={(e) => updateSectionTitle(sectionIndex, e.target.value)}
                        placeholder="Section title"
                      />

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => moveSection(sectionIndex, -1)}
                          className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs"
                        >
                          Up
                        </button>

                        <button
                          type="button"
                          onClick={() => moveSection(sectionIndex, 1)}
                          className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs"
                        >
                          Down
                        </button>

                        <button
                          type="button"
                          onClick={() => removeSection(sectionIndex)}
                          className="rounded-lg border border-red-200 bg-white px-2 py-1 text-xs text-red-600"
                        >
                          Remove
                        </button>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {section.questions.map((question, questionIndex) => (
                        <div
                          key={questionIndex}
                          className="rounded-xl border border-slate-200 bg-white p-3"
                        >
                          <div className="grid gap-3 md:grid-cols-[1fr_140px_100px_100px_auto] md:items-center">
                            <input
                              className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
                              value={question.questionText}
                              onChange={(e) =>
                                updateQuestion(sectionIndex, questionIndex, {
                                  questionText: e.target.value,
                                })
                              }
                              placeholder="Question text"
                            />

                            <select
                              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                              value={question.responseType}
                              onChange={(e) =>
                                updateQuestion(sectionIndex, questionIndex, {
                                  responseType: e.target.value as AssessmentResponseType,
                                })
                              }
                            >
                              {RESPONSE_TYPES.map((type) => (
                                <option key={type} value={type}>
                                  {type}
                                </option>
                              ))}
                            </select>

                            <input
                              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                              type="number"
                              min="0"
                              step="0.1"
                              value={question.weight}
                              onChange={(e) =>
                                updateQuestion(sectionIndex, questionIndex, {
                                  weight: Number(e.target.value),
                                })
                              }
                            />

                            <label className="flex items-center gap-2 text-sm text-slate-600">
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

                            <button
                              type="button"
                              onClick={() => removeQuestion(sectionIndex, questionIndex)}
                              className="rounded-lg border border-red-200 px-2 py-2 text-xs text-red-600 hover:bg-red-50"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => addQuestion(sectionIndex)}
                      className="mt-3 rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-50"
                    >
                      <i className="bi bi-plus-circle mr-1" />
                      Add Question
                    </button>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={addSection}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                <i className="bi bi-plus-circle mr-1" />
                Add Section
              </button>

              {previewOpen && (
                <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-4">
                  <h3 className="mb-3 font-bold text-indigo-900">Preview</h3>

                  <div className="space-y-4 rounded-xl bg-white p-4">
                    <div>
                      <h4 className="text-lg font-bold text-slate-900">
                        {form.formName || 'Untitled Form'}
                      </h4>
                      <p className="text-sm text-slate-500">
                        {form.description || 'No description'}
                      </p>
                    </div>

                    {form.sections.map((section, index) => (
                      <div key={index} className="rounded-xl border border-slate-200 p-4">
                        <h5 className="mb-3 font-semibold text-slate-800">
                          {index + 1}. {section.title || 'Untitled Section'}
                        </h5>

                        <div className="space-y-3">
                          {section.questions.map((question, qIndex) => (
                            <div key={qIndex}>
                              <p className="text-sm font-medium text-slate-700">
                                {qIndex + 1}. {question.questionText || 'Untitled question'}
                                {question.isRequired && <span className="text-red-500"> *</span>}
                              </p>

                              {question.responseType === 'RATING' && (
                                <div className="mt-2 flex gap-2">
                                  {[1, 2, 3, 4, 5].map((rating) => (
                                    <span
                                      key={rating}
                                      className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-300 text-sm"
                                    >
                                      {rating}
                                    </span>
                                  ))}
                                </div>
                              )}

                              {question.responseType === 'TEXT' && (
                                <div className="mt-2 h-20 rounded-lg border border-slate-300 bg-slate-50" />
                              )}

                              {question.responseType === 'YES_NO' && (
                                <div className="mt-2 flex gap-2">
                                  <span className="rounded-lg border border-slate-300 px-3 py-1 text-sm">
                                    Yes
                                  </span>
                                  <span className="rounded-lg border border-slate-300 px-3 py-1 text-sm">
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

            <div className="flex flex-col-reverse gap-3 border-t border-slate-100 px-6 py-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setPreviewOpen((prev) => !prev)}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                {previewOpen ? 'Hide Preview' : 'Preview'}
              </button>

              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => void saveForm()}
                disabled={saving}
                className="rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
              >
                {saving ? 'Saving...' : editingId ? 'Update Form' : 'Create Form'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssessmentFormBuilderPage;