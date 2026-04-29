export type ApiEnvelope<T> = {
  success: boolean;
  message: string;
  data: T;
  timestamp: string;
};

export type FeedbackCampaignStatus = 'DRAFT' | 'ACTIVE' | 'CLOSED';

export interface FeedbackFormOption {
  id: number;
  formName: string;
  anonymousAllowed: boolean;
  versionNumber: number;
  status: string;
}

export interface FeedbackCampaign {
  id: number;
  name: string;
  startDate: string;
  endDate: string;
  status: FeedbackCampaignStatus;
  formId: number;
  createdBy: number;
  createdAt: string;
  targetCount: number;
  assignmentCount: number;
  targetEmployeeIds: number[];
}

export interface CreateFeedbackCampaignInput {
  name: string;
  startDate: string;
  endDate: string;
  formId: number;
}

export interface FeedbackCampaignTargetsInput {
  employeeIds: number[];
}

export interface EvaluatorConfigInput {
  includeManager: boolean;
  includeTeamPeers: boolean;
  includeProjectPeers: boolean;
  includeCrossTeamPeers: boolean;
  peerCount: number;
}

export interface FeedbackAssignmentPreviewItem {
  requestId: number;
  targetEmployeeId: number;
  managerAssignments: number;
  peerAssignments: number;
  totalAssignments: number;
}

export interface FeedbackAssignmentGenerationResponse {
  campaignId: number;
  totalTargets: number;
  totalEvaluatorsGenerated: number;
  evaluatorConfig: EvaluatorConfigInput;
  requests: FeedbackAssignmentPreviewItem[];
  warnings: string[];
}

export interface FeedbackTargetEmployee {
  id: number;
  fullName: string;
  currentDepartmentId: number | null;
  currentDepartment: string | null;
  userId: number | null;
}

export interface FeedbackDepartmentOption {
  id: number;
  name: string;
}

export interface FeedbackTeamOption {
  id: number;
  teamName: string;
  memberEmployeeIds: number[];
}
