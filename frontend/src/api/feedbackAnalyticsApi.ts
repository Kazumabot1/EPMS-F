import api from '../services/api';
import { extractApiErrorMessage } from '../services/apiError';
import type {
  ApiEnvelope,
  FeedbackCampaignSummary,
  FeedbackMyResult,
  FeedbackTeamSummary,
} from '../types/feedbackAnalytics';

const FEEDBACK_BASE = '/api/v1/feedback';

const unwrap = <T>(response: { data: ApiEnvelope<T> }): T => response.data.data;

export const feedbackAnalyticsApi = {
  async getCampaignSummary(campaignId: number): Promise<FeedbackCampaignSummary> {
    try {
      const response = await api.get<ApiEnvelope<FeedbackCampaignSummary>>(
        `${FEEDBACK_BASE}/campaigns/${campaignId}/summary`,
      );
      return unwrap(response);
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, 'Failed to load feedback campaign summary.'));
    }
  },

  async getMyResult(): Promise<FeedbackMyResult> {
    try {
      const response = await api.get<ApiEnvelope<FeedbackMyResult>>(`${FEEDBACK_BASE}/my-result`);
      return unwrap(response);
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, 'Failed to load your feedback results.'));
    }
  },

  async getTeamSummary(): Promise<FeedbackTeamSummary> {
    try {
      const response = await api.get<ApiEnvelope<FeedbackTeamSummary>>(`${FEEDBACK_BASE}/team-summary`);
      return unwrap(response);
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, 'Failed to load team feedback summary.'));
    }
  },
};
