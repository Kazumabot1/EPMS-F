import type { AxiosResponse } from 'axios';
import { httpClient } from './httpClient';
import type { AppraisalForm, AppraisalFormPayload, AppraisalListItem } from '../types/appraisal';
import { calculateScoreSummary } from '../utils/appraisal';

const ENDPOINT = '/appraisal-forms';

type MaybePagedResponse<T> = {
  data?: T[];
  items?: T[];
  content?: T[];
} & Partial<Record<string, unknown>>;

const extractArray = <T,>(response: AxiosResponse<unknown>): T[] => {
  const value = response.data;
  if (Array.isArray(value)) return value as T[];
  if (value && typeof value === 'object') {
    const candidate = value as MaybePagedResponse<T>;
    return candidate.data ?? candidate.items ?? candidate.content ?? [];
  }
  return [];
};

const toListItem = (form: AppraisalForm): AppraisalListItem => {
  const score = calculateScoreSummary(form.sections);
  return {
    id: form.id,
    employeeName: form.meta.employeeName,
    employeeId: form.meta.employeeId,
    department: form.meta.department,
    assessmentDate: form.meta.assessmentDate,
    score: score.scorePercent,
    performanceLabel: score.performanceLabel,
    updatedAt: form.updatedAt,
  };
};

export const appraisalFormApi = {
  async getAll(): Promise<AppraisalListItem[]> {
    const response = await httpClient.get<unknown>(ENDPOINT);
    const forms = extractArray<AppraisalForm>(response);
    return forms.map(toListItem);
  },

  async getById(id: string): Promise<AppraisalForm> {
    const response = await httpClient.get<AppraisalForm>(`${ENDPOINT}/${id}`);
    return response.data;
  },

  async create(payload: AppraisalFormPayload): Promise<AppraisalForm> {
    const response = await httpClient.post<AppraisalForm>(ENDPOINT, payload);
    return response.data;
  },

  async update(id: string, payload: AppraisalFormPayload): Promise<AppraisalForm> {
    const response = await httpClient.put<AppraisalForm>(`${ENDPOINT}/${id}`, payload);
    return response.data;
  },

  async remove(id: string): Promise<void> {
    await httpClient.delete(`${ENDPOINT}/${id}`);
  },
};