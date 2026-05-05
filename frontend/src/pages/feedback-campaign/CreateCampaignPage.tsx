import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import {
  useAssignFeedbackTargets,
  useCreateFeedbackCampaign,
  useFeedbackCampaign,
  useFeedbackCampaignReferenceData,
  useGenerateFeedbackAssignments,
} from '../../hooks/useFeedbackCampaignSetup';
import type {
  CreateFeedbackCampaignInput,
  FeedbackAssignmentGenerationResponse,
  FeedbackCampaign,
  EvaluatorConfigInput,
} from '../../types/feedbackCampaign';
import AssignmentPreviewComponent from './components/AssignmentPreviewComponent';
import EvaluatorConfigComponent from './components/EvaluatorConfigComponent';
import TargetSelectionComponent from './components/TargetSelectionComponent';
import './feedback-campaign-setup.css';

const campaignSchema = z
  .object({
    name: z.string().trim().min(1, 'Campaign name is required.'),
    startDate: z.string().min(1, 'Start date is required.'),
    endDate: z.string().min(1, 'End date is required.'),
    formId: z.number().int().positive('Select a feedback form.'),
  })
  .refine((values) => values.startDate < values.endDate, {
    message: 'Start date must be earlier than end date.',
    path: ['endDate'],
  });

type CampaignFormValues = z.input<typeof campaignSchema>;

const defaultCampaignValues = (): CampaignFormValues => {
  const start = new Date();
  const end = new Date(start.getTime() + 14 * 24 * 60 * 60 * 1000);

  return {
    name: '',
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
    formId: 0,
  };
};

