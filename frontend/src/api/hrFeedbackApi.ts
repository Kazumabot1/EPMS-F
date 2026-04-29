import api from '../services/api';
import { extractApiErrorMessage } from '../services/apiError';
import type { ApiEnvelope } from '../types/feedbackCampaign';

const BASE = '/v1/feedback';

export interface FormOptionItem {
  id: number;
  formName: string;
  anonymousAllowed: boolean;
  versionNumber: number;
  status: string;
}

export interface FormQuestionDetail {
  id: number | null;
  questionText: string;
  questionOrder: number;
  ratingScaleId: number | null;
  weight: number;
  isRequired: boolean;
}

export interface FormSectionDetail {
  id: number | null;
  title: string;
  orderNo: number;
  questions: FormQuestionDetail[];
}

export interface FormDetail extends FormOptionItem {
  sections: FormSectionDetail[];
}

export interface CreateFormPayload {
  formName: string;
  anonymousAllowed: boolean;
  sections: {
    title: string;
    orderNo: number;
    questions: {
      questionText: string;
      questionOrder: number;
      ratingScaleId: number | null;
      weight: number;
      isRequired: boolean;
    }[];
  }[];
}

export interface RatingScaleOption {
  id: number;
  scales: number;
  description: string;
  performanceLevel?: string;
  promotionEligibility?: string;
}

const unwrap = <T>(res: { data: ApiEnvelope<T> }): T => res.data.data;

export const hrFeedbackApi = {
  /* ── Forms ───────────────────────────────────────── */
  async getAllForms(): Promise<FormOptionItem[]> {
    try {
      const res = await api.get<ApiEnvelope<FormOptionItem[]>>(`${BASE}/forms`);
      return unwrap(res);
    } catch (e) {
      throw new Error(extractApiErrorMessage(e, 'Failed to load feedback forms.'));
    }
  },

  async getActiveForms(): Promise<FormOptionItem[]> {
    try {
      const res = await api.get<ApiEnvelope<FormOptionItem[]>>(`${BASE}/forms/active`);
      return unwrap(res);
    } catch (e) {
      throw new Error(extractApiErrorMessage(e, 'Failed to load active forms.'));
    }
  },

  async getFormDetail(formId: number): Promise<FormDetail> {
    try {
      const res = await api.get<ApiEnvelope<FormDetail>>(`${BASE}/forms/${formId}`);
      return unwrap(res);
    } catch (e) {
      throw new Error(extractApiErrorMessage(e, 'Failed to load form detail.'));
    }
  },

  async createForm(payload: CreateFormPayload): Promise<number> {
    try {
      const res = await api.post<ApiEnvelope<number>>(`${BASE}/forms`, payload);
      return unwrap(res);
    } catch (e) {
      throw new Error(extractApiErrorMessage(e, 'Failed to create feedback form.'));
    }
  },

  async updateForm(formId: number, payload: CreateFormPayload): Promise<number> {
    try {
      const res = await api.put<ApiEnvelope<number>>(`${BASE}/forms/${formId}`, payload);
      return unwrap(res);
    } catch (e) {
      throw new Error(extractApiErrorMessage(e, 'Failed to update feedback form.'));
    }
  },

  async changeFormStatus(formId: number, status: 'ACTIVE' | 'ARCHIVED'): Promise<void> {
    try {
      await api.put(`${BASE}/forms/${formId}/status?status=${status}`);
    } catch (e) {
      throw new Error(extractApiErrorMessage(e, 'Failed to change form status.'));
    }
  },

  /* ── Rating scales ────────────────────────────────── */
  async getRatingScales(): Promise<RatingScaleOption[]> {
    try {
      const res = await api.get<ApiEnvelope<RatingScaleOption[]>>(`/v1/rating-scales`);
      return unwrap(res);
    } catch {
      return [];          // graceful fallback — endpoint may not exist yet
    }
  },

  /* ── Campaigns ────────────────────────────────────── */
  async getAllCampaigns() {
    try {
      const res = await api.get<ApiEnvelope<import('../types/feedbackCampaign').FeedbackCampaign[]>>(`${BASE}/campaigns`);
      return unwrap(res);
    } catch (e) {
      throw new Error(extractApiErrorMessage(e, 'Failed to load campaigns.'));
    }
  },

  async getCompletionDashboard(campaignId: number) {
    try {
      const res = await api.get<ApiEnvelope<import('../types/feedback').FeedbackCompletionDashboard>>(
          `${BASE}/campaigns/${campaignId}/completion`
      );
      return unwrap(res);
    } catch (e) {
      throw new Error(extractApiErrorMessage(e, 'Failed to load completion data.'));
    }
  },

  async getConsolidatedReport(campaignId: number) {
    try {
      const res = await api.get<ApiEnvelope<import('../types/feedback').ConsolidatedFeedbackReport>>(
          `${BASE}/campaigns/${campaignId}/consolidated`
      );
      return unwrap(res);
    } catch (e) {
      throw new Error(extractApiErrorMessage(e, 'Failed to load analytics report.'));
    }
  },
};