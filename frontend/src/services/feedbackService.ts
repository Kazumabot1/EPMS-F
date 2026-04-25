import api from './api';
import { extractApiErrorMessage } from './apiError';
import type {
  AuditLogEntry,
  ApiEnvelope,
  ConsolidatedFeedbackReport,
  FeedbackCampaign,
  FeedbackCampaignPayload,
  FeedbackCompletionDashboard,
  FeedbackDashboard,
  FeedbackFormPayload,
  FeedbackReceivedItem,
  FeedbackRequestCreatePayload,
  FeedbackRequestListItem,
  FeedbackResponseSubmitPayload,
  FeedbackSubmissionStatus,
  FeedbackSummary,
  PendingEvaluator,
  SpringPage,
} from '../types/feedback';

const FEEDBACK_BASE = '/api/v1/feedback';

export const feedbackService = {
  async createCampaign(payload: FeedbackCampaignPayload): Promise<FeedbackCampaign> {
    try {
      const response = await api.post<ApiEnvelope<FeedbackCampaign>>(`${FEEDBACK_BASE}/campaigns`, payload);
      return response.data.data;
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, 'Failed to create feedback campaign.'));
    }
  },

  async updateCampaign(campaignId: number, payload: FeedbackCampaignPayload): Promise<FeedbackCampaign> {
    try {
      const response = await api.put<ApiEnvelope<FeedbackCampaign>>(`${FEEDBACK_BASE}/campaigns/${campaignId}`, payload);
      return response.data.data;
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, 'Failed to update feedback campaign.'));
    }
  },

  async getCampaigns(): Promise<FeedbackCampaign[]> {
    try {
      const response = await api.get<ApiEnvelope<FeedbackCampaign[]>>(`${FEEDBACK_BASE}/campaigns`);
      return response.data.data;
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, 'Failed to fetch feedback campaigns.'));
    }
  },

  async createRequest(payload: FeedbackRequestCreatePayload): Promise<number> {
    try {
      const response = await api.post<ApiEnvelope<number>>(`${FEEDBACK_BASE}/requests`, payload);
      return response.data.data;
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, 'Failed to create feedback request.'));
    }
  },

  async updateDeadline(requestId: number, dueAt: string): Promise<number> {
    try {
      const response = await api.patch<ApiEnvelope<number>>(`${FEEDBACK_BASE}/requests/${requestId}/deadline`, { dueAt });
      return response.data.data;
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, 'Failed to update deadline.'));
    }
  },

  async sendReminders(requestId: number): Promise<number> {
    try {
      const response = await api.post<ApiEnvelope<number>>(`${FEEDBACK_BASE}/requests/${requestId}/reminders`);
      return response.data.data;
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, 'Failed to send reminders.'));
    }
  },

  async getRequestsForEmployee(employeeId: number): Promise<SpringPage<FeedbackRequestListItem>> {
    try {
      const response = await api.get<ApiEnvelope<SpringPage<FeedbackRequestListItem>>>(`${FEEDBACK_BASE}/requests/${employeeId}`);
      return response.data.data;
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, 'Failed to fetch employee feedback requests.'));
    }
  },

  async saveDraft(payload: FeedbackResponseSubmitPayload): Promise<number> {
    try {
      const response = await api.patch<ApiEnvelope<number>>(`${FEEDBACK_BASE}/responses/draft`, payload);
      return response.data.data;
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, 'Failed to save feedback draft.'));
    }
  },

  async submitResponse(payload: FeedbackResponseSubmitPayload): Promise<number> {
    try {
      const response = await api.post<ApiEnvelope<number>>(`${FEEDBACK_BASE}/responses`, payload);
      return response.data.data;
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, 'Failed to submit feedback.'));
    }
  },

  async getMyStatuses(): Promise<FeedbackSubmissionStatus[]> {
    try {
      const response = await api.get<ApiEnvelope<FeedbackSubmissionStatus[]>>(`${FEEDBACK_BASE}/responses/my-status`);
      return response.data.data;
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, 'Failed to fetch submission statuses.'));
    }
  },

  async getReceivedFeedback(targetEmployeeId: number): Promise<FeedbackReceivedItem[]> {
    try {
      const response = await api.get<ApiEnvelope<FeedbackReceivedItem[]>>(`${FEEDBACK_BASE}/responses/received/${targetEmployeeId}`);
      return response.data.data;
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, 'Failed to fetch received feedback.'));
    }
  },

  async getSummary(requestId: number): Promise<FeedbackSummary> {
    try {
      const response = await api.get<ApiEnvelope<FeedbackSummary>>(`${FEEDBACK_BASE}/requests/${requestId}/summary`);
      return response.data.data;
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, 'Failed to fetch feedback summary.'));
    }
  },

  async getPendingEvaluators(requestId: number): Promise<PendingEvaluator[]> {
    try {
      const response = await api.get<ApiEnvelope<PendingEvaluator[]>>(`${FEEDBACK_BASE}/requests/${requestId}/pending`);
      return response.data.data;
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, 'Failed to fetch pending evaluators.'));
    }
  },

  async getCompletionDashboard(campaignId: number): Promise<FeedbackCompletionDashboard> {
    try {
      const response = await api.get<ApiEnvelope<FeedbackCompletionDashboard>>(`${FEEDBACK_BASE}/campaigns/${campaignId}/completion`);
      return response.data.data;
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, 'Failed to fetch completion dashboard.'));
    }
  },

  async getConsolidatedReport(campaignId: number): Promise<ConsolidatedFeedbackReport> {
    try {
      const response = await api.get<ApiEnvelope<ConsolidatedFeedbackReport>>(`${FEEDBACK_BASE}/campaigns/${campaignId}/consolidated`);
      return response.data.data;
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, 'Failed to fetch consolidated report.'));
    }
  },

  async getEmployeeDashboard(): Promise<FeedbackDashboard> {
    try {
      const response = await api.get<ApiEnvelope<FeedbackDashboard>>(`${FEEDBACK_BASE}/dashboard/employee`);
      return response.data.data;
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, 'Failed to fetch employee dashboard.'));
    }
  },

  async getManagerDashboard(): Promise<FeedbackDashboard> {
    try {
      const response = await api.get<ApiEnvelope<FeedbackDashboard>>(`${FEEDBACK_BASE}/dashboard/manager`);
      return response.data.data;
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, 'Failed to fetch manager dashboard.'));
    }
  },

  async getHrDashboard(): Promise<FeedbackDashboard> {
    try {
      const response = await api.get<ApiEnvelope<FeedbackDashboard>>(`${FEEDBACK_BASE}/dashboard/hr`);
      return response.data.data;
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, 'Failed to fetch HR dashboard.'));
    }
  },

  async createForm(payload: FeedbackFormPayload): Promise<number> {
    try {
      const response = await api.post<ApiEnvelope<number>>(`${FEEDBACK_BASE}/forms`, payload);
      return response.data.data;
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, 'Failed to create feedback form.'));
    }
  },

  async updateForm(formId: number, payload: FeedbackFormPayload): Promise<number> {
    try {
      const response = await api.put<ApiEnvelope<number>>(`${FEEDBACK_BASE}/forms/${formId}`, payload);
      return response.data.data;
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, 'Failed to update feedback form.'));
    }
  },

  async createFormVersion(formId: number, payload: FeedbackFormPayload): Promise<number> {
    try {
      const response = await api.post<ApiEnvelope<number>>(`${FEEDBACK_BASE}/forms/${formId}/versions`, payload);
      return response.data.data;
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, 'Failed to create form version.'));
    }
  },

  async getFormVersions(formId: number): Promise<number[]> {
    try {
      const response = await api.get<ApiEnvelope<number[]>>(`${FEEDBACK_BASE}/forms/${formId}/versions`);
      return response.data.data;
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, 'Failed to fetch form versions.'));
    }
  },

  async getAuditLogs(entityType?: string, entityId?: number): Promise<AuditLogEntry[]> {
    try {
      const response = await api.get<ApiEnvelope<AuditLogEntry[]>>(`${FEEDBACK_BASE}/audit-logs`, {
        params: {
          ...(entityType ? { entityType } : {}),
          ...(typeof entityId === 'number' ? { entityId } : {}),
        },
      });
      return response.data.data;
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, 'Failed to fetch audit logs.'));
    }
  },
};
