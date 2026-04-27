import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import AppraisalHeaderFields from '../../components/AppraisalHeaderFields';
import AppraisalSection from '../../components/AppraisalSection';
import RemarksSection from '../../components/RemarksSection';
import ScoreSummary from '../../components/ScoreSummary';
import LoadingSpinner from '../../components/LoadingSpinner';
import { useAppraisalForms } from '../../hooks/useAppraisalForms';
import { DEFAULT_SECTION_TITLES } from '../../types/appraisal';
import type { AppraisalFormPayload, AppraisalMeta, AppraisalRemarks, RatingValue } from '../../types/appraisal';
import {
  calculateScoreSummary,
  createDefaultFormPayload,
  createEmptyQuestion,
  createEmptySection,
  normalizeSectionQuestionNumbers,
  toFormPayload,
} from '../../utils/appraisal';

type MetaErrors = Partial<Record<keyof AppraisalMeta, string>>;

const AppraisalFormBuilder = () => {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { getFormById, createForm, updateForm, loading } = useAppraisalForms();
  const [form, setForm] = useState<AppraisalFormPayload>(() => createDefaultFormPayload(DEFAULT_SECTION_TITLES));
  const [metaErrors, setMetaErrors] = useState<MetaErrors>({});
  const [pageError, setPageError] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    const run = async () => {
      setInitialLoading(true);
      setPageError(null);
      try {
        const response = await getFormById(id);
        setForm(toFormPayload(response));
      } catch {
        setPageError('Unable to load appraisal form.');
      } finally {
        setInitialLoading(false);
      }
    };
    run();
  }, [getFormById, id]);

  const scoreSummary = useMemo(() => calculateScoreSummary(form.sections), [form.sections]);

  const onMetaChange = (name: keyof AppraisalMeta, value: string) => {
    setForm((prev) => ({ ...prev, meta: { ...prev.meta, [name]: value } }));
    setMetaErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const onRemarksChange = (name: keyof AppraisalRemarks, value: string) =>
    setForm((prev) => ({ ...prev, remarks: { ...prev.remarks, [name]: value } }));

  const onSectionTitleChange = (sectionId: string, value: string) =>
    setForm((prev) => ({
      ...prev,
      sections: prev.sections.map((section) => (section.id === sectionId ? { ...section, title: value } : section)),
    }));

  const onQuestionTextChange = (sectionId: string, questionId: string, value: string) =>
    setForm((prev) => ({
      ...prev,
      sections: prev.sections.map((section) =>
        section.id === sectionId
          ? { ...section, questions: section.questions.map((q) => (q.id === questionId ? { ...q, text: value } : q)) }
          : section,
      ),
    }));

  const onQuestionRatingChange = (sectionId: string, questionId: string, value: RatingValue) =>
    setForm((prev) => ({
      ...prev,
      sections: prev.sections.map((section) =>
        section.id === sectionId
          ? { ...section, questions: section.questions.map((q) => (q.id === questionId ? { ...q, rating: value } : q)) }
          : section,
      ),
    }));

  const onAddQuestion = (sectionId: string) =>
    setForm((prev) => ({
      ...prev,
      sections: prev.sections.map((section) =>
        section.id === sectionId
          ? { ...section, questions: [...section.questions, createEmptyQuestion(section.questions.length + 1)] }
          : section,
      ),
    }));

  const onRemoveQuestion = (sectionId: string, questionId: string) =>
    setForm((prev) => ({
      ...prev,
      sections: normalizeSectionQuestionNumbers(
        prev.sections.map((section) => {
          if (section.id !== sectionId) return section;
          const next = section.questions.filter((q) => q.id !== questionId);
          return { ...section, questions: next.length ? next : [createEmptyQuestion(1)] };
        }),
      ),
    }));

  const onAddSection = () =>
    setForm((prev) => ({
      ...prev,
      sections: [...prev.sections, createEmptySection(`Section ${prev.sections.length + 1}`)],
    }));

  const onRemoveSection = (sectionId: string) =>
    setForm((prev) => {
      if (prev.sections.length === 1) return prev;
      return { ...prev, sections: prev.sections.filter((s) => s.id !== sectionId) };
    });

  const validate = (): boolean => {
    const next: MetaErrors = {};
    if (!form.meta.employeeName.trim()) next.employeeName = 'Required';
    if (!form.meta.employeeId.trim()) next.employeeId = 'Required';
    if (!form.meta.currentPosition.trim()) next.currentPosition = 'Required';
    if (!form.meta.department.trim()) next.department = 'Required';
    if (!form.meta.assessmentDate) next.assessmentDate = 'Required';
    if (!form.meta.effectiveDate) next.effectiveDate = 'Required';
    setMetaErrors(next);
    return Object.keys(next).length === 0;
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!validate()) {
      toast.error('Please complete all required header fields.');
      return;
    }
    const payload: AppraisalFormPayload = {
      ...form,
      sections: normalizeSectionQuestionNumbers(form.sections),
    };
    try {
      if (id) {
        await updateForm(id, payload);
        toast.success('Appraisal form updated successfully.');
      } else {
        await createForm(payload);
        toast.success('Appraisal form created successfully.');
      }
      navigate('/hr/appraisal-forms');
    } catch {
      toast.error('Failed to save appraisal form.');
    }
  };

  if (initialLoading) return <LoadingSpinner label="Loading appraisal form..." />;

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-100 to-slate-200 p-6">
      <div className="mx-auto max-w-5xl space-y-5">
        {/* Page Header */}
        <div className="flex flex-col gap-4 rounded-2xl border border-slate-200/60 bg-white/90 p-6 shadow-sm backdrop-blur-sm md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className={`flex h-12 w-12 items-center justify-center rounded-xl shadow-md ${isEdit ? 'bg-amber-500' : 'bg-blue-600'}`}>
              <i className={`bi ${isEdit ? 'bi-pencil-square' : 'bi-file-earmark-plus'} text-xl text-white`} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">{isEdit ? 'Edit Appraisal Form' : 'Create Appraisal Form'}</h1>
              <p className="text-sm text-slate-500">Fill in employee information, rate each criterion, and get automatic scoring.</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/hr/appraisal-forms')}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 active:scale-95"
            >
              <i className="bi bi-arrow-left" />
              Back
            </button>
            <button
              type="submit"
              form="appraisal-form"
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-blue-700 active:scale-95 disabled:opacity-60"
            >
              {loading ? (
                <>
                  <i className="bi bi-arrow-repeat animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <i className={`bi ${isEdit ? 'bi-check-lg' : 'bi-save'}`} />
                  {isEdit ? 'Update Form' : 'Create Form'}
                </>
              )}
            </button>
          </div>
        </div>

        {pageError && (
          <div className="rounded-xl border border-red-200 bg-red-50/80 p-4 text-sm text-red-700 backdrop-blur-sm">
            <i className="bi bi-exclamation-triangle mr-2" />
            {pageError}
          </div>
        )}

        <form id="appraisal-form" onSubmit={onSubmit} className="space-y-5">
          {/* Employee Profile Card */}
          <div className="overflow-hidden rounded-2xl border border-slate-200/60 bg-white/90 shadow-sm backdrop-blur-sm">
            <div className="flex items-center gap-3 border-b border-slate-100 bg-linear-to-r from-blue-50 to-indigo-50 px-5 py-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 shadow">
                <i className="bi bi-person-badge text-white" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-800">Employee Profile</h2>
                <p className="text-xs text-slate-500">Core identification and assessment period details</p>
              </div>
            </div>
            <div className="p-5">
              <AppraisalHeaderFields value={form.meta} errors={metaErrors} onChange={onMetaChange} />
            </div>
          </div>

          {/* Assessment Sections */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 shadow">
                <i className="bi bi-ui-checks text-white" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-800">Assessment Sections</h2>
                <p className="text-xs text-slate-500">{form.sections.length} sections &bull; Rate each item 1–5</p>
              </div>
            </div>
            <button
              type="button"
              onClick={onAddSection}
              className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-white px-4 py-2 text-xs font-semibold text-indigo-600 transition hover:bg-indigo-50 active:scale-95"
            >
              <i className="bi bi-folder-plus" />
              Add Section
            </button>
          </div>

          <div className="space-y-4">
            {form.sections.map((section, sIdx) => (
              <AppraisalSection
                key={section.id}
                section={section}
                sectionIndex={sIdx}
                onTitleChange={onSectionTitleChange}
                onAddQuestion={onAddQuestion}
                onRemoveSection={onRemoveSection}
                onQuestionTextChange={onQuestionTextChange}
                onQuestionRatingChange={onQuestionRatingChange}
                onQuestionRemove={onRemoveQuestion}
              />
            ))}
          </div>

          {/* Score Summary Card */}
          <div className="overflow-hidden rounded-2xl border border-emerald-200/60 bg-linear-to-br from-emerald-50/90 to-teal-50/90 shadow-sm backdrop-blur-sm">
            <div className="flex items-center gap-3 border-b border-emerald-100 px-5 py-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500 shadow">
                <i className="bi bi-bar-chart-fill text-white" />
              </div>
              <div>
                <h2 className="text-base font-bold text-emerald-800">Live Score Summary</h2>
                <p className="text-xs text-emerald-600">Updates automatically as you rate items</p>
              </div>
            </div>
            <div className="p-5">
              <ScoreSummary value={scoreSummary} />
            </div>
          </div>

          {/* Remarks & Signatures Card */}
          <div className="overflow-hidden rounded-2xl border border-slate-200/60 bg-white/90 shadow-sm backdrop-blur-sm">
            <div className="flex items-center gap-3 border-b border-slate-100 bg-linear-to-r from-slate-50 to-slate-100 px-5 py-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-600 shadow">
                <i className="bi bi-pencil-square text-white" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-800">Remarks & Signatures</h2>
                <p className="text-xs text-slate-500">Comments, feedback, and sign-off records</p>
              </div>
            </div>
            <div className="p-5">
              <RemarksSection value={form.remarks} onChange={onRemarksChange} />
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AppraisalFormBuilder;