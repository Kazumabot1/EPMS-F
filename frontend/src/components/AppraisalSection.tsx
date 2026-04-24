import QuestionItem from './QuestionItem';
import type { AppraisalSection as AppraisalSectionType, RatingValue } from '../types/appraisal';

type AppraisalSectionProps = {
  section: AppraisalSectionType;
  sectionIndex: number;
  onTitleChange: (sectionId: string, value: string) => void;
  onAddQuestion: (sectionId: string) => void;
  onRemoveSection: (sectionId: string) => void;
  onQuestionTextChange: (sectionId: string, questionId: string, value: string) => void;
  onQuestionRatingChange: (sectionId: string, questionId: string, value: RatingValue) => void;
  onQuestionRemove: (sectionId: string, questionId: string) => void;
};

const SECTION_COLORS = [
  'from-blue-50 to-indigo-50 border-blue-200',
  'from-purple-50 to-pink-50 border-purple-200',
  'from-emerald-50 to-teal-50 border-emerald-200',
  'from-amber-50 to-orange-50 border-amber-200',
  'from-rose-50 to-red-50 border-rose-200',
  'from-cyan-50 to-blue-50 border-cyan-200',
  'from-indigo-50 to-purple-50 border-indigo-200',
  'from-teal-50 to-emerald-50 border-teal-200',
];

const SECTION_ACCENTS = [
  'bg-blue-600',
  'bg-purple-600',
  'bg-emerald-600',
  'bg-amber-600',
  'bg-rose-600',
  'bg-cyan-600',
  'bg-indigo-600',
  'bg-teal-600',
];

const AppraisalSection = ({
  section,
  sectionIndex,
  onTitleChange,
  onAddQuestion,
  onRemoveSection,
  onQuestionTextChange,
  onQuestionRatingChange,
  onQuestionRemove,
}: AppraisalSectionProps) => {
  const colorIdx = sectionIndex % SECTION_COLORS.length;
  const colorClass = SECTION_COLORS[colorIdx];
  const accentClass = SECTION_ACCENTS[colorIdx];

  return (
    <div className={`overflow-hidden rounded-2xl border bg-linear-to-br ${colorClass} shadow-sm`}>
      {/* Section Header */}
      <div className="flex items-center justify-between border-b border-white/50 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className={`flex h-8 w-8 items-center justify-center rounded-lg shadow ${accentClass}`}>
            <span className="text-xs font-bold text-white">{sectionIndex + 1}</span>
          </div>
          <input
            type="text"
            value={section.title}
            onChange={(e) => onTitleChange(section.id, e.target.value)}
            className="w-full max-w-xs rounded-lg border border-transparent bg-white/60 px-3 py-1.5 text-sm font-semibold text-slate-800 outline-none focus:border-blue-300"
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onAddQuestion(section.id)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/60 bg-white/80 px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm transition hover:bg-white active:scale-95"
          >
            <i className="bi bi-plus-lg" />
            Add Row
          </button>
          <button
            type="button"
            onClick={() => onRemoveSection(section.id)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-red-200/60 bg-white/80 px-3 py-1.5 text-xs font-medium text-red-500 shadow-sm transition hover:bg-red-50 active:scale-95"
          >
            <i className="bi bi-trash3" />
          </button>
        </div>
      </div>

      {/* Questions */}
      <div className="p-4">
        {/* Column labels */}
        <div className="mb-2 grid grid-cols-12 gap-2 px-1">
          <span className="col-span-1 text-xs font-semibold text-slate-500">#</span>
          <span className="col-span-7 text-xs font-semibold text-slate-500">Appraisal Item</span>
          <span className="col-span-4 text-center text-xs font-semibold text-slate-500">Rating (5 → 1)</span>
        </div>
        <div className="space-y-2">
          {section.questions.map((question, qIdx) => (
            <QuestionItem
              key={question.id}
              sectionId={section.id}
              question={question}
              questionIndex={qIdx}
              onTextChange={onQuestionTextChange}
              onRatingChange={onQuestionRatingChange}
              onRemove={onQuestionRemove}
            />
          ))}
        </div>
        {section.questions.length === 0 && (
          <div className="rounded-lg border border-dashed border-slate-300 py-6 text-center text-sm text-slate-400">
            No items yet. Click &quot;Add Row&quot; to add a criterion.
          </div>
        )}
      </div>
    </div>
  );
};

export default AppraisalSection;