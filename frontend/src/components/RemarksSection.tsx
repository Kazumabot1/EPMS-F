import FormInput from './FormInput';
import FormTextarea from './FormTextarea';
import type { AppraisalRemarks } from '../types/appraisal';

type RemarksSectionProps = {
  value: AppraisalRemarks;
  onChange: (name: keyof AppraisalRemarks, value: string) => void;
};

const RemarksSection = ({ value, onChange }: RemarksSectionProps) => (
  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
    <div className="md:col-span-2">
      <FormTextarea
        label="Other Remarks"
        name="otherRemarks"
        value={value.otherRemarks}
        onChange={(name, nextValue) => onChange(name as keyof AppraisalRemarks, nextValue)}
        rows={3}
      />
    </div>
    <div className="md:col-span-2">
      <FormTextarea
        label="Appraiser's Comment for Discussion"
        name="appraiserComment"
        value={value.appraiserComment}
        onChange={(name, nextValue) => onChange(name as keyof AppraisalRemarks, nextValue)}
        rows={3}
      />
    </div>
    <FormInput
      label="Signature of Appraisee"
      name="appraiseeSignature"
      value={value.appraiseeSignature}
      onChange={(name, nextValue) => onChange(name as keyof AppraisalRemarks, nextValue)}
    />
    <FormInput
      label="Appraisee Date"
      name="appraiseeSignedDate"
      type="date"
      value={value.appraiseeSignedDate}
      onChange={(name, nextValue) => onChange(name as keyof AppraisalRemarks, nextValue)}
    />
    <FormInput
      label="Signature of Appraiser"
      name="appraiserSignature"
      value={value.appraiserSignature}
      onChange={(name, nextValue) => onChange(name as keyof AppraisalRemarks, nextValue)}
    />
    <FormInput
      label="Appraiser Date"
      name="appraiserSignedDate"
      type="date"
      value={value.appraiserSignedDate}
      onChange={(name, nextValue) => onChange(name as keyof AppraisalRemarks, nextValue)}
    />
    <FormInput
      label="Review By"
      name="reviewedBy"
      value={value.reviewedBy}
      onChange={(name, nextValue) => onChange(name as keyof AppraisalRemarks, nextValue)}
    />
    <div />
    <FormInput
      label="HR Signature"
      name="hrSignature"
      value={value.hrSignature}
      onChange={(name, nextValue) => onChange(name as keyof AppraisalRemarks, nextValue)}
    />
    <FormInput
      label="HR Date"
      name="hrSignedDate"
      type="date"
      value={value.hrSignedDate}
      onChange={(name, nextValue) => onChange(name as keyof AppraisalRemarks, nextValue)}
    />
    <FormInput
      label="HR Designation"
      name="hrDesignation"
      value={value.hrDesignation}
      onChange={(name, nextValue) => onChange(name as keyof AppraisalRemarks, nextValue)}
    />
  </div>
);

export default RemarksSection;
