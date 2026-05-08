import api from './api';
import type {
  AssessmentRequest,
  AssessmentScoreRow,
  EmployeeAssessment,
} from '../types/employeeAssessment';

const unwrap = <T,>(payload: any, fallback: T): T => {
  return payload?.data?.data ?? payload?.data ?? fallback;
};

const currentPeriod = () => {
  const now = new Date();
  return `Annual ${now.getFullYear()}`;
};

const getFullName = (payload: any) => {
  const firstName = payload?.employee?.firstName ?? payload?.firstName ?? '';
  const lastName = payload?.employee?.lastName ?? payload?.lastName ?? '';
  const fullName = `${firstName} ${lastName}`.trim();

  return (
    payload?.employeeName ??
    payload?.employeeFullName ??
    payload?.name ??
    payload?.fullName ??
    fullName ??
    ''
  );
};

const normalizeAssessment = (payload: any): EmployeeAssessment | null => {
  if (!payload) return null;

  const rawSections = Array.isArray(payload.sections) ? payload.sections : [];

  const formId =
    payload.formId ??
    payload.assessmentFormId ??
    payload.templateId ??
    payload.form?.id ??
    payload.assessmentForm?.id ??
    null;

  const sections = rawSections.map((section: any, sectionIndex: number) => {
    const rawItems = Array.isArray(section.items)
      ? section.items
      : Array.isArray(section.questions)
        ? section.questions
        : [];

    return {
      id: section.id ?? null,
      title: section.title ?? `Section ${sectionIndex + 1}`,
      orderNo: section.orderNo ?? sectionIndex + 1,
      items: rawItems.map((item: any, itemIndex: number) => ({
        id: item.id ?? item.questionId ?? null,
        questionId: item.questionId ?? item.id ?? null,
        sectionTitle:
          item.sectionTitle ?? section.title ?? `Section ${sectionIndex + 1}`,
        questionText: item.questionText ?? item.text ?? item.title ?? '',
        itemOrder: item.itemOrder ?? item.orderNo ?? itemIndex + 1,
        responseType: item.responseType ?? 'RATING',
        isRequired: item.isRequired ?? true,
        weight: Number(item.weight ?? 1),
        rating: item.rating ?? null,
        maxRating: item.maxRating ?? 5,
        comment: item.comment ?? item.answerText ?? item.textAnswer ?? '',
        yesNoAnswer: item.yesNoAnswer ?? item.booleanAnswer ?? null,
      })),
    };
  });

  return {
    id: payload.id ?? null,
    formId,
    assessmentFormId: formId,
    formName:
      payload.formName ??
      payload.name ??
      payload.title ??
      payload.form?.formName ??
      payload.assessmentForm?.formName ??
      'Self Assessment',
    userId: payload.userId ?? payload.employee?.userId ?? 0,
    employeeId: payload.employeeId ?? payload.employee?.id ?? null,
    employeeName: getFullName(payload),
    employeeCode: payload.employeeCode ?? payload.employee?.employeeCode ?? null,
    departmentId: payload.departmentId ?? payload.employee?.departmentId ?? null,
    departmentName:
      payload.departmentName ?? payload.employee?.departmentName ?? null,
    period: payload.period ?? currentPeriod(),
    status: payload.status ?? 'DRAFT',
    totalScore: Number(payload.totalScore ?? 0),
    maxScore: Number(payload.maxScore ?? 0),
    scorePercent: Number(
      payload.scorePercent ?? payload.scorePercentage ?? payload.percentage ?? 0,
    ),
    performanceLabel: payload.performanceLabel ?? 'Not scored',
    remarks: payload.remarks ?? '',
    createdAt: payload.createdAt ?? null,
    updatedAt: payload.updatedAt ?? null,
    submittedAt: payload.submittedAt ?? null,
    sections,
  };
};

