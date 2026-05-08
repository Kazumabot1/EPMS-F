import { useEffect, useMemo, useState } from 'react';
import type {
  AppraisalRatingInput,
  AppraisalReviewResponse,
  AppraisalReviewSubmitRequest,
  EmployeeAppraisalFormResponse,
  PmAppraisalSubmitRequest,
} from '../../types/appraisal';
import AppraisalRatingDots from './AppraisalRatingDots';
import '../../pages/appraisal/appraisal.css';

type AppraisalFormMode = 'pm' | 'dept-head' | 'hr' | 'employee' | 'readonly';

interface AppraisalFormViewProps {
  form: EmployeeAppraisalFormResponse;
  mode: AppraisalFormMode;
  busy?: boolean;
  onPmSubmit?: (payload: PmAppraisalSubmitRequest) => Promise<void> | void;
  onReviewSubmit?: (payload: AppraisalReviewSubmitRequest) => Promise<void> | void;
  onReturnToPm?: (note: string) => Promise<void> | void;
}

const findReview = (reviews: AppraisalReviewResponse[], stage: AppraisalReviewResponse['reviewStage']) =>
  reviews.find((review) => review.reviewStage === stage);

const formatPercent = (value?: number | null) => {
  if (value === undefined || value === null || Number.isNaN(value)) return '-';
  return `${Math.round(value)}%`;
};

