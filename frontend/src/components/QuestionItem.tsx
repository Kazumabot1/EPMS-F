import type { AppraisalQuestion, RatingValue } from '../types/appraisal';

type QuestionItemProps = {
  sectionId: string;
  question: AppraisalQuestion;
  questionIndex: number;
  onTextChange: (sectionId: string, questionId: string, value: string) => void;
  onRatingChange: (sectionId: string, questionId: string, value: RatingValue) => void;
  onRemove: (sectionId: string, questionId: string) => void;
};

const RATING_CONFIG: { value: RatingValue; label: string; color: string; bg: string; activeBg: string }[] = [
  { value: 5, label: '5', color: 'text-emerald-700', bg: 'bg-emerald-100', activeBg: 'bg-emerald-600' },
  { value: 4, label: '4', color: 'text-blue-700', bg: 'bg-blue-100', activeBg: 'bg-blue-600' },
  { value: 3, label: '3', color: 'text-yellow-700', bg: 'bg-yellow-100', activeBg: 'bg-yellow-500' },
  { value: 2, label: '2', color: 'text-orange-700', bg: 'bg-orange-100', activeBg: 'bg-orange-500' },
  { value: 1, label: '1', color: 'text-red-700', bg: 'bg-red-100', activeBg: 'bg-red-600' },
];

const QuestionItem = ({
  sectionId,
  question,
  questionIndex,
  onTextChange,
  onRatingChange,
  onRemove,
}: QuestionItemProps) => {
  return (
    <div className="group grid grid-cols-12 items-center gap-2 rounded-xl border border-white/50 bg-white/80 px-3 py-2.5 shadow-sm transition hover:bg-white">
      {/* Item number */}
      <div className="col-span-1 flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-500 shadow-inner">
        {questionIndex + 1}
      </div>

      {/* Question text */}
      <div className="col-span-7">
        <input
          type="text"
          value={question.text}
          onChange={(e) => onTextChange(sectionId, question.id, e.target.value)}
          placeholder="Enter appraisal criterion..."
          className="w-full rounded-lg border border-transparent bg-transparent px-2.5 py-1.5 text-sm text-slate-700 outline-none placeholder:text-slate-400 focus:border-blue-300"
        />
      </div>

      {/* Rating buttons */}
      <div className="col-span-3 flex items-center justify-center">
        <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1 shadow-inner">
          {RATING_CONFIG.map(({ value, label, color, bg, activeBg }) => {
            const isSelected = question.rating === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => onRatingChange(sectionId, question.id, value)}
                className={`inline-flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold transition-all ${
                  isSelected
                    ? `${activeBg} text-white shadow-md`
                    : `${bg} ${color} hover:scale-110`
                }`}
                title={`Rate ${value}`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Delete */}
      <div className="col-span-1 flex justify-end">
        <button
          type="button"
          onClick={() => onRemove(sectionId, question.id)}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-red-200/60 bg-white/60 text-red-400 text-xs transition hover:border-red-300 hover:bg-red-50 hover:text-red-600 active:scale-95"
        >
          <i className="bi bi-trash3 text-xs" />
        </button>
      </div>
    </div>
  );
};

export default QuestionItem;