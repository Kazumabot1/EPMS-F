import api from '../services/api';
import { extractApiErrorMessage } from '../services/apiError';
import type {
  ApiEnvelope,
  EvaluatorConfigInput,
  FeedbackCampaign,
  FeedbackCampaignRound,
  FeedbackCampaignStatus,
  FeedbackReminderResponse,
} from '../types/feedbackCampaign';

const BASE = '/v1/feedback';

const unwrap = <T>(res: { data: ApiEnvelope<T> }): T => res.data.data;

export type FeedbackFormStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED';

export interface FormOptionItem {
  id: number;
  formName: string;
  anonymousAllowed: boolean;
  versionNumber: number;
  status: FeedbackFormStatus | string;
  rootFormId?: number | null;
  createdAt?: string | null;
  createdByUserId?: number | null;
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
  scales?: number;
  description?: string;
  performanceLevel?: string;
  /** Deprecated: feedback ratings do not decide promotion eligibility. */
  promotionEligibility?: string | null;
  scaleName?: string;
  minScore?: number;
  maxScore?: number;
}

type ApiFeedbackCampaign = Partial<FeedbackCampaign> & {
  id: number;
  name: string;
  reviewYear?: number;
  reviewRound?: FeedbackCampaignRound | string;
  startDate: string;
  endDate: string;
  startAt?: string;
  endAt?: string;
  description?: string | null;
  instructions?: string | null;
  status: FeedbackCampaignStatus | string;
  createdByUserId?: number;
};

const normalizeCampaign = (campaign: ApiFeedbackCampaign): FeedbackCampaign => ({
  id: campaign.id,
  name: campaign.name,
  reviewYear: campaign.reviewYear ?? Number((campaign.startDate ?? new Date().toISOString()).slice(0, 4)),
  reviewRound: (campaign.reviewRound ?? 'ANNUAL') as FeedbackCampaignRound,
  startDate: campaign.startDate,
  endDate: campaign.endDate,
  startAt: campaign.startAt ?? `${campaign.startDate}T09:00:00`,
  endAt: campaign.endAt ?? `${campaign.endDate}T17:00:00`,
  description: campaign.description ?? null,
  instructions: campaign.instructions ?? null,
  status: campaign.status as FeedbackCampaignStatus,
  formId: campaign.formId ?? 0,
  autoSubmitCompletedDraftsOnClose: Boolean(campaign.autoSubmitCompletedDraftsOnClose),
  earlyCloseRequestStatus: campaign.earlyCloseRequestStatus ?? 'NONE',
  earlyCloseRequestedAt: campaign.earlyCloseRequestedAt ?? null,
  earlyCloseRequestedByUserId: campaign.earlyCloseRequestedByUserId ?? null,
  earlyCloseRequestReason: campaign.earlyCloseRequestReason ?? null,
  earlyCloseReviewedAt: campaign.earlyCloseReviewedAt ?? null,
  earlyCloseReviewedByUserId: campaign.earlyCloseReviewedByUserId ?? null,
  earlyCloseReviewReason: campaign.earlyCloseReviewReason ?? null,
  closedAt: campaign.closedAt ?? null,
  closedByUserId: campaign.closedByUserId ?? null,
  closeReason: campaign.closeReason ?? null,
  closedEarly: Boolean(campaign.closedEarly),
  createdBy: campaign.createdBy ?? campaign.createdByUserId ?? 0,
  createdAt: campaign.createdAt ?? '',
  targetCount: campaign.targetCount ?? campaign.targetEmployeeIds?.length ?? 0,
  assignmentCount: campaign.assignmentCount ?? 0,
  targetEmployeeIds: campaign.targetEmployeeIds ?? [],
});

const normalizeCampaigns = (campaigns: ApiFeedbackCampaign[] | null | undefined): FeedbackCampaign[] =>
    (campaigns ?? []).map(normalizeCampaign);


export interface CreateCampaignPayload {
  name: string;
  reviewYear?: number;
  reviewRound?: FeedbackCampaignRound;
  startAt?: string;
  endAt?: string;
  startDate?: string;
  endDate?: string;
  formId: number;
  description?: string;
  instructions?: string;
  autoSubmitCompletedDraftsOnClose?: boolean;
}

export interface CampaignTargetPayload {
  /** Legacy HR dashboard field kept for backward compatibility. Backend expects employeeIds. */
  targetEmployeeIds?: number[];
  /** Backend field used by /campaigns/{campaignId}/targets. */
  employeeIds?: number[];
  dueAt?: string | null;
  anonymousEnabled?: boolean;
}

export interface AssignmentGenerationResponse {
  campaignId?: number;
  totalTargets?: number;
  totalEvaluatorsGenerated?: number;
  createdAssignments?: number;
  skippedAssignments?: number;
  message?: string;
  assignments?: unknown[];
  preview?: unknown[];
  requests?: unknown[];
  warnings?: string[];
  evaluatorConfig?: EvaluatorConfigInput;
  [key: string]: unknown;
}

