import api from '../services/api';
import { extractApiErrorMessage } from '../services/apiError';
import type {
  ApiEnvelope,
  FeedbackAssignmentDetail,
  FeedbackEvaluatorTask,
  SubmitFeedbackResponsePayload,
} from '../types/feedbackEvaluator';

const FEEDBACK_BASE = '/v1/feedback';

const unwrap = <T>(response: { data: ApiEnvelope<T> }): T => response.data.data;

export const feedbackEvaluatorApi = {
  async getMyTasks(): Promise<FeedbackEvaluatorTask[]> {
    try {
      const response = await api.get<ApiEnvelope<FeedbackEvaluatorTask[]>>(`${FEEDBACK_BASE}/my-tasks`);
      return unwrap(response);
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, 'Failed to load your feedback tasks.'));
    }
  },

  async getAssignmentDetail(assignmentId: number): Promise<FeedbackAssignmentDetail> {
    try {
      const response = await api.get<ApiEnvelope<FeedbackAssignmentDetail>>(
          `${FEEDBACK_BASE}/assignments/${assignmentId}`,
      );
      return unwrap(response);
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, 'Failed to load the feedback assignment.'));
    }
  },

  async submitResponse(payload: SubmitFeedbackResponsePayload): Promise<number> {
    try {
      const response = await api.post<ApiEnvelope<number>>(`${FEEDBACK_BASE}/responses`, payload);
      return unwrap(response);
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, 'Failed to submit feedback.'));
    }
  },
};
