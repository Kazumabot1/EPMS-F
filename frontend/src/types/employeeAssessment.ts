export type AssessmentStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
export type AssessmentResponseType = 'RATING' | 'TEXT' | 'YES_NO' | 'YES_NO_RATING';

export interface AssessmentScoreBand {
  id?: number | null;
  minScore: number;
  maxScore: number;
  label: string;
  description?: string | null;
  sortOrder?: number | null;
}

export interface AssessmentItem {
  id?: number | null;
  questionId?: number | null;
  sectionTitle: string;
  questionText: string;
  itemOrder: number;
  responseType?: AssessmentResponseType;
  isRequired?: boolean;
  weight?: number;
  rating: number | null;
  maxRating: number;
  comment: string;
  yesNoAnswer?: boolean | null;
}

export interface AssessmentSection {
  id?: number | null;
  title: string;
  orderNo?: number;
  items: AssessmentItem[];
}

export interface EmployeeAssessment {
  id: number | null;
  formId?: number | null;
  assessmentFormId?: number | null;
  formName?: string;
  companyName?: string | null;
  userId: number;
  employeeId?: number | null;
  employeeName: string;
  employeeCode?: string | null;
  currentPosition?: string | null;
  departmentId?: number | null;
  departmentName?: string | null;
  assessmentDate?: string | null;
  managerName?: string | null;
  period: string;
  status: AssessmentStatus;
  totalScore: number;
  maxScore: number;
  scorePercent: number;
  performanceLabel: string;
  remarks: string;
  managerComment?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  submittedAt?: string | null;
  sections: AssessmentSection[];
  scoreBands?: AssessmentScoreBand[];
}

export interface AssessmentItemRequest {
  id?: number | null;
  questionId?: number | null;
  sectionTitle: string;
  questionText: string;
  itemOrder: number;
  responseType?: AssessmentResponseType;
  rating?: number | null;
  comment?: string;
  yesNoAnswer?: boolean | null;
}

export interface AssessmentRequest {
  formId?: number | null;
  assessmentFormId?: number | null;
  period: string;
  remarks: string;
  items: AssessmentItemRequest[];
}

export interface AssessmentScoreRow {
  id: number;
  formId?: number | null;
  assessmentFormId?: number | null;
  formName?: string | null;
  employeeId?: number | null;
  employeeName: string;
  employeeCode?: string | null;
  departmentName?: string | null;
  period: string;
  status: AssessmentStatus;
  totalScore: number;
  maxScore: number;
  scorePercent: number;
  performanceLabel: string;
  submittedAt?: string | null;
}