const CreateCampaignPage = () => {
  const [campaignId, setCampaignId] = useState<number | null>(null);
  const [assignmentPreview, setAssignmentPreview] =
    useState<FeedbackAssignmentGenerationResponse | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [pageSuccess, setPageSuccess] = useState<string | null>(null);

  const {
    formsQuery,
    employeesQuery,
    departmentsQuery,
    teamsQuery,
  } = useFeedbackCampaignReferenceData();
  const campaignQuery = useFeedbackCampaign(campaignId);

  const createCampaignMutation = useCreateFeedbackCampaign();
  const assignTargetsMutation = useAssignFeedbackTargets();
  const generateAssignmentsMutation = useGenerateFeedbackAssignments();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CampaignFormValues>({
    resolver: zodResolver(campaignSchema),
    defaultValues: defaultCampaignValues(),
  });

  const activeCampaign = (campaignQuery.data as FeedbackCampaign | undefined) ?? null;
  const blockingError =
    formsQuery.error instanceof Error
      ? formsQuery.error.message
      : employeesQuery.error instanceof Error
      ? employeesQuery.error.message
      : departmentsQuery.error instanceof Error
      ? departmentsQuery.error.message
      : teamsQuery.error instanceof Error
      ? teamsQuery.error.message
      : null;

  const isReferenceLoading =
    formsQuery.isLoading ||
    employeesQuery.isLoading ||
    departmentsQuery.isLoading ||
    teamsQuery.isLoading;

  const handleCreateCampaign = async (values: CampaignFormValues) => {
    setPageError(null);
    setPageSuccess(null);
    setAssignmentPreview(null);

    try {
      const created = await createCampaignMutation.mutateAsync(values as CreateFeedbackCampaignInput);
      setCampaignId(created.id);
      setPageSuccess(`Campaign "${created.name}" created. Continue with target selection.`);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Failed to create campaign.');
    }
  };

  const handleAssignTargets = async (payload: { employeeIds: number[] }) => {
    if (campaignId == null) {
      return;
    }

    setPageError(null);
    setPageSuccess(null);
    setAssignmentPreview(null);

    try {
      const updatedCampaign = await assignTargetsMutation.mutateAsync({
        campaignId,
        payload,
      });
      setPageSuccess(
        `${updatedCampaign.targetCount} target employee(s) saved for campaign "${updatedCampaign.name}".`,
      );
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Failed to save target employees.');
    }
  };

  const handleGenerateAssignments = async (payload: EvaluatorConfigInput) => {
    if (campaignId == null) {
      return;
    }

    setPageError(null);
    setPageSuccess(null);

    try {
      const preview = await generateAssignmentsMutation.mutateAsync({
        campaignId,
        payload,
      });
      setAssignmentPreview(preview);
      setPageSuccess('Evaluator assignments generated successfully.');
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Failed to generate evaluator assignments.');
    }
  };

  return (
    <div className="feedback-setup-page">
      <section className="feedback-setup-hero">
        <div>
          <p className="feedback-setup-kicker">360-Degree Feedback Module</p>
          <h1>Create campaign and assign evaluators</h1>
          <p>
            This flow is campaign-based only. Self feedback is excluded, and evaluator generation
            follows manager, team, project, and cross-team rules controlled by HR.
          </p>
        </div>
      </section>

      {pageSuccess ? <div className="feedback-setup-banner success">{pageSuccess}</div> : null}
      {pageError ? <div className="feedback-setup-banner error">{pageError}</div> : null}
      {blockingError ? <div className="feedback-setup-banner error">{blockingError}</div> : null}

      <section className="feedback-setup-card">
        <div className="feedback-setup-card-header">
          <div>
            <p className="feedback-setup-eyebrow">Step 1</p>
            <h2>Create feedback campaign</h2>
          </div>
        </div>

        {isReferenceLoading ? (
          <div className="feedback-setup-empty">Loading campaign setup data...</div>
        ) : (
          <form className="feedback-setup-stack" onSubmit={handleSubmit(handleCreateCampaign)}>
            <div className="feedback-setup-form-grid">
              <label className="feedback-setup-field feedback-setup-field-wide">
                <span>Campaign name</span>
                <input
                  {...register('name')}
                  placeholder="Example: Mid-Year Leadership 360"
                />
                {errors.name ? <small className="feedback-setup-error">{errors.name.message}</small> : null}
              </label>

              <label className="feedback-setup-field">
                <span>Start date</span>
                <input type="date" {...register('startDate')} />
                {errors.startDate ? <small className="feedback-setup-error">{errors.startDate.message}</small> : null}
              </label>

              <label className="feedback-setup-field">
                <span>End date</span>
                <input type="date" {...register('endDate')} />
                {errors.endDate ? <small className="feedback-setup-error">{errors.endDate.message}</small> : null}
              </label>

              <label className="feedback-setup-field feedback-setup-field-wide">
                <span>Feedback form</span>
                <select {...register('formId', { valueAsNumber: true })}>
                  <option value={0}>Select an active form</option>
                  {formsQuery.data?.map((form) => (
                    <option key={form.id} value={form.id}>
                      {form.formName} v{form.versionNumber}
                    </option>
                  ))}
                </select>
                {errors.formId ? <small className="feedback-setup-error">{errors.formId.message}</small> : null}
              </label>
            </div>

            <div className="feedback-setup-actions">
              <button className="feedback-setup-primary" disabled={createCampaignMutation.isPending} type="submit">
                {createCampaignMutation.isPending ? 'Creating campaign...' : 'Create campaign'}
              </button>
            </div>
          </form>
        )}
      </section>

      {activeCampaign ? (
        <div className="feedback-setup-grid">
          <TargetSelectionComponent
            departments={departmentsQuery.data ?? []}
            employees={employeesQuery.data ?? []}
            initialSelectedIds={activeCampaign.targetEmployeeIds}
            onSubmit={handleAssignTargets}
            submitting={assignTargetsMutation.isPending}
            teams={teamsQuery.data ?? []}
          />

          <div className="feedback-setup-stack">
            <EvaluatorConfigComponent
              onSubmit={handleGenerateAssignments}
              submitting={generateAssignmentsMutation.isPending}
            />
            <AssignmentPreviewComponent
              campaign={activeCampaign}
              employees={employeesQuery.data ?? []}
              preview={assignmentPreview}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default CreateCampaignPage;
