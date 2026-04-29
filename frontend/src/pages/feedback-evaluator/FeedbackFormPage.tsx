import { useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useFeedbackAssignmentDetail, useSubmitFeedbackResponse } from '../../hooks/useFeedbackEvaluator';

type FormValues = {
  comments: string;
  responses: Array<{
    questionId: number;
    ratingValue: string;
    comment: string;
  }>;
};

const formatDateTime = (value: string | null) => {
  if (!value) {
    return 'No deadline';
  }

  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
};

const FeedbackFormPage = () => {
  const { assignmentId } = useParams<{ assignmentId: string }>();
  const navigate = useNavigate();
  const parsedAssignmentId = assignmentId ? Number(assignmentId) : null;

  const assignmentQuery = useFeedbackAssignmentDetail(
    parsedAssignmentId != null && Number.isFinite(parsedAssignmentId) ? parsedAssignmentId : null,
  );
  const submitMutation = useSubmitFeedbackResponse();

  const assignment = assignmentQuery.data;

  const flatQuestions = useMemo(
    () =>
      assignment
        ? assignment.sections.flatMap((section) =>
            section.questions.map((question) => ({
              sectionId: section.id,
              sectionTitle: section.title,
              ...question,
            })),
          )
        : [],
    [assignment],
  );

  const {
    register,
    handleSubmit,
    reset,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      comments: '',
      responses: [],
    },
  });

  useEffect(() => {
    if (!assignment) {
      return;
    }

    reset({
      comments: assignment.comments ?? '',
      responses: flatQuestions.map((question) => ({
        questionId: question.id,
        ratingValue:
          question.existingRatingValue != null ? String(question.existingRatingValue) : '',
        comment: question.existingComment ?? '',
      })),
    });
  }, [assignment, flatQuestions, reset]);

  const onSubmit = handleSubmit(async (values) => {
    if (!assignment) {
      return;
    }

    clearErrors();

    let hasClientError = false;
    const responses = values.responses
      .map((response, index) => {
        const question = flatQuestions[index];
        const rawValue = response.ratingValue.trim();

        if (question.required && rawValue.length === 0) {
          setError(`responses.${index}.ratingValue`, {
            type: 'required',
            message: 'A rating is required for this question.',
          });
          hasClientError = true;
          return null;
        }

        if (rawValue.length === 0) {
          return null;
        }

        const numericValue = Number(rawValue);
        if (!Number.isFinite(numericValue) || numericValue < 1 || numericValue > 5) {
          setError(`responses.${index}.ratingValue`, {
            type: 'validate',
            message: 'Ratings must be between 1 and 5.',
          });
          hasClientError = true;
          return null;
        }

        return {
          questionId: response.questionId,
          ratingValue: numericValue,
          comment: response.comment.trim() || undefined,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item != null);

    if (hasClientError) {
      return;
    }

    try {
      await submitMutation.mutateAsync({
        evaluatorAssignmentId: assignment.assignmentId,
        comments: values.comments.trim() || undefined,
        responses,
      });
      navigate('/feedback/my-tasks');
    } catch {
      // Error surfaced below through mutation state.
    }
  });

  if (assignmentQuery.isLoading) {
    return <div className="feedback-evaluator-empty">Loading feedback assignment...</div>;
  }

  if (assignmentQuery.error instanceof Error) {
    return <div className="feedback-evaluator-banner error">{assignmentQuery.error.message}</div>;
  }

  if (!assignment) {
    return <div className="feedback-evaluator-empty">Feedback assignment not found.</div>;
  }

  return (
    <div className="feedback-evaluator-stack">
      <section className="feedback-evaluator-card">
        <div className="feedback-evaluator-card-header">
          <div>
            <p className="feedback-workspace-kicker">Assignment detail</p>
            <h2>{assignment.campaignName}</h2>
            <span>
              For {assignment.targetEmployeeName} ({assignment.relationshipType})
            </span>
          </div>

          <Link className="feedback-evaluator-secondary" to="/feedback/my-tasks">
            Back to tasks
          </Link>
        </div>

        <div className="feedback-evaluator-assignment-meta">
          <div>
            <span>Deadline</span>
            <strong>{formatDateTime(assignment.dueAt)}</strong>
          </div>
          <div>
            <span>Status</span>
            <strong>{assignment.status}</strong>
          </div>
          <div>
            <span>Anonymity</span>
            <strong>{assignment.anonymous ? 'Your identity will be hidden' : 'Visible to HR and the target workflow'}</strong>
          </div>
        </div>

        {!assignment.canSubmit ? (
          <div className="feedback-evaluator-banner warning">
            This assignment is no longer open for submission.
          </div>
        ) : null}
        {submitMutation.error instanceof Error ? (
          <div className="feedback-evaluator-banner error">{submitMutation.error.message}</div>
        ) : null}

        <form className="feedback-evaluator-stack" onSubmit={onSubmit}>
          {assignment.sections.map((section) => (
            <section key={section.id} className="feedback-question-section">
              <header>
                <h3>{section.title}</h3>
              </header>

              <div className="feedback-question-list">
                {section.questions.map((question) => {
                  const formIndex = flatQuestions.findIndex((item) => item.id === question.id);
                  return (
                    <article key={question.id} className="feedback-question-card">
                      <div className="feedback-question-head">
                        <div>
                          <strong>{question.questionText}</strong>
                          <span>
                            Question {question.questionOrder}
                            {question.required ? ' · Required' : ' · Optional'}
                          </span>
                        </div>
                      </div>

                      <div className="feedback-question-controls">
                        <label className="feedback-question-field">
                          <span>Rating</span>
                          <select
                            disabled={!assignment.canSubmit || submitMutation.isPending}
                            {...register(`responses.${formIndex}.ratingValue`)}
                          >
                            <option value="">Select a rating</option>
                            <option value="1">1</option>
                            <option value="2">2</option>
                            <option value="3">3</option>
                            <option value="4">4</option>
                            <option value="5">5</option>
                          </select>
                          <input
                            type="hidden"
                            {...register(`responses.${formIndex}.questionId`, {
                              value: question.id,
                              valueAsNumber: true,
                            })}
                          />
                          {errors.responses?.[formIndex]?.ratingValue ? (
                            <small className="feedback-evaluator-error">
                              {errors.responses[formIndex]?.ratingValue?.message}
                            </small>
                          ) : null}
                        </label>

                        <label className="feedback-question-field feedback-question-field-wide">
                          <span>Comment</span>
                          <textarea
                            disabled={!assignment.canSubmit || submitMutation.isPending}
                            {...register(`responses.${formIndex}.comment`)}
                            placeholder="Add supporting context for this rating"
                          />
                        </label>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ))}

          <label className="feedback-question-field feedback-question-field-wide">
            <span>Overall comments</span>
            <textarea
              disabled={!assignment.canSubmit || submitMutation.isPending}
              {...register('comments')}
              placeholder="Summarize strengths, concerns, and recommendations"
            />
          </label>

          <div className="feedback-evaluator-actions">
            <button
              className="feedback-evaluator-primary"
              disabled={!assignment.canSubmit || submitMutation.isPending}
              type="submit"
            >
              {submitMutation.isPending ? 'Submitting feedback...' : 'Submit feedback'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
};

export default FeedbackFormPage;
