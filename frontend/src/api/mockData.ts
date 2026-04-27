import type { AppraisalForm, AppraisalListItem, RatingValue } from '../types/appraisal';
import { DEFAULT_SECTION_TITLES } from '../types/appraisal';

const randomId = () => `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;

const buildDefaultSections = () =>
  DEFAULT_SECTION_TITLES.map((title) => ({
    id: randomId(),
    title,
    questions: [
      { id: randomId(), itemNo: 1, text: '', rating: null as RatingValue | null },
      { id: randomId(), itemNo: 2, text: '', rating: null as RatingValue | null },
      { id: randomId(), itemNo: 3, text: '', rating: null as RatingValue | null },
    ],
  }));

export const MOCK_FORMS: AppraisalForm[] = [
  {
    id: 'mock-001',
    meta: {
      employeeName: 'John Doe',
      employeeId: 'EMP-2024-001',
      currentPosition: 'Software Engineer',
      department: 'Engineering',
      assessmentDate: '2026-04-01',
      effectiveDate: '2026-04-15',
    },
    sections: [
      {
        id: randomId(),
        title: 'Job Knowledge / Technical Skills',
        questions: [
          { id: randomId(), itemNo: 1, text: 'Proficiency in core technical skills', rating: 4 as RatingValue },
          { id: randomId(), itemNo: 2, text: 'Knowledge of tools and frameworks', rating: 5 as RatingValue },
          { id: randomId(), itemNo: 3, text: 'Application of best practices', rating: 4 as RatingValue },
        ],
      },
      {
        id: randomId(),
        title: 'Accountability',
        questions: [
          { id: randomId(), itemNo: 1, text: 'Takes ownership of tasks', rating: 5 as RatingValue },
          { id: randomId(), itemNo: 2, text: 'Meets deadlines consistently', rating: 4 as RatingValue },
        ],
      },
      {
        id: randomId(),
        title: 'Problem Solving & Supervision',
        questions: [
          { id: randomId(), itemNo: 1, text: 'Analytical thinking ability', rating: 4 as RatingValue },
        ],
      },
      {
        id: randomId(),
        title: 'Innovative',
        questions: [
          { id: randomId(), itemNo: 1, text: 'Suggests improvements', rating: 3 as RatingValue },
        ],
      },
      {
        id: randomId(),
        title: 'Team Work',
        questions: [
          { id: randomId(), itemNo: 1, text: 'Collaboration with peers', rating: 5 as RatingValue },
          { id: randomId(), itemNo: 2, text: 'Communication effectiveness', rating: 4 as RatingValue },
        ],
      },
      {
        id: randomId(),
        title: 'Quality Work',
        questions: [
          { id: randomId(), itemNo: 1, text: 'Attention to detail', rating: 4 as RatingValue },
        ],
      },
      {
        id: randomId(),
        title: 'Loyalty',
        questions: [
          { id: randomId(), itemNo: 1, text: 'Commitment to organization', rating: 5 as RatingValue },
        ],
      },
      {
        id: randomId(),
        title: 'Attendance / Rule and Regulations / Compliance',
        questions: [
          { id: randomId(), itemNo: 1, text: 'Punctuality and attendance record', rating: 4 as RatingValue },
          { id: randomId(), itemNo: 2, text: 'Adherence to company policies', rating: 5 as RatingValue },
        ],
      },
    ],
    remarks: {
      otherRemarks: 'Consistently demonstrates high performance.',
      appraiserComment: 'Strong contributor to the team.',
      appraiseeSignature: 'John Doe',
      appraiseeSignedDate: '2026-04-10',
      appraiserSignature: 'Jane Manager',
      appraiserSignedDate: '2026-04-12',
      reviewedBy: 'Director',
      hrSignature: 'HR Lead',
      hrSignedDate: '2026-04-14',
      hrDesignation: 'HR Manager',
    },
    createdAt: '2026-04-01T10:00:00Z',
    updatedAt: '2026-04-01T10:00:00Z',
  },
  {
    id: 'mock-002',
    meta: {
      employeeName: 'Alice Smith',
      employeeId: 'EMP-2024-002',
      currentPosition: 'Product Designer',
      department: 'Design',
      assessmentDate: '2026-03-15',
      effectiveDate: '2026-03-20',
    },
    sections: buildDefaultSections(),
    remarks: {
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
    },
    createdAt: '2026-03-15T09:00:00Z',
    updatedAt: '2026-03-15T09:00:00Z',
  },
  {
    id: 'mock-003',
    meta: {
      employeeName: 'Bob Johnson',
      employeeId: 'EMP-2024-003',
      currentPosition: 'QA Engineer',
      department: 'Quality Assurance',
      assessmentDate: '2026-02-20',
      effectiveDate: '2026-02-25',
    },
    sections: buildDefaultSections(),
    remarks: {
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
    },
    createdAt: '2026-02-20T08:00:00Z',
    updatedAt: '2026-02-20T08:00:00Z',
  },
];

const PERF_BANDS = [
  { min: 86, max: 100, label: 'Outstanding' },
  { min: 71, max: 85, label: 'Good' },
  { min: 60, max: 70, label: 'Meet Requirement' },
  { min: 40, max: 59, label: 'Need Improvement' },
  { min: 0, max: 39, label: 'Unsatisfactory' },
];

export const toMockListItem = (form: AppraisalForm): AppraisalListItem => {
  const ratings = form.sections.flatMap((s) =>
    s.questions.map((q) => q.rating).filter((r) => r !== null) as number[],
  );
  const totalPoints = ratings.reduce((sum, v) => sum + v, 0);
  const answered = ratings.length;
  const scorePercent = answered === 0 ? 0 : Number(((totalPoints * 100) / (answered * 5)).toFixed(2));
  const performanceLabel =
    PERF_BANDS.find((b) => scorePercent >= b.min && scorePercent <= b.max)?.label ?? 'Unsatisfactory';

  return {
    id: form.id,
    employeeName: form.meta.employeeName,
    employeeId: form.meta.employeeId,
    department: form.meta.department,
    assessmentDate: form.meta.assessmentDate,
    score: scorePercent,
    performanceLabel,
    updatedAt: form.updatedAt,
  };
};

export const MOCK_LIST: AppraisalListItem[] = MOCK_FORMS.map(toMockListItem);