export type AppraisalCycleType = 'ANNUAL' | 'SEMI_ANNUAL';
export type AppraisalTemplateStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
export type AppraisalCycleStatus = 'DRAFT' | 'ACTIVE' | 'LOCKED' | 'COMPLETED';
export type EmployeeAppraisalStatus =
  | 'PM_DRAFT'
  | 'DEPT_HEAD_PENDING'
  | 'HR_PENDING'
  | 'COMPLETED'
  | 'REJECTED'
  | 'RETURNED';
export type AppraisalReviewStage = 'PM' | 'DEPT_HEAD' | 'HR';
export type AppraisalDecision = 'APPROVED' | 'REJECTED' | 'RETURNED';

export interface AppraisalCriterionRequest {
  id?: number;
  criteriaText: string;
  description?: string;
  sortOrder: number;
  maxRating: number;
  ratingRequired: boolean;
  active: boolean;
}

export interface AppraisalSectionRequest {
  id?: number;
  sectionName: string;
  description?: string;
  sortOrder: number;
  active: boolean;
  criteria: AppraisalCriterionRequest[];
}

export interface AppraisalTemplateRequest {
  templateName: string;
  description?: string;
  formType: AppraisalCycleType;
  targetAllDepartments: boolean;
  departmentIds: number[];
  sections: AppraisalSectionRequest[];
}

export interface AppraisalCriterionResponse extends AppraisalCriterionRequest {
  id: number;
  ratingValue?: number | null;
  ratingComment?: string | null;
}

export interface AppraisalSectionResponse extends AppraisalSectionRequest {
  id: number;
  criteria: AppraisalCriterionResponse[];
}

export interface AppraisalTemplateResponse {
  id: number;
  templateName: string;
  description?: string | null;
  formType: AppraisalCycleType;
  targetAllDepartments: boolean;
  departmentIds: number[];
  departmentNames: string[];
  status: AppraisalTemplateStatus;
  versionNo: number;
  createdAt?: string;
  updatedAt?: string;
  sections: AppraisalSectionResponse[];
}

export interface AppraisalCycleRequest {
  cycleName: string;
  description?: string | null;
  templateId: number;
  cycleType: AppraisalCycleType;
  cycleYear: number;
  periodNo?: number | null;
  startDate?: string | null;
  submissionDeadline: string;
  departmentIds: number[];
}

export interface AppraisalTemplateCycleRequest {
  template: AppraisalTemplateRequest;
  cycle: AppraisalCycleRequest;
}

export interface AppraisalCycleResponse {
  id: number;
  cycleName: string;
  description?: string | null;
  templateId: number;
  templateName: string;
  cycleType: AppraisalCycleType;
  cycleYear: number;
  periodNo?: number | null;
  startDate: string;
  endDate: string;
  submissionDeadline: string;
  status: AppraisalCycleStatus;
  locked: boolean;
  departmentIds: number[];
  departmentNames: string[];
  activatedAt?: string | null;
  completedAt?: string | null;
}

export interface AppraisalRatingInput {
  criteriaId: number;
  ratingValue: number;
  comment?: string;
}

export interface PmAppraisalSubmitRequest {
  ratings: AppraisalRatingInput[];
  recommendation: string;
  comment: string;
}

export interface AppraisalReviewSubmitRequest {
  recommendation: string;
  comment: string;
}

export interface AppraisalReturnRequest {
  note: string;
}

export interface AppraisalReviewResponse {
  id: number;
  reviewStage: AppraisalReviewStage;
  reviewerUserId?: number | null;
  reviewerName?: string | null;
  recommendation?: string | null;
  comment?: string | null;
  decision?: AppraisalDecision | null;
  submittedAt?: string | null;
}

export interface EmployeeAppraisalFormResponse {
  id: number;
  cycleId: number;
  cycleName: string;
  employeeId: number;
  employeeName: string;
  employeeCode?: string | null;
  departmentId: number;
  departmentName: string;
  positionName?: string | null;
  assessmentDate?: string | null;
  effectiveDate?: string | null;
  status: EmployeeAppraisalStatus;
  totalPoints?: number | null;
  answeredCriteriaCount?: number | null;
  scorePercent?: number | null;
  performanceLabel?: string | null;
  visibleToEmployee: boolean;
  locked: boolean;
  pmSubmittedAt?: string | null;
  deptHeadSubmittedAt?: string | null;
  hrApprovedAt?: string | null;
  sections: AppraisalSectionResponse[];
  reviews: AppraisalReviewResponse[];
}

export interface AppraisalScoreBandRequest {
  id?: number;
  minScore: number;
  maxScore: number;
  label: string;
  description?: string;
  sortOrder: number;
  active: boolean;
}

export interface AppraisalScoreBandResponse extends AppraisalScoreBandRequest {
  id: number;
}