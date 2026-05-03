export type ApiEnvelope<T> = {
  success: boolean;
  message: string;
  data: T;
  timestamp: string;
};

export interface FeedbackResultItem {
  campaignId: number;
  campaignName: string;
  targetEmployeeId: number;
  targetEmployeeName: string;
  averageScore: number;
  scoreCategory?: string;
  totalResponses: number;
  managerResponses: number;
  peerResponses: number;
  subordinateResponses: number;
  summarizedAt: string;
}

export interface FeedbackCampaignSummary {
  campaignId: number;
  campaignName: string;
  status: string;
  overallAverageScore: number;
  overallScoreCategory?: string;
  totalEmployees: number;
  totalResponses: number;
  summarizedAt: string;
  items: FeedbackResultItem[];
}

export interface FeedbackMyResult {
  employeeId: number;
  employeeName: string;
  results: FeedbackResultItem[];
}

export interface FeedbackTeamSummary {
  managerUserId: number;
  totalDirectReports: number;
  totalClosedResults: number;
  items: FeedbackResultItem[];
}
