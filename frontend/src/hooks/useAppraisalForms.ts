import { useCallback } from 'react';
import { appraisalFormApi } from '../api/appraisalFormApi';
import type { AppraisalForm, AppraisalFormPayload, AppraisalListItem } from '../types/appraisal';
import { useAsyncState } from './useAsyncState';

export const useAppraisalForms = () => {
  const state = useAsyncState<AppraisalListItem[]>([]);

  const loadForms = useCallback(async () => {
    const result = await state.execute(() => appraisalFormApi.getAll());
    state.setData(result);
    return result;
  }, [state]);

  const getFormById = useCallback(
    async (id: string): Promise<AppraisalForm> => state.execute(() => appraisalFormApi.getById(id)),
    [state],
  );

  const createForm = useCallback(
    async (payload: AppraisalFormPayload): Promise<AppraisalForm> => {
      const created = await state.execute(() => appraisalFormApi.create(payload));
      await loadForms();
      return created;
    },
    [loadForms, state],
  );

  const updateForm = useCallback(
    async (id: string, payload: AppraisalFormPayload): Promise<AppraisalForm> => {
      const updated = await state.execute(() => appraisalFormApi.update(id, payload));
      await loadForms();
      return updated;
    },
    [loadForms, state],
  );

  const deleteForm = useCallback(
    async (id: string): Promise<void> => {
      await state.execute(() => appraisalFormApi.remove(id));
      await loadForms();
    },
    [loadForms, state],
  );

  return {
    ...state,
    loadForms,
    getFormById,
    createForm,
    updateForm,
    deleteForm,
  };
};
