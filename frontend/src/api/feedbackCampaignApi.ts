import api from '../services/api';
import { extractApiErrorMessage } from '../services/apiError';
import {
  fetchEmployees,
  type EmployeeResponse,
} from '../services/employeeService';
import {
  fetchDepartments,
  fetchTeams,
  type Department,
  type TeamResponse,
} from '../services/teamService';
import type {
  ApiEnvelope,
  CreateFeedbackCampaignInput,
  FeedbackAssignmentGenerationResponse,
  FeedbackCampaign,
  FeedbackCampaignTargetsInput,
  FeedbackDepartmentOption,
  FeedbackFormOption,
  FeedbackTargetEmployee,
  FeedbackTeamOption,
  EvaluatorConfigInput,
} from '../types/feedbackCampaign';

const FEEDBACK_BASE = '/v1/feedback';

const unwrapEnvelope = <T>(response: { data: ApiEnvelope<T> }): T => response.data.data;

const mapEmployee = (employee: EmployeeResponse): FeedbackTargetEmployee => ({
  id: employee.id,
  fullName:
      employee.fullName?.trim() ||
      `${employee.firstName ?? ''} ${employee.lastName ?? ''}`.trim() ||
      `Employee #${employee.id}`,
  currentDepartmentId: employee.currentDepartmentId ?? null,
  currentDepartment: employee.currentDepartment ?? null,
  userId: employee.userId ?? null,
});

const mapDepartment = (department: Department): FeedbackDepartmentOption => ({
  id: department.id,
  name: department.departmentName ?? department.name ?? `Department #${department.id}`,
});

const mapTeam = (team: TeamResponse): FeedbackTeamOption => ({
  id: team.id,
  teamName: team.teamName,
  memberEmployeeIds: team.members
      .map((member) => member.employeeId)
      .filter((value): value is number => typeof value === 'number'),
});

export const feedbackCampaignApi = {
  async getActiveForms(): Promise<FeedbackFormOption[]> {
    try {
      const response = await api.get<ApiEnvelope<FeedbackFormOption[]>>(`${FEEDBACK_BASE}/forms/active`);
      return unwrapEnvelope(response);
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, 'Failed to load active feedback forms.'));
    }
  },

  async getEmployees(): Promise<FeedbackTargetEmployee[]> {
    const employees = await fetchEmployees(false);
    return employees
        .filter((employee) => employee.userId != null && employee.active !== false)
        .map(mapEmployee)
        .sort((left, right) => left.fullName.localeCompare(right.fullName));
  },

  async getDepartments(): Promise<FeedbackDepartmentOption[]> {
    const departments = await fetchDepartments();
    return departments.map(mapDepartment).sort((left, right) => left.name.localeCompare(right.name));
  },

  async getTeams(): Promise<FeedbackTeamOption[]> {
    const teams = await fetchTeams();
    return teams.map(mapTeam).sort((left, right) => left.teamName.localeCompare(right.teamName));
  },

  async createCampaign(payload: CreateFeedbackCampaignInput): Promise<FeedbackCampaign> {
    try {
      const response = await api.post<ApiEnvelope<FeedbackCampaign>>(`${FEEDBACK_BASE}/campaigns`, payload);
      return unwrapEnvelope(response);
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, 'Failed to create feedback campaign.'));
    }
  },

  async getCampaign(campaignId: number): Promise<FeedbackCampaign> {
    try {
      const response = await api.get<ApiEnvelope<FeedbackCampaign>>(`${FEEDBACK_BASE}/campaigns/${campaignId}`);
      return unwrapEnvelope(response);
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, 'Failed to load feedback campaign.'));
    }
  },

  async assignTargets(
      campaignId: number,
      payload: FeedbackCampaignTargetsInput,
  ): Promise<FeedbackCampaign> {
    try {
      const response = await api.post<ApiEnvelope<FeedbackCampaign>>(
          `${FEEDBACK_BASE}/campaigns/${campaignId}/targets`,
          payload,
      );
      return unwrapEnvelope(response);
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, 'Failed to assign campaign targets.'));
    }
  },

  async generateAssignments(
      campaignId: number,
      payload: EvaluatorConfigInput,
  ): Promise<FeedbackAssignmentGenerationResponse> {
    try {
      const response = await api.post<ApiEnvelope<FeedbackAssignmentGenerationResponse>>(
          `${FEEDBACK_BASE}/campaigns/${campaignId}/assignments/generate`,
          payload,
      );
      return unwrapEnvelope(response);
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, 'Failed to generate evaluator assignments.'));
    }
  },
};