export const DEFAULT_EVALUATOR_CONFIG: EvaluatorConfigInput = {
  includeManager: true,
  includeTeamPeers: true,
  includeDepartmentPeers: true,
  includeProjectPeers: false,
  includeCrossTeamPeers: false,
  includeSubordinates: true,
  includeSelf: true,
  peerCount: 3,
};

export const ratingScaleLabel = (scale: RatingScaleOption): string => {
  if (scale.scaleName) return `${scale.scaleName} (${scale.minScore ?? 1}-${scale.maxScore ?? scale.scales ?? 5})`;
  return `${scale.description ?? 'Rating Scale'} (1-${scale.scales ?? scale.maxScore ?? 5})`;
};

const normalizeFormOption = (form: Partial<FormOptionItem> & { id: number }): FormOptionItem => ({
  id: form.id,
  formName: form.formName ?? `Feedback Form #${form.id}`,
  anonymousAllowed: form.anonymousAllowed ?? false,
  versionNumber: form.versionNumber ?? 1,
  status: form.status ?? 'DRAFT',
  rootFormId: form.rootFormId ?? null,
  createdAt: form.createdAt ?? null,
  createdByUserId: form.createdByUserId ?? null,
});

const normalizeFormOptions = (forms: (Partial<FormOptionItem> & { id: number })[] | null | undefined): FormOptionItem[] =>
    (forms ?? []).map(normalizeFormOption);

