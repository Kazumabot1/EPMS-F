import { useState } from 'react';
import toast from 'react-hot-toast';
import {
  formatDateForInput,
  isEmployeeActive,
  parseApiError,
  resendTemporaryPasswordEmail,
  type EmployeeResponse,
} from '../../services/employeeService';

type Props = {
  open: boolean;
  employee: EmployeeResponse | null;
  onClose: () => void;
  onEdit: () => void;
};

const display = (v: string | null | undefined) => (v && v.trim() !== '' ? v : '—');

const EmployeeViewModal = ({ open, employee, onClose, onEdit }: Props) => {
  const [resendBusy, setResendBusy] = useState(false);

  if (!open || !employee) {
    return null;
  }

  const active = isEmployeeActive(employee);
  const initials = [employee.firstName, employee.lastName]
    .filter(Boolean)
    .map((s) => s!.charAt(0).toUpperCase())
    .join('')
    .slice(0, 2);

  return (
    <div className="epms-emp-modal-overlay" role="presentation" onClick={onClose}>
      <div
        className="epms-emp-modal epms-emp-modal--view max-w-lg"
        role="dialog"
        aria-modal="true"
        aria-labelledby="emp-view-title"
        onClick={(ev) => ev.stopPropagation()}
      >
        <div className="epms-emp-modal__accent" />
        <div className="epms-emp-modal__head">
          <h2 id="emp-view-title" className="epms-emp-modal__title">
            Employee details
          </h2>
          <button type="button" className="epms-emp-modal__close" onClick={onClose} aria-label="Close">
            <i className="bi bi-x-lg" aria-hidden />
          </button>
        </div>

        <div className="epms-emp-view-profile">
          <div
            className={`epms-emp-view-avatar-lg mx-auto ${!active ? 'epms-emp-view-avatar-lg--inactive' : ''}`}
            aria-hidden
          >
            {initials || '?'}
          </div>
          <p className="mb-0 text-lg font-bold text-slate-900">
            {employee.fullName?.trim() ||
              [employee.firstName, employee.lastName].filter(Boolean).join(' ') ||
              '—'}
          </p>
          <p className="mt-1 text-sm text-slate-500">ID #{employee.id}</p>
          <span
            className={`epms-emp-badge mt-2 ${active ? 'epms-emp-badge--on' : 'epms-emp-badge--off'}`}
          >
            {active ? 'Active' : 'Inactive'}
          </span>
        </div>

        <div className="epms-emp-form-body max-h-[60vh] overflow-y-auto px-4 pb-4">
          <dl className="epms-emp-dl epms-emp-dl-2">
            <div>
              <dt>Phone</dt>
              <dd>{display(employee.phoneNumber)}</dd>
            </div>
            <div>
              <dt>Staff NRC</dt>
              <dd>{display(employee.staffNrc)}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt>Work email</dt>
              <dd>{display(employee.email)}</dd>
            </div>
            <div>
              <dt>Gender</dt>
              <dd>{display(employee.gender)}</dd>
            </div>
            <div>
              <dt>Date of birth</dt>
              <dd>
                {employee.dateOfBirth
                  ? formatDateForInput(employee.dateOfBirth)
                  : '—'}
              </dd>
            </div>
            <div>
              <dt>Race</dt>
              <dd>{display(employee.race)}</dd>
            </div>
            <div>
              <dt>Religion</dt>
              <dd>{display(employee.religion)}</dd>
            </div>
            <div>
              <dt>Marital status</dt>
              <dd>{display(employee.maritalStatus)}</dd>
            </div>
            <div>
              <dt>Position</dt>
              <dd>
                {employee.positionTitle
                  ? `${employee.positionTitle}${employee.positionLevelCode ? ` (${employee.positionLevelCode})` : ''}`
                  : '—'}
              </dd>
            </div>
            <div>
              <dt>Department</dt>
              <dd>{display(employee.currentDepartment ?? employee.parentDepartment)}</dd>
            </div>
          </dl>

          {employee.userId != null && employee.userId !== undefined && employee.email?.trim() ? (
            <div className="epms-emp-form-section">
              <h3>
                <i className="bi bi-envelope-check" aria-hidden />
                Onboarding email
              </h3>
              <p className="text-sm text-slate-600">
                Resend the temporary password message after fixing SMTP (use a Google App Password for the sender
                account).
              </p>
              <button
                type="button"
                className="epms-emp-btn epms-emp-btn--import mt-2"
                disabled={resendBusy}
                onClick={() => {
                  void (async () => {
                    try {
                      setResendBusy(true);
                      const r = await resendTemporaryPasswordEmail(employee.userId!);
                      if (r.success) {
                        toast.success(r.message || 'Onboarding email was accepted for delivery.');
                      } else {
                        const smtp = r.smtpErrorDetail?.trim();
                        toast.error(
                          [r.message, smtp].filter(Boolean).join(' ') ||
                            'Email could not be sent. Check SMTP credentials.'
                        );
                      }
                    } catch (e) {
                      toast.error(parseApiError(e));
                    } finally {
                      setResendBusy(false);
                    }
                  })();
                }}
              >
                {resendBusy ? (
                  <>
                    <span
                      className="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700"
                      aria-hidden
                    />
                    Sending…
                  </>
                ) : (
                  <>
                    <i className="bi bi-send" aria-hidden />
                    Resend onboarding email
                  </>
                )}
              </button>
            </div>
          ) : null}

          <div className="epms-emp-form-section">
            <h3>
              <i className="bi bi-geo-alt" aria-hidden />
              Addresses
            </h3>
            <dl className="epms-emp-dl">
              <div>
                <dt>Contact</dt>
                <dd>{display(employee.contactAddress)}</dd>
              </div>
              <div>
                <dt>Permanent</dt>
                <dd>{display(employee.permanentAddress)}</dd>
              </div>
            </dl>
          </div>

          <div className="epms-emp-form-section">
            <h3>
              <i className="bi bi-people" aria-hidden />
              Family
            </h3>
            <dl className="epms-emp-dl epms-emp-dl-2">
              <div>
                <dt>Spouse</dt>
                <dd>{display(employee.spouseName)}</dd>
              </div>
              <div>
                <dt>Spouse NRC</dt>
                <dd>{display(employee.spouseNrc)}</dd>
              </div>
              <div>
                <dt>Father</dt>
                <dd>{display(employee.fatherName)}</dd>
              </div>
              <div>
                <dt>Father NRC</dt>
                <dd>{display(employee.fatherNrc)}</dd>
              </div>
            </dl>
          </div>
        </div>

        <div className="epms-emp-form-footer">
          <button type="button" className="epms-emp-btn epms-emp-btn--ghost" onClick={onClose}>
            Close
          </button>
          <button type="button" className="epms-emp-btn epms-emp-btn--primary" onClick={onEdit}>
            <i className="bi bi-pencil-square" aria-hidden />
            Edit
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmployeeViewModal;
