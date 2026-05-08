export type ApiEnvelope<T> = {
  success: boolean;
  message: string;
  data: T;
  timestamp: string;
};

export type FeedbackRelationshipType = 'MANAGER' | 'PEER' | 'SUBORDINATE' | 'SELF' | 'PROJECT_STAKEHOLDER';
export type FeedbackAssignmentStatus = 'PENDING' | 'IN_PROGRESS' | 'SUBMITTED' | 'DECLINED' | 'CANCELLED';
export type FeedbackCampaignLifecycleStatus = 'DRAFT' | 'ACTIVE' | 'CLOSED' | 'CANCELLED';

export interface FeedbackEvaluatorTask {
  assignmentId: number;
  campaignId: number;
  campaignName: string;
  campaignStatus: FeedbackCampaignLifecycleStatus;
  campaignStartAt: string | null;
  targetEmployeeId: number;
  targetEmployeeName: string;
  relationshipType: FeedbackRelationshipType;
  anonymous: boolean;
  status: FeedbackAssignmentStatus;
  canSubmit: boolean;
  lifecycleMessage: string | null;
  autoSubmitCompletedDraftsOnClose?: boolean;
  autoSubmitNotice?: string | null;
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
  campaignStatus: FeedbackCampaignLifecycleStatus;
  campaignStartAt: string | null;
  targetEmployeeId: number;
  targetEmployeeName: string;
  relationshipType: FeedbackRelationshipType;
  anonymous: boolean;
  status: FeedbackAssignmentStatus;
  canSubmit: boolean;
  lifecycleMessage: string | null;
  autoSubmitCompletedDraftsOnClose?: boolean;
  autoSubmitNotice?: string | null;
  dueAt: string | null;
  submittedAt: string | null;
  comments: string | null;
  totalQuestionCount: number;
  requiredQuestionCount: number;
  answeredQuestionCount: number;
  answeredRequiredQuestionCount: number;
  completionPercent: number;
  finalSubmissionReady: boolean;
  submittedLocked: boolean;
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

export interface SaveFeedbackDraftPayload {
  evaluatorAssignmentId: number;
  comments?: string;
  responses: Array<{
    questionId: number;
    ratingValue?: number | null;
    comment?: string;
  }>;
}
