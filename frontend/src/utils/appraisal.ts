import {
  PERFORMANCE_BANDS,
} from '../types/appraisal';
import type { AppraisalForm, AppraisalFormPayload, AppraisalMeta, AppraisalRemarks, AppraisalSection, ScoreSummaryData } from '../types/appraisal';

const randomId = () => `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

export const createEmptyQuestion = (itemNo: number) => ({
  id: randomId(),
  itemNo,
  text: '',
  rating: null,
} as const);

export const createEmptySection = (title: string): AppraisalSection => ({
  id: randomId(),
  title,
  questions: [createEmptyQuestion(1)],
});

export const createDefaultMeta = (): AppraisalMeta => ({
  employeeName: '',
  employeeId: '',
  currentPosition: '',
  department: '',
  assessmentDate: '',
  effectiveDate: '',
});

export const createDefaultRemarks = (): AppraisalRemarks => ({
  otherRemarks: '',
  appraiserComment: '',
  appraiseeSignature: '',
  appraiseeSignedDate: '',
  appraiserSignature: '',
  appraiserSignedDate: '',
  reviewedBy: '',
  hrSignature: '',
  hrSignedDate: '',
  hrDesignation: '',
});

export const calculateScoreSummary = (sections: AppraisalSection[]): ScoreSummaryData => {
  const ratings = sections.flatMap((section) =>
    section.questions
      .map((question) => question.rating)
      .filter((rating): rating is NonNullable<typeof rating> => rating !== null),
  );

  const totalPoints = ratings.reduce((sum, value) => sum + value, 0);
  const answeredQuestions = ratings.length;
  const scorePercent =
    answeredQuestions === 0 ? 0 : Number(((totalPoints * 100) / (answeredQuestions * 5)).toFixed(2));
  const performanceLabel = PERFORMANCE_BANDS.find(
    (band) => scorePercent >= band.min && scorePercent <= band.max,
  )?.label ?? 'Unsatisfactory';

  return {
    totalPoints,
    answeredQuestions,
    scorePercent,
    performanceLabel,
  };
};

export const normalizeSectionQuestionNumbers = (sections: AppraisalSection[]): AppraisalSection[] =>
  sections.map((section) => ({
    ...section,
    questions: section.questions.map((question, index) => ({ ...question, itemNo: index + 1 })),
  }));

export const createDefaultFormPayload = (sectionTitles: readonly string[]): AppraisalFormPayload => ({
  meta: createDefaultMeta(),
  sections: sectionTitles.map((title) => createEmptySection(title)),
  remarks: createDefaultRemarks(),
});

export const toFormPayload = (form: AppraisalForm): AppraisalFormPayload => ({
  meta: form.meta,
  sections: normalizeSectionQuestionNumbers(form.sections),
  remarks: form.remarks,
});
