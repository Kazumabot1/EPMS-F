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

type LayoutMode = 'comfortable' | 'compact';
type AutoSaveStatus = 'idle' | 'saving' | 'saved' | 'error';

const RATING_OPTIONS = [
  { value: 1, label: 'Unsatisfactory' },
  { value: 2, label: 'Needs improvement' },
  { value: 3, label: 'Meet requirement' },
  { value: 4, label: 'Good' },
  { value: 5, label: 'Outstanding' },
] as const;

const RATING_GUIDE_STORAGE_KEY = 'feedback-form-rating-guide-seen';
const LAYOUT_STORAGE_KEY = 'feedback-form-layout-mode';

const getInitialLayoutMode = (): LayoutMode => {
  if (typeof window === 'undefined') return 'comfortable';
  return window.localStorage.getItem(LAYOUT_STORAGE_KEY) === 'compact' ? 'compact' : 'comfortable';
};

const getInitialRatingGuideCollapsed = () => {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(RATING_GUIDE_STORAGE_KEY) === 'true';
};

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

const formatTimeOnly = (value: Date | null) => {
  if (!value) return 'Not saved in this session';
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(value);
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
  const [layoutMode, setLayoutMode] = useState<LayoutMode>(getInitialLayoutMode);
  const [ratingGuideCollapsed, setRatingGuideCollapsed] = useState(getInitialRatingGuideCollapsed);
  const [showMissingOnly, setShowMissingOnly] = useState(false);
  const [showCommentExamples, setShowCommentExamples] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [autoSaveStatus, setAutoSaveStatus] = useState<AutoSaveStatus>('idle');

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

  const watchedComments = watch('comments');
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
  const missingRequiredQuestionIds = useMemo(
      () =>
          flatQuestions
              .filter((question, index) => question.required && !watchedResponses?.[index]?.ratingValue?.trim())
              .map((question) => question.id),
      [flatQuestions, watchedResponses],
  );
  const missingRequiredSet = useMemo(() => new Set(missingRequiredQuestionIds), [missingRequiredQuestionIds]);
  const completionPercent = requiredCount === 0 ? 100 : Math.min(100, Math.round((answeredRequiredCount / requiredCount) * 100));
  const hasMissingRequiredRatings = requiredCount > 0 && answeredRequiredCount < requiredCount;
  const visibleSections = useMemo(
      () =>
          assignment
              ? assignment.sections
                  .map((section) => ({
                    ...section,
                    questions: showMissingOnly
                        ? section.questions.filter((question) => missingRequiredSet.has(question.id))
                        : section.questions,
                  }))
                  .filter((section) => section.questions.length > 0)
              : [],
      [assignment, missingRequiredSet, showMissingOnly],
  );

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
    setAutoSaveStatus('idle');
    setLastSavedAt(null);

    if (typeof window !== 'undefined' && window.localStorage.getItem(RATING_GUIDE_STORAGE_KEY) !== 'true') {
      window.localStorage.setItem(RATING_GUIDE_STORAGE_KEY, 'true');
    }
  }, [assignment, flatQuestions, reset]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(LAYOUT_STORAGE_KEY, layoutMode);
    }
  }, [layoutMode]);

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

  const hasInvalidDraftRating = (payload: NonNullable<ReturnType<typeof buildDraftPayload>>) =>
      payload.responses.some((response) => {
        if (response.ratingValue == null) return false;
        return !Number.isFinite(response.ratingValue) || response.ratingValue < 1 || response.ratingValue > 5;
      });

  useEffect(() => {
    if (!assignment?.canSubmit || !isDirty || submitMutation.isPending || saveDraftMutation.isPending) {
      return undefined;
    }

    setAutoSaveStatus('idle');
    const timeoutId = window.setTimeout(async () => {
      const payload = buildDraftPayload();
      if (!payload || hasInvalidDraftRating(payload)) return;

      try {
        setAutoSaveStatus('saving');
        await saveDraftMutation.mutateAsync(payload);
        const currentValues = getValues();
        reset(currentValues);
        setLastSavedAt(new Date());
        setAutoSaveStatus('saved');
        setDraftSavedMessage('Draft auto-saved. The response can be continued later from My Tasks.');
      } catch {
        setAutoSaveStatus('error');
      }
    }, 3500);

    return () => window.clearTimeout(timeoutId);
  }, [assignment?.canSubmit, isDirty, watchedComments, watchedResponses, submitMutation.isPending, saveDraftMutation.isPending]);

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
      setAutoSaveStatus('saving');
      await saveDraftMutation.mutateAsync(payload);
      reset(getValues());
      setLastSavedAt(new Date());
      setAutoSaveStatus('saved');
      setDraftSavedMessage('Draft saved successfully. The response can be continued later from My Tasks.');
    } catch {
      setAutoSaveStatus('error');
    }
  };

  const onSubmit = handleSubmit(async (values) => {
    if (!assignment) {
      return;
    }

    setDraftSavedMessage('');
    const { hasClientError, responses } = validateResponsesForSubmit(values);

    if (hasClientError) {
      setShowMissingOnly(true);
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

  const scrollToQuestion = (questionId: number) => {
    document.getElementById(`feedback-question-${questionId}`)?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  };

  const getQuestionNavState = (index: number, required: boolean) => {
    const answered = Boolean(watchedResponses?.[index]?.ratingValue?.trim());
    if (required && !answered) return 'missing';
    if (answered) return 'answered';
    return 'optional';
  };

  const handleRatingGuideToggle = () => {
    setRatingGuideCollapsed((current) => {
      const next = !current;
      if (typeof window !== 'undefined' && next) {
        window.localStorage.setItem(RATING_GUIDE_STORAGE_KEY, 'true');
      }
      return next;
    });
  };

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

  const draftSaving = saveDraftMutation.isPending;
  const submitting = submitMutation.isPending;
  const actionBusy = draftSaving || submitting;
  const autoSaveText =
      autoSaveStatus === 'saving'
          ? 'Auto-saving draft...'
          : autoSaveStatus === 'error'
              ? 'Auto-save failed. Use Save draft to retry.'
              : lastSavedAt
                  ? `Last saved at ${formatTimeOnly(lastSavedAt)}`
                  : 'Auto-save is ready';

  return (
      <div className={`feedback-evaluator-stack feedback-form-layout-${layoutMode}`}>
        <section className="feedback-evaluator-card feedback-evaluator-form-shell feedback-form-custom-shell">
          <div className="feedback-evaluator-card-header feedback-evaluator-card-header-wrap">
            <div>
              <p className="feedback-workspace-kicker">Assignment detail</p>
              <h2>{assignment.campaignName}</h2>
              <span>Complete the assigned {relationshipLabel(assignment.relationshipType).toLowerCase()} form for the selected employee.</span>
            </div>

            <Link className="feedback-evaluator-secondary" to={feedbackHomePath}>
              Back to tasks
            </Link>
          </div>

          <div className="feedback-form-preferences-panel" aria-label="Evaluator form preferences">
            <div>
              <span>Layout</span>
              <div className="feedback-form-segmented-control" aria-label="Choose form layout">
                <button
                    type="button"
                    className={layoutMode === 'comfortable' ? 'active' : ''}
                    onClick={() => setLayoutMode('comfortable')}
                >
                  Comfortable
                </button>
                <button
                    type="button"
                    className={layoutMode === 'compact' ? 'active' : ''}
                    onClick={() => setLayoutMode('compact')}
                >
                  Compact
                </button>
              </div>
            </div>
            <div>
              <span>Focus tools</span>
              <div className="feedback-form-toggle-row">
                <button
                    type="button"
                    className={showMissingOnly ? 'active' : ''}
                    onClick={() => setShowMissingOnly((current) => !current)}
                    disabled={missingRequiredQuestionIds.length === 0 && !showMissingOnly}
                >
                  Missing required only
                </button>
                <button
                    type="button"
                    className={showCommentExamples ? 'active' : ''}
                    onClick={() => setShowCommentExamples((current) => !current)}
                >
                  Comment examples
                </button>
              </div>
            </div>
            <div className={`feedback-form-autosave-pill ${autoSaveStatus}`}>
              <span>Draft status</span>
              <strong>{autoSaveText}</strong>
            </div>
          </div>

          <div className="feedback-evaluator-review-strip">
            <div className="feedback-evaluator-person-row">
              <div className="feedback-evaluator-avatar large">{initials(assignment.targetEmployeeName)}</div>
              <div>
                <span>Assigned target employee</span>
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
              <strong>{assignment.anonymous ? 'Identity hidden where anonymity applies' : 'Identity visible according to feedback visibility rules'}</strong>
            </div>
          </div>

          {assignment.lifecycleMessage ? (
              <div className={`feedback-evaluator-banner ${assignment.canSubmit ? 'info' : 'warning'}`}>
                {assignment.lifecycleMessage}
              </div>
          ) : null}
          {assignment.autoSubmitNotice ? (
              <div className="feedback-evaluator-banner info feedback-auto-submit-notice">
                {assignment.autoSubmitNotice}
              </div>
          ) : null}
          {draftSavedMessage ? (
              <div className="feedback-evaluator-banner success">{draftSavedMessage}</div>
          ) : null}
          {isDirty && assignment.canSubmit ? (
              <div className="feedback-evaluator-banner info">
                There are unsaved changes in this form. Auto-save will run after a short pause, or use Save draft now.
              </div>
          ) : null}
          {assignment.canSubmit && hasMissingRequiredRatings ? (
              <div className="feedback-evaluator-banner warning">
                Final submission remains unavailable until all required ratings are selected. Use “Missing required only” to finish faster.
              </div>
          ) : null}
          {saveDraftMutation.error instanceof Error ? (
              <div className="feedback-evaluator-banner error">{saveDraftMutation.error.message}</div>
          ) : null}
          {submitMutation.error instanceof Error ? (
              <div className="feedback-evaluator-banner error">{submitMutation.error.message}</div>
          ) : null}

          <form className="feedback-evaluator-stack" onSubmit={onSubmit}>
            <section className={`feedback-rating-scale-panel ${ratingGuideCollapsed ? 'collapsed' : ''}`} aria-label="Rating scale guide">
              <div className="feedback-rating-scale-copy">
                <div>
                  <strong>Rating scale</strong>
                  <span>{ratingGuideCollapsed ? 'Collapsed to reduce form noise.' : 'Select one score from 1 to 5 for each question. The scale appears here once and can be collapsed anytime.'}</span>
                </div>
                <button type="button" onClick={handleRatingGuideToggle}>
                  {ratingGuideCollapsed ? 'Show scale' : 'Hide scale'}
                </button>
              </div>
              {!ratingGuideCollapsed ? (
                  <div className="feedback-rating-scale-list">
                    {RATING_OPTIONS.map((option) => (
                        <div key={option.value} className="feedback-rating-scale-chip">
                          <strong>{option.value}</strong>
                          <span>{option.label}</span>
                        </div>
                    ))}
                  </div>
              ) : null}
            </section>

            <div className="feedback-form-answer-workspace">
              <aside className="feedback-question-nav-card" aria-label="Question navigation">
                <div className="feedback-question-nav-head">
                  <span>Question navigation</span>
                  <strong>{missingRequiredQuestionIds.length} missing</strong>
                </div>
                <div className="feedback-question-nav-list">
                  {flatQuestions.map((question, index) => {
                    const state = getQuestionNavState(index, question.required);
                    return (
                        <button
                            type="button"
                            key={question.id}
                            className={`feedback-question-nav-item ${state}`}
                            onClick={() => scrollToQuestion(question.id)}
                        >
                          <span>Q{question.questionOrder}</span>
                          <strong>{state === 'missing' ? 'Missing' : state === 'answered' ? 'Answered' : 'Optional'}</strong>
                        </button>
                    );
                  })}
                </div>
              </aside>

              <div className="feedback-form-main-column">
                {showMissingOnly && visibleSections.length === 0 ? (
                    <div className="feedback-evaluator-empty feedback-form-missing-empty">
                      <h3>All required questions are complete</h3>
                      <p>Turn off “Missing required only” to review optional questions, comments, and final submission.</p>
                    </div>
                ) : null}

                {visibleSections.map((section) => (
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
                          const selectedOption = RATING_OPTIONS.find((option) => String(option.value) === selectedRating);
                          const responseCommentRegistration = register(`responses.${formIndex}.comment`);
                          return (
                              <article
                                  key={question.id}
                                  id={`feedback-question-${question.id}`}
                                  className={`feedback-question-card feedback-question-card-clean ${missingRequiredSet.has(question.id) ? 'missing-required' : ''}`}
                              >
                                <div className="feedback-question-head feedback-question-head-clean">
                                  <div>
                                    <span>Question {question.questionOrder}{question.required ? ' · Required' : ' · Optional'}</span>
                                    <strong>{question.questionText}</strong>
                                  </div>
                                  <div className={`feedback-question-rating-state ${selectedOption ? 'selected' : ''}`}>
                                    <span>Selected rating</span>
                                    <strong>{selectedOption ? `${selectedOption.value} · ${selectedOption.label}` : 'Not selected yet'}</strong>
                                  </div>
                                </div>

                                <input
                                    type="hidden"
                                    {...register(`responses.${formIndex}.questionId`, {
                                      value: question.id,
                                      valueAsNumber: true,
                                    })}
                                />

                                <div className="feedback-rating-choice-row feedback-rating-choice-row-clean" role="radiogroup" aria-label={`Rating for ${question.questionText}`}>
                                  {RATING_OPTIONS.map((option) => {
                                    const isSelected = selectedRating === String(option.value);
                                    return (
                                        <button
                                            key={option.value}
                                            type="button"
                                            disabled={!assignment.canSubmit || submitting}
                                            className={`feedback-rating-choice feedback-rating-choice-clean ${isSelected ? 'selected' : ''}`}
                                            onClick={() => {
                                              setValue(`responses.${formIndex}.ratingValue`, String(option.value), {
                                                shouldDirty: true,
                                                shouldValidate: true,
                                              });
                                              clearErrors(`responses.${formIndex}.ratingValue`);
                                              setDraftSavedMessage('');
                                            }}
                                            aria-pressed={isSelected}
                                            aria-label={`${option.value} - ${option.label}`}
                                            title={`${option.value} - ${option.label}`}
                                        >
                                          <strong>{option.value}</strong>
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
                                  <span>Supporting comment</span>
                                  {showCommentExamples ? (
                                      <small className="feedback-comment-example">
                                        Example: mention the situation, observed behavior, and impact. Keep it specific and respectful.
                                      </small>
                                  ) : null}
                                  <textarea
                                      disabled={!assignment.canSubmit || submitting}
                                      {...responseCommentRegistration}
                                      placeholder="Add a short example, observation, or supporting context for this rating."
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

                <label className="feedback-question-field feedback-question-field-wide feedback-overall-comments-card">
                  <span>Overall comments</span>
                  {showCommentExamples ? (
                      <small className="feedback-comment-example">
                        Example: summarize key strengths, improvement areas, and one or two useful examples for the target employee.
                      </small>
                  ) : null}
                  <textarea
                      disabled={!assignment.canSubmit || submitting}
                      {...overallCommentsRegistration}
                      placeholder="Summarize key strengths, improvement areas, and any supporting context for this feedback."
                      onChange={(event) => {
                        overallCommentsRegistration.onChange(event);
                        setDraftSavedMessage('');
                      }}
                  />
                </label>

                <div className="feedback-evaluator-actions feedback-evaluator-actions-split feedback-form-sticky-actions">
                  <div className="feedback-form-save-status">
                    <span>{autoSaveText}</span>
                    {isDirty && assignment.canSubmit ? <small>Unsaved changes detected</small> : <small>Changes are up to date</small>}
                  </div>
                  <button
                      className="feedback-evaluator-secondary solid"
                      disabled={!assignment.canSubmit || actionBusy}
                      type="button"
                      onClick={handleSaveDraft}
                  >
                    {draftSaving ? 'Saving draft...' : 'Save draft now'}
                  </button>
                  <button
                      className="feedback-evaluator-primary"
                      disabled={!assignment.canSubmit || actionBusy || hasMissingRequiredRatings}
                      type="submit"
                      title={hasMissingRequiredRatings ? 'Select all required ratings before final submission.' : undefined}
                  >
                    {submitting ? 'Submitting feedback...' : 'Submit final feedback'}
                  </button>
                </div>
              </div>
            </div>
          </form>
        </section>
      </div>
  );
};

export default FeedbackFormPage;
