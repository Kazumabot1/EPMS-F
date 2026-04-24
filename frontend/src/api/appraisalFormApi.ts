import type { AxiosResponse } from 'axios';
import { httpClient } from './httpClient';
import type { AppraisalForm, AppraisalFormPayload, AppraisalListItem } from '../types/appraisal';
import { calculateScoreSummary } from '../utils/appraisal';
import { MOCK_FORMS, MOCK_LIST } from './mockData';

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
    try {
      const response = await httpClient.get<unknown>(ENDPOINT);
      const forms = extractArray<AppraisalForm>(response);
      return forms.length ? forms.map(toListItem) : MOCK_LIST;
    } catch {
      return MOCK_LIST;
    }
  },

  async getById(id: string): Promise<AppraisalForm> {
    try {
      const response = await httpClient.get<AppraisalForm>(`${ENDPOINT}/${id}`);
      return response.data;
    } catch {
      const found = MOCK_FORMS.find((f) => f.id === id);
      if (found) return found;
      throw new Error(`Appraisal form with id "${id}" not found.`);
    }
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