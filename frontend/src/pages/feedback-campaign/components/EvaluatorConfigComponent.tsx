import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import type { EvaluatorConfigInput } from '../../../types/feedbackCampaign';

const evaluatorConfigSchema = z
    .object({
      includeManager: z.boolean(),
      includeTeamPeers: z.boolean(),
      includeDepartmentPeers: z.boolean(),
      includeProjectPeers: z.boolean(),
      includeCrossTeamPeers: z.boolean(),
      includeSubordinates: z.boolean(),
      includeSelf: z.boolean(),
      peerCount: z.number().int().positive('Peer count must be greater than zero.'),
    })
    .refine(
        (values) =>
            values.includeManager ||
            values.includeSelf ||
            values.includeSubordinates ||
            values.includeTeamPeers ||
            values.includeDepartmentPeers ||
            values.includeProjectPeers ||
            values.includeCrossTeamPeers,
        {
          message: 'Select at least one evaluator source.',
          path: ['includeManager'],
        },
    );

type EvaluatorConfigValues = z.input<typeof evaluatorConfigSchema>;

type EvaluatorConfigComponentProps = {
  initialValues?: EvaluatorConfigInput;
  submitting: boolean;
  onSubmit: (payload: EvaluatorConfigInput) => Promise<void> | void;
};

const defaultValues: EvaluatorConfigValues = {
  includeManager: true,
  includeTeamPeers: true,
  includeDepartmentPeers: true,
  includeProjectPeers: false,
  includeCrossTeamPeers: false,
  includeSubordinates: true,
  includeSelf: false,
  peerCount: 3,
};

const EvaluatorConfigComponent = ({
                                    initialValues,
                                    submitting,
                                    onSubmit,
                                  }: EvaluatorConfigComponentProps) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EvaluatorConfigValues>({
    resolver: zodResolver(evaluatorConfigSchema),
    defaultValues: initialValues ?? defaultValues,
  });

  return (
      <section className="feedback-setup-card">
        <div className="feedback-setup-card-header">
          <div>
            <p className="feedback-setup-eyebrow">Step 3</p>
            <h2>Configure evaluator rules</h2>
          </div>
        </div>

        <form
            className="feedback-setup-stack"
            onSubmit={handleSubmit(async (values) => {
              await onSubmit(values as EvaluatorConfigInput);
            })}
        >
          <label className="feedback-setup-checkbox">
            <input type="checkbox" {...register('includeManager')} />
            <div>
              <strong>Include direct manager</strong>
              <span>Uses the employee reporting line. Manager feedback is non-anonymous.</span>
            </div>
          </label>

          <label className="feedback-setup-checkbox">
            <input type="checkbox" {...register('includeDepartmentPeers')} />
            <div>
              <strong>Include department peers</strong>
              <span>Randomly selects eligible peers from the same department, even when no team exists.</span>
            </div>
          </label>

          <label className="feedback-setup-checkbox">
            <input type="checkbox" {...register('includeTeamPeers')} />
            <div>
              <strong>Prefer team peers</strong>
              <span>Adds active team members first, while excluding managers, subordinates, and the target employee.</span>
            </div>
          </label>

          <label className="feedback-setup-checkbox">
            <input type="checkbox" {...register('includeSubordinates')} />
            <div>
              <strong>Include direct subordinates</strong>
              <span>Employees who report to the target employee provide upward feedback anonymously.</span>
            </div>
          </label>

          <label className="feedback-setup-checkbox">
            <input type="checkbox" {...register('includeSelf')} />
            <div>
              <strong>Include self feedback</strong>
              <span>The target employee completes the same feedback form for self-evaluation.</span>
            </div>
          </label>

          <label className="feedback-setup-checkbox">
            <input type="checkbox" {...register('includeProjectPeers')} />
            <div>
              <strong>Include project peers</strong>
              <span>Uses project-based peer selection when a project directory is available.</span>
            </div>
          </label>

          <label className="feedback-setup-checkbox">
            <input type="checkbox" {...register('includeCrossTeamPeers')} />
            <div>
              <strong>Include other-team peers</strong>
              <span>Extends the peer pool with employees from other active teams in the same department.</span>
            </div>
          </label>

          <label className="feedback-setup-field feedback-setup-field-compact">
            <span>Peer count</span>
            <input type="number" min={1} {...register('peerCount', { valueAsNumber: true })} />
          </label>

          {errors.includeManager ? <p className="feedback-setup-error">{errors.includeManager.message}</p> : null}
          {errors.peerCount ? <p className="feedback-setup-error">{errors.peerCount.message}</p> : null}

          <div className="feedback-setup-actions">
            <button className="feedback-setup-primary" disabled={submitting} type="submit">
              {submitting ? 'Generating assignments...' : 'Generate evaluator assignments'}
            </button>
          </div>
        </form>
      </section>
  );
};

export default EvaluatorConfigComponent;
