import api from './api';

export type AssessmentTargetRole =
  | 'Employee'
  | 'Manager'
  | 'DepartmentHead'
  | 'ProjectManager';

export type AssessmentResponseType = 'RATING' | 'TEXT' | 'YES_NO';

export type AssessmentQuestionPayload = {
  id?: number;
  questionText: string;
  responseType: AssessmentResponseType;
  isRequired: boolean;
  weight: number;
};

export type AssessmentSectionPayload = {
  id?: number;
  title: string;
  orderNo: number;
  questions: AssessmentQuestionPayload[];
};

export type AssessmentFormPayload = {
  formName: string;
  description?: string;
  targetRoles: AssessmentTargetRole[];
  sections: AssessmentSectionPayload[];
};

export type AssessmentFormResponse = {
  id: number;
  formName: string;
  description?: string;
  isActive: boolean;
  targetRoles: AssessmentTargetRole[];
  createdAt?: string;
  updatedAt?: string;
  sections: AssessmentSectionPayload[];
};

const unwrap = <T,>(payload: any, fallback: T): T => {
  return payload?.data?.data ?? payload?.data ?? fallback;
};

export const assessmentFormService = {
  async getAll(): Promise<AssessmentFormResponse[]> {
    const res = await api.get('/appraisal-forms');
    return unwrap<AssessmentFormResponse[]>(res, []);
  },

  async getById(id: number): Promise<AssessmentFormResponse> {
    const res = await api.get(`/appraisal-forms/${id}`);
    return unwrap<AssessmentFormResponse>(res, {} as AssessmentFormResponse);
  },

  async create(payload: AssessmentFormPayload): Promise<AssessmentFormResponse> {
    const res = await api.post('/appraisal-forms', payload);
    return unwrap<AssessmentFormResponse>(res, {} as AssessmentFormResponse);
  },

  async update(id: number, payload: AssessmentFormPayload): Promise<AssessmentFormResponse> {
    const res = await api.put(`/appraisal-forms/${id}`, payload);
    return unwrap<AssessmentFormResponse>(res, {} as AssessmentFormResponse);
  },

  async deactivate(id: number): Promise<void> {
    await api.delete(`/appraisal-forms/${id}`);
  },
};