export type RatingValue = 1 | 2 | 3 | 4 | 5;

export interface AppraisalQuestion {
  id: string;
  itemNo: number;
  text: string;
  rating: RatingValue | null;
}

export interface AppraisalSection {
  id: string;
  title: string;
  questions: AppraisalQuestion[];
}

export interface AppraisalMeta {
  employeeName: string;
  employeeId: string;
  currentPosition: string;
  department: string;
  assessmentDate: string;
  effectiveDate: string;
}

export interface AppraisalRemarks {
  otherRemarks: string;
  appraiserComment: string;
  appraiseeSignature: string;
  appraiseeSignedDate: string;
  appraiserSignature: string;
  appraiserSignedDate: string;
  reviewedBy: string;
  hrSignature: string;
  hrSignedDate: string;
  hrDesignation: string;
}

export interface AppraisalForm {
  id: string;
  meta: AppraisalMeta;
  sections: AppraisalSection[];
  remarks: AppraisalRemarks;
  createdAt?: string;
  updatedAt?: string;
}

export type AppraisalFormPayload = Omit<AppraisalForm, 'id' | 'createdAt' | 'updatedAt'>;

export interface AppraisalListItem {
  id: string;
  employeeName: string;
  employeeId: string;
  department: string;
  assessmentDate: string;
  score: number;
  performanceLabel: string;
  updatedAt?: string;
}

export interface ScoreSummaryData {
  totalPoints: number;
  answeredQuestions: number;
  scorePercent: number;
  performanceLabel: string;
}

export interface PerformanceBand {
  min: number;
  max: number;
  label: string;
}

export const DEFAULT_SECTION_TITLES = [
  'Job Knowledge / Technical Skills',
  'Accountability',
  'Problem Solving & Supervision',
  'Innovative',
  'Team Work',
  'Quality Work',
  'Loyalty',
  'Attendance / Rule and Regulations / Compliance',
] as const;

export const PERFORMANCE_BANDS: PerformanceBand[] = [
  { min: 86, max: 100, label: 'Outstanding' },
  { min: 71, max: 85, label: 'Good' },
  { min: 60, max: 70, label: 'Meet Requirement' },
  { min: 40, max: 59, label: 'Need Improvement' },
  { min: 0, max: 39, label: 'Unsatisfactory' },
];
