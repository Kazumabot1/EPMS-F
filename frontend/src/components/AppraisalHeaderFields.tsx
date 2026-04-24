import type { AppraisalMeta } from '../types/appraisal';
import FormInput from './FormInput';

type AppraisalHeaderFieldsProps = {
  value: AppraisalMeta;
  errors: Partial<Record<keyof AppraisalMeta, string>>;
  onChange: (name: keyof AppraisalMeta, value: string) => void;
};

const AppraisalHeaderFields = ({ value, errors, onChange }: AppraisalHeaderFieldsProps) => (
  <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
    <FormInput
      label="Employee Name"
      name="employeeName"
      value={value.employeeName}
      onChange={(n, v) => onChange(n as keyof AppraisalMeta, v)}
      required
      error={errors.employeeName}
    />
    <FormInput
      label="Employee ID"
      name="employeeId"
      value={value.employeeId}
      onChange={(n, v) => onChange(n as keyof AppraisalMeta, v)}
      required
      error={errors.employeeId}
    />
    <FormInput
      label="Current Position"
      name="currentPosition"
      value={value.currentPosition}
      onChange={(n, v) => onChange(n as keyof AppraisalMeta, v)}
      required
      error={errors.currentPosition}
    />
    <FormInput
      label="Department"
      name="department"
      value={value.department}
      onChange={(n, v) => onChange(n as keyof AppraisalMeta, v)}
      required
      error={errors.department}
    />
    <FormInput
      label="Assessment Date"
      name="assessmentDate"
      type="date"
      value={value.assessmentDate}
      onChange={(n, v) => onChange(n as keyof AppraisalMeta, v)}
      required
      error={errors.assessmentDate}
    />
    <FormInput
      label="Effective Date"
      name="effectiveDate"
      type="date"
      value={value.effectiveDate}
      onChange={(n, v) => onChange(n as keyof AppraisalMeta, v)}
      required
      error={errors.effectiveDate}
    />
  </div>
);

export default AppraisalHeaderFields;