const AppraisalFormView = ({
  form,
  mode,
  busy = false,
  onPmSubmit,
  onReviewSubmit,
  onReturnToPm,
}: AppraisalFormViewProps) => {
  const [ratings, setRatings] = useState<Record<number, number>>({});
  const [ratingComments, setRatingComments] = useState<Record<number, string>>({});
  const [recommendation, setRecommendation] = useState('');
  const [comment, setComment] = useState('');
  const [returnNote, setReturnNote] = useState('');

  const pmReview = useMemo(() => findReview(form.reviews ?? [], 'PM'), [form.reviews]);
  const deptHeadReview = useMemo(() => findReview(form.reviews ?? [], 'DEPT_HEAD'), [form.reviews]);
  const hrReview = useMemo(() => findReview(form.reviews ?? [], 'HR'), [form.reviews]);

  useEffect(() => {
    const nextRatings: Record<number, number> = {};
    const nextComments: Record<number, string> = {};

    form.sections.forEach((section) => {
      section.criteria.forEach((criteria) => {
        if (criteria.ratingValue) nextRatings[criteria.id] = criteria.ratingValue;
        if (criteria.ratingComment) nextComments[criteria.id] = criteria.ratingComment;
      });
    });

    setRatings(nextRatings);
    setRatingComments(nextComments);
    setRecommendation('');
    setComment('');
    setReturnNote('');
  }, [form]);

  const allCriteria = useMemo(
    () => form.sections.flatMap((section) => section.criteria),
    [form.sections],
  );

  const missingRatingCount = allCriteria.filter((criteria) => !ratings[criteria.id]).length;
  const canSubmitPm = mode === 'pm' && missingRatingCount === 0 && recommendation.trim().length > 0;
  const canSubmitReview = (mode === 'dept-head' || mode === 'hr') && recommendation.trim().length > 0;

  const submitPm = async () => {
    if (!onPmSubmit) return;

    const payload: PmAppraisalSubmitRequest = {
      ratings: allCriteria.map<AppraisalRatingInput>((criteria) => ({
        criteriaId: criteria.id,
        ratingValue: ratings[criteria.id],
        comment: ratingComments[criteria.id] ?? '',
      })),
      recommendation: recommendation.trim(),
      comment: comment.trim(),
    };

    await onPmSubmit(payload);
  };

  const submitReview = async () => {
    if (!onReviewSubmit) return;
    await onReviewSubmit({ recommendation: recommendation.trim(), comment: comment.trim() });
  };

  return (
    <div className="appraisal-card">
      <div className="appraisal-template-banner">
        <h2>{form.cycleName}</h2>
        <p>
          {form.employeeName} {form.employeeCode ? `(${form.employeeCode})` : ''} - {form.departmentName}
        </p>
      </div>

      <div className="appraisal-inline-grid">
        <div className="appraisal-review-block">
          <h4>Employee Information</h4>
          <p><strong>Name:</strong> {form.employeeName}</p>
          <p><strong>Position:</strong> {form.positionName || '-'}</p>
          <p><strong>Department:</strong> {form.departmentName}</p>
          <p><strong>Status:</strong> <span className="appraisal-status">{form.status}</span></p>
          <p><strong>Start Date:</strong> {form.assessmentDate || '-'}</p>
          <p><strong>End Date:</strong> {form.effectiveDate || '-'}</p>
        </div>

        <div className="appraisal-review-block">
          <h4>Score Summary</h4>
          <p><strong>Total Points:</strong> {form.totalPoints ?? '-'}</p>
          <p><strong>Answered Criteria:</strong> {form.answeredCriteriaCount ?? '-'}</p>
          <p><strong>Score:</strong> {formatPercent(form.scorePercent)}</p>
          <p><strong>Performance:</strong> {form.performanceLabel || '-'}</p>
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        {form.sections.map((section) => (
          <section key={section.id} className="appraisal-section-card">
            <div className="appraisal-section-header">
              <strong>{section.sectionName}</strong>
              <span className="appraisal-muted">{section.criteria.length} criteria</span>
            </div>

            {section.criteria.map((criteria, index) => (
              <div key={criteria.id} className="appraisal-criteria-row">
                <strong>{index + 1}</strong>
                <div>
                  <strong>{criteria.criteriaText}</strong>
                  {criteria.description && <p className="appraisal-muted">{criteria.description}</p>}
                </div>
                <label className="appraisal-field">
                  <span>Comment</span>
                  {mode === 'pm' ? (
                    <input
                      value={ratingComments[criteria.id] ?? ''}
                      onChange={(event) =>
                        setRatingComments((previous) => ({ ...previous, [criteria.id]: event.target.value }))
                      }
                      placeholder="Optional"
                    />
                  ) : (
                    <span className="appraisal-muted">{criteria.ratingComment || '-'}</span>
                  )}
                </label>
                <AppraisalRatingDots
                  value={ratings[criteria.id] ?? criteria.ratingValue ?? null}
                  max={criteria.maxRating || 5}
                  disabled={mode !== 'pm'}
                  onChange={(value) => setRatings((previous) => ({ ...previous, [criteria.id]: value }))}
                />
                <span />
              </div>
            ))}
          </section>
        ))}
      </div>

      <div className="appraisal-inline-grid">
        <ReviewBlock title="PM Review" review={pmReview} />
        <ReviewBlock title="Dept Head Review" review={deptHeadReview} />
      </div>
      <ReviewBlock title="HR Review" review={hrReview} />

      {(mode === 'pm' || mode === 'dept-head' || mode === 'hr') && (
        <div className="appraisal-review-block">
          <h4>{mode === 'pm' ? 'PM Recommendation' : mode === 'dept-head' ? 'Dept Head Recommendation' : 'HR Final Check'}</h4>
          <label className="appraisal-field">
            <span>Recommendation</span>
            <textarea
              rows={3}
              value={recommendation}
              onChange={(event) => setRecommendation(event.target.value)}
              placeholder="Enter recommendation"
            />
          </label>
          <label className="appraisal-field">
            <span>Comment</span>
            <textarea
              rows={3}
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              placeholder="Enter comment"
            />
          </label>

          <div className="appraisal-button-row">
            {mode === 'pm' && (
              <button className="appraisal-button primary" type="button" disabled={busy || !canSubmitPm} onClick={submitPm}>
                Submit to Dept Head
              </button>
            )}
            {(mode === 'dept-head' || mode === 'hr') && onReturnToPm && (
              <>
                <input
                  aria-label="Return note"
                  value={returnNote}
                  onChange={(event) => setReturnNote(event.target.value)}
                  placeholder="Return note"
                  style={{ minWidth: 240 }}
                />
                <button
                  className="appraisal-button warning"
                  type="button"
                  disabled={busy || returnNote.trim().length === 0}
                  onClick={() => onReturnToPm(returnNote.trim())}
                >
                  Return to PM
                </button>
              </>
            )}
            {(mode === 'dept-head' || mode === 'hr') && (
              <button className="appraisal-button success" type="button" disabled={busy || !canSubmitReview} onClick={submitReview}>
                {mode === 'dept-head' ? 'Approve to HR' : 'Approve Completed'}
              </button>
            )}
          </div>

          {mode === 'pm' && missingRatingCount > 0 && (
            <p className="appraisal-muted">Please select ratings for all criteria. Missing: {missingRatingCount}</p>
          )}
        </div>
      )}
    </div>
  );
};

interface ReviewBlockProps {
  title: string;
  review?: AppraisalReviewResponse;
}

const ReviewBlock = ({ title, review }: ReviewBlockProps) => (
  <div className="appraisal-review-block">
    <h4>{title}</h4>
    {review ? (
      <>
        <p><strong>Reviewer:</strong> {review.reviewerName || '-'}</p>
        <p><strong>Decision:</strong> {review.decision || '-'}</p>
        <p><strong>Recommendation:</strong> {review.recommendation || '-'}</p>
        <p><strong>Comment:</strong> {review.comment || '-'}</p>
      </>
    ) : (
      <p className="appraisal-muted">No review submitted yet.</p>
    )}
  </div>
);

export default AppraisalFormView;
