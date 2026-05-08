interface AppraisalRatingDotsProps {
  value?: number | null;
  max?: number;
  disabled?: boolean;
  onChange?: (value: number) => void;
}

const ratingValues = (max: number) => Array.from({ length: max }, (_, index) => index + 1).reverse();

const AppraisalRatingDots = ({
  value,
  max = 5,
  disabled = false,
  onChange,
}: AppraisalRatingDotsProps) => {
  return (
    <div className="appraisal-rating-scale" aria-label="Rating scale">
      {ratingValues(max).map((rating) => {
        const selected = value === rating;
        const className = `appraisal-rating-dot ${selected ? 'selected' : ''} ${disabled ? 'disabled' : ''}`;

        if (disabled) {
          return (
            <span key={rating} className={className} title={`Rating ${rating}`}>
              {selected ? '✓' : rating}
            </span>
          );
        }

        return (
          <button
            key={rating}
            type="button"
            className={className}
            onClick={() => onChange?.(rating)}
            title={`Set rating ${rating}`}
          >
            {selected ? '✓' : rating}
          </button>
        );
      })}
    </div>
  );
};

export default AppraisalRatingDots;
