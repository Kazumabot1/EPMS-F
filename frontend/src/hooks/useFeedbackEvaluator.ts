import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { feedbackEvaluatorApi } from '../api/feedbackEvaluatorApi';
import type { SubmitFeedbackResponsePayload } from '../types/feedbackEvaluator';

export const feedbackEvaluatorKeys = {
  all: ['feedback-evaluator'] as const,
  tasks: () => [...feedbackEvaluatorKeys.all, 'tasks'] as const,
  assignment: (assignmentId: number) => [...feedbackEvaluatorKeys.all, 'assignment', assignmentId] as const,
};

export const useMyFeedbackTasks = () =>
  useQuery({
    queryKey: feedbackEvaluatorKeys.tasks(),
    queryFn: feedbackEvaluatorApi.getMyTasks,
  });

export const useFeedbackAssignmentDetail = (assignmentId: number | null) =>
  useQuery({
    queryKey: assignmentId != null ? feedbackEvaluatorKeys.assignment(assignmentId) : feedbackEvaluatorKeys.all,
    queryFn: () => feedbackEvaluatorApi.getAssignmentDetail(assignmentId as number),
    enabled: assignmentId != null,
  });

export const useSubmitFeedbackResponse = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: SubmitFeedbackResponsePayload) => feedbackEvaluatorApi.submitResponse(payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: feedbackEvaluatorKeys.tasks() });
      queryClient.invalidateQueries({
        queryKey: feedbackEvaluatorKeys.assignment(variables.evaluatorAssignmentId),
      });
    },
  });
};
