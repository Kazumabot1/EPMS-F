export type ApiEnvelope<T> = {
  success: boolean;
  message: string;
  data: T;
  timestamp: string;
};

export type FeedbackCampaignStatus = 'DRAFT' | 'ACTIVE' | 'CLOSED' | 'CANCELLED';
export type FeedbackCampaignRound = 'ANNUAL' | 'FIRST_HALF' | 'SECOND_HALF' | 'SPECIAL';

export interface FeedbackFormOption {
  id: number;
  formName: string;
  anonymousAllowed: boolean;
  versionNumber: number;
  status: string;
}


export interface FeedbackReminderResponse {
  campaignId: number;
  campaignName: string;
  pendingAssignmentCount: number;
  notifiedEvaluatorCount: number;
  skippedAssignmentCount: number;
  warnings: string[];
}

export interface FeedbackCampaign {
  id: number;
  name: string;
  reviewYear: number;
  reviewRound: FeedbackCampaignRound;
  startDate: string;
  endDate: string;
  startAt: string;
  endAt: string;
  description?: string | null;
  instructions?: string | null;
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
  reviewYear?: number;
  reviewRound?: FeedbackCampaignRound;
  startAt: string;
  endAt: string;
  startDate?: string;
  endDate?: string;
  formId: number;
  description?: string;
  instructions?: string;
}

export interface FeedbackCampaignTargetsInput {
  employeeIds: number[];
}

export interface EvaluatorConfigInput {
  includeManager: boolean;
  includeTeamPeers: boolean;
  includeDepartmentPeers: boolean;
  includeProjectPeers: boolean;
  includeCrossTeamPeers: boolean;
  includeSubordinates: boolean;
  includeSelf: boolean;
  peerCount: number;
}

export type FeedbackRelationshipType = 'MANAGER' | 'PEER' | 'SUBORDINATE' | 'SELF' | 'PROJECT_STAKEHOLDER';
export type EvaluatorSelectionMethod = 'AUTO_RANDOM' | 'AUTO_RELATIONSHIP' | 'MANUAL';
export type AssignmentStatus = 'PENDING' | 'IN_PROGRESS' | 'SUBMITTED' | 'DECLINED' | 'CANCELLED';

export interface FeedbackAssignmentPreviewItem {
  requestId: number;
  targetEmployeeId: number;
  targetEmployeeName?: string | null;
  managerAssignments: number;
  selfAssignments: number;
  subordinateAssignments: number;
  peerAssignments: number;
  projectStakeholderAssignments?: number;
  totalAssignments: number;
  autoAssignments: number;
  manualAssignments: number;
  warnings: string[];
}

export interface FeedbackAssignmentDetailItem {
  assignmentId: number;
  requestId: number;
  targetEmployeeId: number;
  targetEmployeeName?: string | null;
  evaluatorEmployeeId: number;
  evaluatorEmployeeName?: string | null;
  relationshipType: FeedbackRelationshipType;
  selectionMethod: EvaluatorSelectionMethod;
  status: AssignmentStatus;
  anonymous: boolean;
}

export interface ManualAssignmentInput {
  targetEmployeeId: number;
  evaluatorEmployeeId: number;
  relationshipType: FeedbackRelationshipType;
  anonymous?: boolean;
}

export interface FeedbackAssignmentGenerationResponse {
  campaignId: number;
  totalTargets: number;
  totalEvaluatorsGenerated: number;
  evaluatorConfig: EvaluatorConfigInput | null;
  requests: FeedbackAssignmentPreviewItem[];
  assignmentDetails: FeedbackAssignmentDetailItem[];
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
