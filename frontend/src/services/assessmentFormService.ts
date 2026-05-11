import api from './api';

export type AssessmentTargetRole = 'Employee' | 'Manager' | 'DepartmentHead';

export type AssessmentResponseType = 'RATING' | 'TEXT' | 'YES_NO' | 'YES_NO_RATING';

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

export type AssessmentScoreBandPayload = {
  id?: number;
  minScore: number;
  maxScore: number;
  label: string;
  description?: string;
  sortOrder: number;
};

export type AssessmentFormPayload = {
  formName: string;
  companyName?: string;
  description?: string;
  startDate: string;
  endDate: string;
  targetRoles: AssessmentTargetRole[];
  sections: AssessmentSectionPayload[];
  scoreBands: AssessmentScoreBandPayload[];
};

export type AssessmentFormResponse = {
  id: number;
  formName: string;
  companyName?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  isActive: boolean;
  targetRoles: AssessmentTargetRole[];
  createdAt?: string;
  updatedAt?: string;
  sections: AssessmentSectionPayload[];
  scoreBands: AssessmentScoreBandPayload[];
};

const unwrap = <T,>(payload: any, fallback: T): T => {
  return payload?.data?.data ?? payload?.data ?? fallback;
};

const normalizeScoreBands = (bands: any[]): AssessmentScoreBandPayload[] => {
  const fallback: AssessmentScoreBandPayload[] = [
    {
      minScore: 86,
      maxScore: 100,
      label: 'Outstanding',
      description:
        'Performance exceptional and far exceeds expectations. Consistently demonstrates excellent standards in all job requirements.',
      sortOrder: 1,
    },
    {
      minScore: 71,
      maxScore: 85,
      label: 'Good',
      description: 'Performance is consistent. Clearly meets essential requirements of job.',
      sortOrder: 2,
    },
    {
      minScore: 60,
      maxScore: 70,
      label: 'Meet Requirement',
      description: 'Performance is satisfactory. Meets requirements of the job.',
      sortOrder: 3,
    },
    {
      minScore: 40,
      maxScore: 59,
      label: 'Need Improvement',
      description:
        'Performance is inconsistent. Meets requirements of the job occasionally. Supervision and training is required for most problem areas.',
      sortOrder: 4,
    },
    {
      minScore: 0,
      maxScore: 39,
      label: 'Unsatisfactory',
      description: 'Performance does not meet the minimum requirement of the job.',
      sortOrder: 5,
    },
  ];

  if (!Array.isArray(bands) || bands.length === 0) return fallback;

  return bands.map((band, index) => ({
    id: band.id,
    minScore: Number(band.minScore ?? 0),
    maxScore: Number(band.maxScore ?? 100),
    label: band.label ?? '',
    description: band.description ?? '',
    sortOrder: Number(band.sortOrder ?? index + 1),
  }));
};

const normalizeForm = (item: any): AssessmentFormResponse => ({
  id: Number(item.id ?? 0),
  formName: item.formName ?? 'Employee Self-assessment Form',
  companyName: item.companyName ?? 'ACE Data Systems Ltd.',
  description: item.description ?? '',
  startDate: item.startDate,
  endDate: item.endDate,
  isActive: item.isActive ?? item.active ?? true,
  targetRoles: Array.isArray(item.targetRoles) ? item.targetRoles : ['Employee'],
  createdAt: item.createdAt,
  updatedAt: item.updatedAt,
  sections: Array.isArray(item.sections) ? item.sections : [],
  scoreBands: normalizeScoreBands(item.scoreBands),
});

export const assessmentFormService = {
  async getAll(): Promise<AssessmentFormResponse[]> {
    const res = await api.get('/appraisal-forms');
    const data = unwrap<any[]>(res, []);
    return Array.isArray(data) ? data.map(normalizeForm) : [];
  },

  async getById(id: number): Promise<AssessmentFormResponse> {
    const res = await api.get(`/appraisal-forms/${id}`);
    return normalizeForm(unwrap<any>(res, {}));
  },

  async create(payload: AssessmentFormPayload): Promise<AssessmentFormResponse> {
    const res = await api.post('/appraisal-forms', payload);
    return normalizeForm(unwrap<any>(res, {}));
  },

  async update(id: number, payload: AssessmentFormPayload): Promise<AssessmentFormResponse> {
    const res = await api.put(`/appraisal-forms/${id}`, payload);
    return normalizeForm(unwrap<any>(res, {}));
  },

  async deactivate(id: number): Promise<void> {
    await api.delete(`/appraisal-forms/${id}`);
  },
};