export const hrFeedbackApi = {
  async getAllForms(): Promise<FormOptionItem[]> {
    try {
      const res = await api.get<ApiEnvelope<FormOptionItem[]>>(`${BASE}/forms`);
      return normalizeFormOptions(unwrap(res));
    } catch (e) {
      throw new Error(extractApiErrorMessage(e, 'Failed to load feedback forms.'));
    }
  },

  async getActiveForms(): Promise<FormOptionItem[]> {
    try {
      const res = await api.get<ApiEnvelope<FormOptionItem[]>>(`${BASE}/forms/active`);
      return normalizeFormOptions(unwrap(res));
    } catch (e) {
      throw new Error(extractApiErrorMessage(e, 'Failed to load active forms.'));
    }
  },

  async getFormDetail(formId: number): Promise<FormDetail> {
    try {
      const res = await api.get<ApiEnvelope<FormDetail>>(`${BASE}/forms/${formId}`);
      const detail = unwrap(res);
      return { ...detail, sections: detail.sections ?? [] };
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

  async createFormVersion(formId: number, payload: CreateFormPayload): Promise<number> {
    try {
      const res = await api.post<ApiEnvelope<number>>(`${BASE}/forms/${formId}/versions`, payload);
      return unwrap(res);
    } catch (e) {
      throw new Error(extractApiErrorMessage(e, 'Failed to create new form version.'));
    }
  },

  async getFormVersions(formId: number): Promise<FormOptionItem[]> {
    try {
      const res = await api.get<ApiEnvelope<FormOptionItem[] | number[]>>(`${BASE}/forms/${formId}/versions`);
      const data = unwrap(res);

      if (Array.isArray(data) && data.length > 0 && typeof data[0] === 'number') {
        const details = await Promise.all((data as number[]).map(id => hrFeedbackApi.getFormDetail(id)));
        return normalizeFormOptions(details);
      }

      return normalizeFormOptions(data as FormOptionItem[]);
    } catch (e) {
      throw new Error(extractApiErrorMessage(e, 'Failed to load form versions.'));
    }
  },

  async changeFormStatus(formId: number, status: 'ACTIVE' | 'ARCHIVED'): Promise<void> {
    try {
      await api.put(`${BASE}/forms/${formId}/status?status=${status}`);
    } catch (e) {
      throw new Error(extractApiErrorMessage(e, 'Failed to change form status.'));
    }
  },

  async getRatingScales(): Promise<RatingScaleOption[]> {
    try {
      const res = await api.get<ApiEnvelope<RatingScaleOption[]>>('/v1/rating-scales');
      return unwrap(res) ?? [];
    } catch {
      return [];
    }
  },

  async getAllCampaigns(): Promise<FeedbackCampaign[]> {
    try {
      const res = await api.get<ApiEnvelope<ApiFeedbackCampaign[]>>(`${BASE}/campaigns`);
      return normalizeCampaigns(unwrap(res));
    } catch (e) {
      throw new Error(extractApiErrorMessage(e, 'Failed to load campaigns.'));
    }
  },

  async getPendingEarlyCloseRequests(): Promise<FeedbackCampaign[]> {
    try {
      const res = await api.get<ApiEnvelope<ApiFeedbackCampaign[]>>(`${BASE}/campaigns/early-close/requests`);
      return normalizeCampaigns(unwrap(res));
    } catch (e) {
      throw new Error(extractApiErrorMessage(e, 'Failed to load early close requests.'));
    }
  },

  async createCampaign(payload: CreateCampaignPayload): Promise<FeedbackCampaign> {
    try {
      const res = await api.post<ApiEnvelope<ApiFeedbackCampaign>>(`${BASE}/campaigns`, payload);
      return normalizeCampaign(unwrap(res));
    } catch (e) {
      throw new Error(extractApiErrorMessage(e, 'Failed to create campaign.'));
    }
  },

  async saveCampaignTargets(campaignId: number, payload: CampaignTargetPayload): Promise<void> {
    try {
      const employeeIds = payload.employeeIds ?? payload.targetEmployeeIds ?? [];
      await api.post(`${BASE}/campaigns/${campaignId}/targets`, { employeeIds });
    } catch (e) {
      throw new Error(extractApiErrorMessage(e, 'Failed to save campaign targets.'));
    }
  },

  async generateAssignments(
      campaignId: number,
      payload: EvaluatorConfigInput = DEFAULT_EVALUATOR_CONFIG,
  ): Promise<AssignmentGenerationResponse> {
    try {
      const res = await api.post<ApiEnvelope<AssignmentGenerationResponse>>(
          `${BASE}/campaigns/${campaignId}/assignments/generate`,
          payload,
      );
      return unwrap(res) ?? {};
    } catch (e) {
      throw new Error(extractApiErrorMessage(e, 'Failed to generate evaluator assignments.'));
    }
  },


  async activateCampaign(campaignId: number): Promise<FeedbackCampaign> {
    try {
      const res = await api.post<ApiEnvelope<ApiFeedbackCampaign>>(`${BASE}/campaigns/${campaignId}/activate`);
      return normalizeCampaign(unwrap(res));
    } catch (e) {
      throw new Error(extractApiErrorMessage(e, 'Failed to activate campaign.'));
    }
  },

  async closeCampaign(campaignId: number): Promise<FeedbackCampaign> {
    try {
      const res = await api.post<ApiEnvelope<ApiFeedbackCampaign>>(`${BASE}/campaigns/${campaignId}/close`);
      return normalizeCampaign(unwrap(res));
    } catch (e) {
      throw new Error(extractApiErrorMessage(e, 'Failed to close campaign.'));
    }
  },

  async requestEarlyClose(campaignId: number, reason: string): Promise<FeedbackCampaign> {
    try {
      const res = await api.post<ApiEnvelope<ApiFeedbackCampaign>>(`${BASE}/campaigns/${campaignId}/early-close/request`, { reason });
      return normalizeCampaign(unwrap(res));
    } catch (e) {
      throw new Error(extractApiErrorMessage(e, 'Failed to request early close.'));
    }
  },

  async approveEarlyClose(campaignId: number, reviewNote?: string): Promise<FeedbackCampaign> {
    try {
      const res = await api.post<ApiEnvelope<ApiFeedbackCampaign>>(`${BASE}/campaigns/${campaignId}/early-close/approve`, { reviewNote });
      return normalizeCampaign(unwrap(res));
    } catch (e) {
      throw new Error(extractApiErrorMessage(e, 'Failed to approve early close.'));
    }
  },

  async rejectEarlyClose(campaignId: number, reviewNote?: string): Promise<FeedbackCampaign> {
    try {
      const res = await api.post<ApiEnvelope<ApiFeedbackCampaign>>(`${BASE}/campaigns/${campaignId}/early-close/reject`, { reviewNote });
      return normalizeCampaign(unwrap(res));
    } catch (e) {
      throw new Error(extractApiErrorMessage(e, 'Failed to reject early close.'));
    }
  },

  async cancelCampaign(campaignId: number): Promise<FeedbackCampaign> {
    try {
      const res = await api.post<ApiEnvelope<ApiFeedbackCampaign>>(`${BASE}/campaigns/${campaignId}/cancel`);
      return normalizeCampaign(unwrap(res));
    } catch (e) {
      throw new Error(extractApiErrorMessage(e, 'Failed to cancel campaign.'));
    }
  },

  async sendPendingReminders(campaignId: number): Promise<FeedbackReminderResponse> {
    try {
      const res = await api.post<ApiEnvelope<FeedbackReminderResponse>>(`${BASE}/campaigns/${campaignId}/reminders`);
      return unwrap(res);
    } catch (e) {
      throw new Error(extractApiErrorMessage(e, 'Failed to send pending evaluator reminders.'));
    }
  },

  async getCompletionDashboard(campaignId: number) {
    try {
      const res = await api.get<ApiEnvelope<import('../types/feedback').FeedbackCompletionDashboard>>(`${BASE}/campaigns/${campaignId}/completion`);
      return unwrap(res);
    } catch (e) {
      throw new Error(extractApiErrorMessage(e, 'Failed to load completion dashboard.'));
    }
  },

  async getConsolidatedReport(campaignId: number) {
    try {
      const res = await api.get<ApiEnvelope<import('../types/feedback').ConsolidatedFeedbackReport>>(`${BASE}/campaigns/${campaignId}/consolidated`);
      return unwrap(res);
    } catch (e) {
      throw new Error(extractApiErrorMessage(e, 'Failed to load consolidated report.'));
    }
  },
};
