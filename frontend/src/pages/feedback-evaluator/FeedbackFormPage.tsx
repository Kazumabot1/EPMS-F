import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  useFeedbackAssignmentDetail,
  useSaveFeedbackDraft,
  useSubmitFeedbackResponse,
} from '../../hooks/useFeedbackEvaluator';
import type { FeedbackRelationshipType } from '../../types/feedbackEvaluator';

type FormValues = {
  comments: string;
  responses: Array<{
    questionId: number;
    ratingValue: string;
    comment: string;
  }>;
};

const RATING_OPTIONS = [
  { value: 1, label: 'Unsatisfactory', helper: 'Does not meet expectations' },
  { value: 2, label: 'Needs improvement', helper: 'Needs clear improvement' },
  { value: 3, label: 'Meet requirement', helper: 'Meets expected standard' },
  { value: 4, label: 'Good', helper: 'Consistently good' },
  { value: 5, label: 'Outstanding', helper: 'Excellent performance' },
] as const;

const formatDateTime = (value: string | null) => {
  if (!value) {
    return 'No deadline';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
};

const relationshipLabel = (type: FeedbackRelationshipType) => {
  switch (type) {
    case 'MANAGER':
      return 'Manager feedback';
    case 'PEER':
      return 'Peer feedback';
    case 'SUBORDINATE':
      return 'Subordinate feedback';
    case 'SELF':
      return 'Self review';
    case 'PROJECT_STAKEHOLDER':
      return 'Project stakeholder feedback';
    default:
      return type;
  }
};

const initials = (name: string) =>
    name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join('') || 'E';

const FeedbackFormPage = () => {
  const { assignmentId } = useParams<{ assignmentId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const feedbackHomePath = location.pathname.startsWith('/employee/') ? '/employee/feedback' : '/feedback';
  const parsedAssignmentId = assignmentId ? Number(assignmentId) : null;
  const [draftSavedMessage, setDraftSavedMessage] = useState('');

  const assignmentQuery = useFeedbackAssignmentDetail(
      parsedAssignmentId != null && Number.isFinite(parsedAssignmentId) ? parsedAssignmentId : null,
  );
  const saveDraftMutation = useSaveFeedbackDraft();
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
    setValue,
    watch,
    getValues,
    formState: { errors, isDirty },
  } = useForm<FormValues>({
    defaultValues: {
      comments: '',
      responses: [],
    },
  });

  const watchedResponses = watch('responses');
  const requiredQuestions = useMemo(
      () => flatQuestions.filter((question) => question.required),
      [flatQuestions],
  );
  const requiredCount = requiredQuestions.length;
  const answeredRequiredCount = useMemo(
      () =>
          flatQuestions.filter((question, index) => {
            if (!question.required) return false;
            return Boolean(watchedResponses?.[index]?.ratingValue?.trim());
          }).length,
      [flatQuestions, watchedResponses],
  );
  const answeredQuestionCount = useMemo(
      () =>
          flatQuestions.filter((_, index) => Boolean(watchedResponses?.[index]?.ratingValue?.trim())).length,
      [flatQuestions, watchedResponses],
  );
  const completionPercent = requiredCount === 0 ? 100 : Math.min(100, Math.round((answeredRequiredCount / requiredCount) * 100));
  const hasMissingRequiredRatings = requiredCount > 0 && answeredRequiredCount < requiredCount;

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
    setDraftSavedMessage('');
  }, [assignment, flatQuestions, reset]);


  useEffect(() => {
    if (!isDirty || !assignment?.canSubmit) {
      return undefined;
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [assignment?.canSubmit, isDirty]);

  const buildDraftPayload = () => {
    if (!assignment) return null;
    const values = getValues();
    return {
      evaluatorAssignmentId: assignment.assignmentId,
      comments: values.comments.trim() || undefined,
      responses: values.responses.map((response, index) => {
        const rawValue = response.ratingValue.trim();
        return {
          questionId: response.questionId || flatQuestions[index]?.id,
          ratingValue: rawValue ? Number(rawValue) : null,
          comment: response.comment.trim() || undefined,
        };
      }),
    };
  };

  const validateResponsesForSubmit = (values: FormValues) => {
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

    return { hasClientError, responses };
  };

  const handleSaveDraft = async () => {
    if (!assignment) return;
    setDraftSavedMessage('');
    clearErrors();

    const payload = buildDraftPayload();
    if (!payload) return;

    const invalidRatingIndex = payload.responses.findIndex((response) => {
      if (response.ratingValue == null) return false;
      return !Number.isFinite(response.ratingValue) || response.ratingValue < 1 || response.ratingValue > 5;
    });

    if (invalidRatingIndex >= 0) {
      setError(`responses.${invalidRatingIndex}.ratingValue`, {
        type: 'validate',
        message: 'Ratings must be between 1 and 5.',
      });
      return;
    }

    try {
      await saveDraftMutation.mutateAsync(payload);
      reset(getValues());
      setDraftSavedMessage('Draft saved. You can return later from My tasks.');
    } catch {
      // Error surfaced below.
    }
  };

  const onSubmit = handleSubmit(async (values) => {
    if (!assignment) {
      return;
    }

    setDraftSavedMessage('');
    const { hasClientError, responses } = validateResponsesForSubmit(values);

    if (hasClientError) {
      return;
    }

    const confirmed = window.confirm(
        'Submit final feedback? After final submission, you will not be able to edit this response.',
    );
    if (!confirmed) {
      return;
    }

    try {
      await submitMutation.mutateAsync({
        evaluatorAssignmentId: assignment.assignmentId,
        comments: values.comments.trim() || undefined,
        responses,
      });
      navigate(feedbackHomePath);
    } catch {
      // Error surfaced below through mutation state.
    }
  });

  const overallCommentsRegistration = register('comments');

  if (assignmentQuery.isLoading) {
    return <div className="feedback-evaluator-empty">Loading feedback assignment...</div>;
  }

  if (assignmentQuery.error instanceof Error) {
    return <div className="feedback-evaluator-banner error">{assignmentQuery.error.message}</div>;
  }

  if (!assignment) {
    return <div className="feedback-evaluator-empty">Feedback assignment not found.</div>;
  }

  const saving = saveDraftMutation.isPending || submitMutation.isPending;

  return (
      <div className="feedback-evaluator-stack">
        <section className="feedback-evaluator-card feedback-evaluator-form-shell">
          <div className="feedback-evaluator-card-header feedback-evaluator-card-header-wrap">
            <div>
              <p className="feedback-workspace-kicker">Assignment detail</p>
              <h2>{assignment.campaignName}</h2>
              <span>Give {relationshipLabel(assignment.relationshipType).toLowerCase()} for the selected employee.</span>
            </div>

            <Link className="feedback-evaluator-secondary" to={feedbackHomePath}>
              Back to tasks
            </Link>
          </div>

          <div className="feedback-evaluator-review-strip">
            <div className="feedback-evaluator-person-row">
              <div className="feedback-evaluator-avatar large">{initials(assignment.targetEmployeeName)}</div>
              <div>
                <span>Feedback for</span>
                <strong>{assignment.targetEmployeeName}</strong>
                <small>{relationshipLabel(assignment.relationshipType)}</small>
              </div>
            </div>

            <div className="feedback-evaluator-progress-panel">
              <div>
                <span>Required completion</span>
                <strong>{answeredRequiredCount}/{requiredCount || flatQuestions.length}</strong>
                <small>{requiredCount > 0 ? `${completionPercent}% required complete` : `${answeredQuestionCount}/${flatQuestions.length} questions answered`}</small>
              </div>
              <div className="feedback-evaluator-progress-track" aria-hidden="true">
                <span style={{ width: `${completionPercent}%` }} />
              </div>
            </div>
          </div>

          <div className="feedback-evaluator-assignment-meta">
            <div>
              <span>Campaign status</span>
              <strong>{assignment.campaignStatus}</strong>
            </div>
            <div>
              <span>Deadline</span>
              <strong>{formatDateTime(assignment.dueAt)}</strong>
            </div>
            <div>
              <span>Assignment status</span>
              <strong>{assignment.status.replace('_', ' ')}</strong>
            </div>
            <div>
              <span>Anonymity</span>
              <strong>{assignment.anonymous ? 'Identity hidden in reports' : 'Identity visible to HR workflow'}</strong>
            </div>
          </div>

          {assignment.lifecycleMessage ? (
              <div className={`feedback-evaluator-banner ${assignment.canSubmit ? 'info' : 'warning'}`}>
                {assignment.lifecycleMessage}
              </div>
          ) : null}
          {draftSavedMessage ? (
              <div className="feedback-evaluator-banner success">{draftSavedMessage}</div>
          ) : null}
          {isDirty && assignment.canSubmit ? (
              <div className="feedback-evaluator-banner info">
                You have unsaved changes. Save a draft before leaving, or submit when complete.
              </div>
          ) : null}
          {assignment.canSubmit && hasMissingRequiredRatings ? (
              <div className="feedback-evaluator-banner warning">
                Final submission is locked until all required ratings are selected. Save draft is still available.
              </div>
          ) : null}
          {saveDraftMutation.error instanceof Error ? (
              <div className="feedback-evaluator-banner error">{saveDraftMutation.error.message}</div>
          ) : null}
          {submitMutation.error instanceof Error ? (
              <div className="feedback-evaluator-banner error">{submitMutation.error.message}</div>
          ) : null}

          <form className="feedback-evaluator-stack" onSubmit={onSubmit}>
            <div className="feedback-rating-guide" aria-label="Rating scale guide">
              {RATING_OPTIONS.map((option) => (
                  <div key={option.value}>
                    <strong>{option.value}</strong>
                    <span>{option.label}</span>
                  </div>
              ))}
            </div>

            {assignment.sections.map((section) => (
                <section key={section.id} className="feedback-question-section">
                  {section.title && section.title.toLowerCase() !== 'evaluation' ? (
                      <header>
                        <h3>{section.title}</h3>
                      </header>
                  ) : null}

                  <div className="feedback-question-list">
                    {section.questions.map((question) => {
                      const formIndex = flatQuestions.findIndex((item) => item.id === question.id);
                      const selectedRating = watchedResponses?.[formIndex]?.ratingValue ?? '';
                      const responseCommentRegistration = register(`responses.${formIndex}.comment`);
                      return (
                          <article key={question.id} className="feedback-question-card">
                            <div className="feedback-question-head">
                              <div>
                                <span>Question {question.questionOrder}{question.required ? ' · Required' : ' · Optional'}</span>
                                <strong>{question.questionText}</strong>
                              </div>
                            </div>

                            <input
                                type="hidden"
                                {...register(`responses.${formIndex}.questionId`, {
                                  value: question.id,
                                  valueAsNumber: true,
                                })}
                            />

                            <div className="feedback-rating-choice-row" role="radiogroup" aria-label={`Rating for ${question.questionText}`}>
                              {RATING_OPTIONS.map((option) => {
                                const isSelected = selectedRating === String(option.value);
                                return (
                                    <button
                                        key={option.value}
                                        type="button"
                                        disabled={!assignment.canSubmit || saving}
                                        className={`feedback-rating-choice ${isSelected ? 'selected' : ''}`}
                                        onClick={() => {
                                          setValue(`responses.${formIndex}.ratingValue`, String(option.value), {
                                            shouldDirty: true,
                                            shouldValidate: true,
                                          });
                                          clearErrors(`responses.${formIndex}.ratingValue`);
                                          setDraftSavedMessage('');
                                        }}
                                        aria-pressed={isSelected}
                                    >
                                      <strong>{option.value}</strong>
                                      <span>{option.label}</span>
                                      <small>{option.helper}</small>
                                    </button>
                                );
                              })}
                            </div>

                            <input
                                type="hidden"
                                {...register(`responses.${formIndex}.ratingValue`)}
                            />
                            {errors.responses?.[formIndex]?.ratingValue ? (
                                <small className="feedback-evaluator-error">
                                  {errors.responses[formIndex]?.ratingValue?.message}
                                </small>
                            ) : null}

                            <label className="feedback-question-field feedback-question-field-wide">
                              <span>Comment</span>
                              <textarea
                                  disabled={!assignment.canSubmit || saving}
                                  {...responseCommentRegistration}
                                  placeholder="Add a short example or context for this rating"
                                  onChange={(event) => {
                                    responseCommentRegistration.onChange(event);
                                    setDraftSavedMessage('');
                                  }}
                              />
                            </label>
                          </article>
                      );
                    })}
                  </div>
                </section>
            ))}

            <label className="feedback-question-field feedback-question-field-wide">
              <span>Overall comments</span>
              <textarea
                  disabled={!assignment.canSubmit || saving}
                  {...overallCommentsRegistration}
                  placeholder="Summarize strengths, areas to improve, and any supporting context"
                  onChange={(event) => {
                    overallCommentsRegistration.onChange(event);
                    setDraftSavedMessage('');
                  }}
              />
            </label>

            <div className="feedback-evaluator-actions feedback-evaluator-actions-split">
              <button
                  className="feedback-evaluator-secondary solid"
                  disabled={!assignment.canSubmit || saving}
                  type="button"
                  onClick={handleSaveDraft}
              >
                {saveDraftMutation.isPending ? 'Saving draft...' : 'Save draft'}
              </button>
              <button
                  className="feedback-evaluator-primary"
                  disabled={!assignment.canSubmit || saving || hasMissingRequiredRatings}
                  type="submit"
                  title={hasMissingRequiredRatings ? 'Select all required ratings before final submission.' : undefined}
              >
                {submitMutation.isPending ? 'Submitting feedback...' : 'Submit final feedback'}
              </button>
            </div>
          </form>
        </section>
      </div>
  );
};

export default FeedbackFormPage;
