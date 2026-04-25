export interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
  timestamp: string;
}

export type FeedbackCampaignStatus = 'DRAFT' | 'ACTIVE' | 'CLOSED' | 'CANCELLED';
export interface FeedbackResponseItemPayload {
  questionId: number;
  ratingValue: number;
  comment?: string;
}

export interface FeedbackResponseSubmitPayload {
  evaluatorAssignmentId: number;
  responses: FeedbackResponseItemPayload[];
  comments?: string;
}

export type EvaluatorType = 'MANAGER' | 'PEER' | 'SUBORDINATE' | 'SELF';

export interface FeedbackRequestCreatePayload {
  formId: number;
  campaignId: number;
  targetEmployeeId: number;
  dueAt: string;
  anonymousEnabled?: boolean;
  evaluatorTypes: EvaluatorType[];
}

export interface FeedbackCampaignPayload {
  name: string;
  startDate: string;
  endDate: string;
  status: FeedbackCampaignStatus;
}

export interface FeedbackCampaign {
  id: number;
  name: string;
  startDate: string;
  endDate: string;
  status: FeedbackCampaignStatus;
  createdBy: number;
  createdAt: string;
}

export interface FeedbackQuestionDraft {
  questionText: string;
  questionOrder: number;
  ratingScaleId: number;
  weight: number;
  isRequired: boolean;
}

export interface FeedbackSectionDraft {
  title: string;
  orderNo: number;
  questions: FeedbackQuestionDraft[];
}

export interface FeedbackFormPayload {
  formName: string;
  anonymousAllowed: boolean;
  sections: FeedbackSectionDraft[];
}

export interface SpringPage<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

export interface FeedbackRequestListItem {
  id: number;
  formId: number;
  campaignId: number;
  campaignName: string;
  targetEmployeeId: number;
  dueAt: string;
  status: string;
}

export interface FeedbackSubmissionStatus {
  evaluatorAssignmentId: number;
  requestId: number;
  campaignId: number;
  campaignName: string;
  targetEmployeeId: number;
  evaluatorType: string;
  status: string;
  dueAt: string;
}

export interface FeedbackReceivedItem {
  responseId: number;
  requestId: number;
  campaignId: number;
  campaignName: string;
  targetEmployeeId: number;
  overallScore: number | null;
  comments: string | null;
  submittedAt: string;
  sourceType: string;
  anonymous: boolean;
  evaluatorEmployeeId: number | null;
}

export interface FeedbackSummary {
  requestId: number;
  averageScore: number;
  totalResponses: number;
}

export interface PendingEvaluator {
  evaluatorEmployeeId: number;
  requestId: number;
}

export interface FeedbackCompletionItem {
  requestId: number;
  targetEmployeeId: number;
  totalEvaluators: number;
  submittedEvaluators: number;
  pendingEvaluators: number;
  completionPercent: number;
}

export interface FeedbackCompletionDashboard {
  campaignId: number;
  campaignName: string;
  totalRequests: number;
  totalAssignments: number;
  submittedAssignments: number;
  completionPercent: number;
  pendingUsers: number;
  requests: FeedbackCompletionItem[];
}

export interface ConsolidatedFeedbackItem {
  targetEmployeeId: number;
  averageScore: number;
  totalResponses: number;
  managerResponses: number;
  peerResponses: number;
  subordinateResponses: number;
}

export interface ConsolidatedFeedbackReport {
  campaignId: number;
  campaignName: string;
  campaignAverageScore: number;
  totalResponses: number;
  items: ConsolidatedFeedbackItem[];
}

export interface CampaignDashboardItem {
  campaignId: number;
  campaignName: string;
  status: string;
  startDate: string;
  endDate: string;
  totalRequests: number;
  completionPercent: number;
}

export interface TeamFeedbackSummary {
  targetEmployeeId: number;
  averageScore: number;
  totalResponses: number;
  pendingEvaluations: number;
}

export interface FeedbackDashboard {
  dashboardType: string;
  userId: number;
  totalForms: number;
  totalRequests: number;
  totalResponses: number;
  totalPendingAssignments: number;
  averageScore: number;
  pendingFeedbackToSubmit: FeedbackSubmissionStatus[];
  ownFeedbackResults: FeedbackReceivedItem[];
  teamFeedbackSummary: TeamFeedbackSummary[];
  campaigns: CampaignDashboardItem[];
}

export interface AuditLogEntry {
  id: number;
  userId: number;
  action: string;
  entityType: string;
  entityId: number;
  oldValue: string | null;
  newValue: string | null;
  reason: string | null;
  timestamp: string;
}
