export type ApiEnvelope<T> = {
  success: boolean;
  message: string;
  data: T;
  timestamp: string;
};

export interface FeedbackEvaluatorTask {
  assignmentId: number;
  campaignId: number;
  campaignName: string;
  targetEmployeeId: number;
  targetEmployeeName: string;
  relationshipType: 'MANAGER' | 'PEER' | 'SUBORDINATE';
  anonymous: boolean;
  status: 'PENDING' | 'IN_PROGRESS' | 'SUBMITTED' | 'DECLINED';
  dueAt: string | null;
  submittedAt: string | null;
}

export interface FeedbackAssignmentQuestionDetail {
  id: number;
  questionText: string;
  questionOrder: number;
  ratingScaleId: number | null;
  weight: number | null;
  required: boolean;
  existingRatingValue: number | null;
  existingComment: string | null;
}

export interface FeedbackAssignmentSectionDetail {
  id: number;
  title: string;
  orderNo: number;
  questions: FeedbackAssignmentQuestionDetail[];
}

export interface FeedbackAssignmentDetail {
  assignmentId: number;
  campaignId: number;
  campaignName: string;
  targetEmployeeId: number;
  targetEmployeeName: string;
  relationshipType: 'MANAGER' | 'PEER' | 'SUBORDINATE';
  anonymous: boolean;
  status: 'PENDING' | 'IN_PROGRESS' | 'SUBMITTED' | 'DECLINED';
  dueAt: string | null;
  submittedAt: string | null;
  canSubmit: boolean;
  comments: string | null;
  sections: FeedbackAssignmentSectionDetail[];
}

export interface SubmitFeedbackResponsePayload {
  evaluatorAssignmentId: number;
  comments?: string;
  responses: Array<{
    questionId: number;
    ratingValue: number;
    comment?: string;
  }>;
}
