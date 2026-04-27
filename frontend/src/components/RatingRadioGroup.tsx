import type { RatingValue } from '../types/appraisal';

type RatingRadioGroupProps = {
  name: string;
  value: RatingValue | null;
  onChange: (value: RatingValue) => void;
};

const ratingValues: RatingValue[] = [5, 4, 3, 2, 1];

const RatingRadioGroup = ({ name, value, onChange }: RatingRadioGroupProps) => (
  <div className="flex items-center gap-2">
    {ratingValues.map((rating) => (
      <label
        key={`${name}-${rating}`}
        className={`inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border text-xs font-semibold transition ${
          value === rating
            ? 'border-blue-600 bg-blue-600 text-white'
            : 'border-slate-300 bg-white text-slate-700 hover:border-blue-400'
        }`}
      >
        <input
          type="radio"
          name={name}
          value={rating}
          checked={value === rating}
          onChange={() => onChange(rating)}
          className="sr-only"
        />
        {rating}
      </label>
    ))}
  </div>
);

export default RatingRadioGroup;