const normalizeScoreRow = (row: any): AssessmentScoreRow => ({
  id: Number(row.id ?? row.assessmentId ?? 0),
  employeeId: row.employeeId ?? row.employee?.id ?? null,
  employeeName:
    row.employeeName ??
    row.employeeFullName ??
    row.employee?.employeeName ??
    row.employee?.fullName ??
    getFullName(row) ??
    'Unknown Employee',
  employeeCode: row.employeeCode ?? row.employee?.employeeCode ?? null,
  departmentName:
    row.departmentName ??
    row.employee?.departmentName ??
    row.department?.name ??
    null,
  period: row.period ?? currentPeriod(),
  status: row.status ?? 'DRAFT',
  totalScore: Number(row.totalScore ?? 0),
  maxScore: Number(row.maxScore ?? 0),
  scorePercent: Number(
    row.scorePercent ?? row.scorePercentage ?? row.percentage ?? 0,
  ),
  performanceLabel: row.performanceLabel ?? row.label ?? 'Not scored',
  submittedAt: row.submittedAt ?? row.updatedAt ?? null,
});

const normalizeList = <T,>(payload: any, fallback: T[]): T[] => {
  const data = unwrap<any>(payload, fallback);

  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.content)) return data.content;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.rows)) return data.rows;

  return fallback;
};

const isMissingDraft = (error: any) => {
  const status = error?.response?.status;

  /*
   * Only these mean no draft exists.
   * 403 means permission/role problem and should NOT fall back to template.
   */
  return status === 404 || status === 204;
};

export const employeeAssessmentService = {
  async template(): Promise<EmployeeAssessment | null> {
    const res = await api.get('/employee-assessments/template');
    return normalizeAssessment(unwrap<any>(res, null));
  },

  async draft(): Promise<EmployeeAssessment | null> {
    const res = await api.get('/employee-assessments/my-latest-draft');
    return normalizeAssessment(unwrap<any>(res, null));
  },

  async getLatestDraft(): Promise<EmployeeAssessment | null> {
    try {
      const draft = await this.draft();

      if (draft?.sections?.length) {
        return draft;
      }
    } catch (error: any) {
      if (!isMissingDraft(error)) {
        throw error;
      }
    }

    return this.template();
  },

  async saveDraft(
    payload: AssessmentRequest,
    assessmentId?: number | null,
  ): Promise<EmployeeAssessment> {
    const res = assessmentId
      ? await api.put(`/employee-assessments/${assessmentId}`, payload)
      : await api.post('/employee-assessments', payload);

    return normalizeAssessment(unwrap<any>(res, null)) as EmployeeAssessment;
  },

  async submit(
    payloadOrId: AssessmentRequest | number,
    maybePayload?: AssessmentRequest,
  ): Promise<EmployeeAssessment> {
    if (typeof payloadOrId === 'number') {
      if (!maybePayload) {
        throw new Error('Assessment payload is required.');
      }

      const res = await api.post(
        `/employee-assessments/${payloadOrId}/submit`,
        maybePayload,
      );

      return normalizeAssessment(unwrap<any>(res, null)) as EmployeeAssessment;
    }

    const payload = payloadOrId;
    const savedDraft = await this.saveDraft(payload, null);

    if (!savedDraft?.id) {
      throw new Error('Assessment draft could not be created before submission.');
    }

    const res = await api.post(
      `/employee-assessments/${savedDraft.id}/submit`,
      payload,
    );

    return normalizeAssessment(unwrap<any>(res, null)) as EmployeeAssessment;
  },

  async myScores(): Promise<AssessmentScoreRow[]> {
    const res = await api.get('/employee-assessments/my-scores');
    return normalizeList<any>(res, []).map(normalizeScoreRow);
  },

  async scoreTable(): Promise<AssessmentScoreRow[]> {
    const res = await api.get('/employee-assessments/score-table');
    return normalizeList<any>(res, []).map(normalizeScoreRow);
  },

  async getById(id: number): Promise<EmployeeAssessment | null> {
    const res = await api.get(`/employee-assessments/${id}`);
    return normalizeAssessment(unwrap<any>(res, null));
  },
};