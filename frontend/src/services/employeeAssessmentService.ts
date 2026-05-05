import api from './api';
import type {
  AssessmentDraft,
  AssessmentScoreRow,
  AssessmentTemplate,
  SubmitAssessmentPayload,
} from '../types/employeeAssessment';

const unwrap = <T,>(payload: any, fallback: T): T => {
  return payload?.data?.data ?? payload?.data ?? fallback;
};

export const employeeAssessmentService = {
  async template(): Promise<AssessmentTemplate> {
    const res = await api.get('/employee-assessments/template');
    return unwrap<AssessmentTemplate>(res, {} as AssessmentTemplate);
  },

  async draft(): Promise<AssessmentDraft | null> {
    const res = await api.get('/employee-assessments/draft');
    return unwrap<AssessmentDraft | null>(res, null);
  },

  async saveDraft(payload: SubmitAssessmentPayload): Promise<AssessmentDraft> {
    const res = await api.post('/employee-assessments/draft', payload);
    return unwrap<AssessmentDraft>(res, {} as AssessmentDraft);
  },

  async submit(payload: SubmitAssessmentPayload): Promise<AssessmentDraft> {
    const res = await api.post('/employee-assessments/submit', payload);
    return unwrap<AssessmentDraft>(res, {} as AssessmentDraft);
  },

  async myScores(): Promise<AssessmentScoreRow[]> {
    const res = await api.get('/employee-assessments/my-scores');
    return unwrap<AssessmentScoreRow[]>(res, []);
  },
};