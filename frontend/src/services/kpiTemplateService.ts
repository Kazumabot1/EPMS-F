
import api from './api';
import { extractApiErrorMessage } from './apiError';
import type { UseKpiTemplateResult } from '../types/kpiWorkflow';
import type { KpiTemplateRequest, KpiTemplateResponse } from '../types/kpiTemplate';

const BASE = '/hr/kpi-templates';

export const kpiTemplateService = {
  async createTemplate(payload: KpiTemplateRequest): Promise<KpiTemplateResponse> {
    try {
      const response = await api.post<KpiTemplateResponse>(`${BASE}/create`, payload);
      return response.data;
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, 'Failed to create KPI template.'));
    }
  },

  async updateTemplate(id: number, payload: KpiTemplateRequest): Promise<KpiTemplateResponse> {
    try {
      const response = await api.put<KpiTemplateResponse>(`${BASE}/update/${id}`, payload);
      return response.data;
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, 'Failed to update KPI template.'));
    }
  },

  async deleteTemplate(id: number): Promise<void> {
    try {
      await api.delete(`${BASE}/delete/${id}`);
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, 'Failed to delete KPI template.'));
    }
  },

  async getAllTemplates(): Promise<KpiTemplateResponse[]> {
    try {
      const response = await api.get<KpiTemplateResponse[]>(`${BASE}/list`);
      return response.data;
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, 'Failed to load KPI templates.'));
    }
  },

  async getTemplateById(id: number): Promise<KpiTemplateResponse> {
    try {
      const response = await api.get<KpiTemplateResponse>(`${BASE}/${id}`);
      return response.data;
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, 'Failed to load KPI template.'));
    }
  },

  async useForDepartment(
    templateId: number,
    payload:
      | { applyToAllDepartments: true }
      | { departmentIds: number[] }
      | { departmentId: number },
  ): Promise<UseKpiTemplateResult> {
    try {
      let body: { applyToAllDepartments?: true; departmentIds?: number[]; departmentId?: number };

      if ('applyToAllDepartments' in payload && payload.applyToAllDepartments === true) {
        body = { applyToAllDepartments: true };
      } else if ('departmentIds' in payload) {
        body = { departmentIds: payload.departmentIds };
      } else if ('departmentId' in payload) {
        body = { departmentId: payload.departmentId };
      } else {
        throw new Error('Department selection is required.');
      }
      const response = await api.post<UseKpiTemplateResult>(
        `${BASE}/${templateId}/use-for-department`,
        body,
      );
      return response.data;
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, 'Could not apply KPI to department.'));
    }
  },
};
