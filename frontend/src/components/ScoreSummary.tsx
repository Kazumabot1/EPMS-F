import { PERFORMANCE_BANDS } from '../types/appraisal';
import type { ScoreSummaryData } from '../types/appraisal';

type ScoreSummaryProps = { value: ScoreSummaryData };

const bandColor = (label: string) => {
  switch (label) {
    case 'Outstanding': return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    case 'Good':       return 'bg-blue-100 text-blue-800 border-blue-300';
    case 'Meet Requirement': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    case 'Need Improvement': return 'bg-orange-100 text-orange-800 border-orange-300';
    default:           return 'bg-red-100 text-red-800 border-red-300';
  }
};

const ScoreSummary = ({ value }: ScoreSummaryProps) => (
  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
    <div className="rounded-xl border border-emerald-200 bg-white/80 p-4 text-center shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">Total Points</p>
      <p className="mt-1 text-3xl font-extrabold text-slate-800">{value.totalPoints}</p>
      <p className="mt-0.5 text-xs text-slate-400">Sum of all ratings</p>
    </div>
    <div className="rounded-xl border border-blue-200 bg-white/80 p-4 text-center shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Final Score</p>
      <p className="mt-1 text-3xl font-extrabold text-slate-800">{value.scorePercent}%</p>
      <p className="mt-0.5 text-xs text-slate-400">{value.answeredQuestions} items rated</p>
    </div>
    <div className="flex flex-col items-center justify-center rounded-xl border bg-white/80 p-4 text-center shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Performance Band</p>
      <span className={`mt-2 inline-block rounded-full border px-4 py-1.5 text-sm font-bold ${bandColor(value.performanceLabel)}`}>
        {value.performanceLabel}
      </span>
    </div>
    <div className="md:col-span-3">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Score Reference Bands</p>
      <div className="flex flex-wrap gap-2">
        {PERFORMANCE_BANDS.map((band) => (
          <span
            key={band.label}
            className={`inline-block rounded-full border px-3 py-1 text-xs font-medium ${
              value.performanceLabel === band.label
                ? 'bg-slate-800 text-white border-slate-800'
                : 'bg-white text-slate-600 border-slate-200'
            }`}
          >
            {band.min}–{band.max}: {band.label}
          </span>
        ))}
      </div>
    </div>
  </div>
);

export default ScoreSummary;