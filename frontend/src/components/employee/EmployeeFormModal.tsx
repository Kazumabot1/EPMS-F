/*
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import { fetchDepartments, type Department } from '../../services/departmentService';
import { positionService } from '../../services/positionService';
import type { PositionResponse } from '../../types/position';
import {
  createEmployee,
  responseToFormDefaults,
  updateEmployee,
  parseApiError,
  type EmployeeResponse,
} from '../../services/employeeService';
import {
  defaultEmployeeFormValues,
  employeeFormSchema,
  formValuesToPayload,
  type EmployeeFormValues,
} from './employeeFormSchema';

type Props = {
  open: boolean;
  mode: 'create' | 'edit';
  employee: EmployeeResponse | null;
  onClose: () => void;
  onSaved: () => void;
};

const EmployeeFormModal = ({ open, mode, employee, onClose, onSaved }: Props) => {
  const [positions, setPositions] = useState<PositionResponse[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [orgPickersLoading, setOrgPickersLoading] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeFormSchema),
    defaultValues: defaultEmployeeFormValues,
  });

  useEffect(() => {
    if (!open) {
      return;
    }
    if (mode === 'edit' && employee) {
      reset(responseToFormDefaults(employee));
    } else {
      reset(defaultEmployeeFormValues);
    }
  }, [open, mode, employee, reset]);

  useEffect(() => {
    if (!open) {
      return;
    }
    let cancelled = false;
    setOrgPickersLoading(true);
    Promise.all([positionService.getPositions(), fetchDepartments()])
      .then(([posList, deptList]) => {
        if (!cancelled) {
          setPositions(posList.filter((p) => p.status !== false));
          setDepartments(deptList);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPositions([]);
          setDepartments([]);
          toast.error('Could not load positions or departments.');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setOrgPickersLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  if (!open) {
    return null;
  }

  const onSubmit = async (values: EmployeeFormValues) => {
    const payload = formValuesToPayload(values);
    try {
      if (mode === 'create') {
        const res = await createEmployee(payload);
        if (res.accountProvisioningMessage) {
          const smtp = res.accountProvisioningSmtpError?.trim();
          const detail = `${res.accountProvisioningMessage}${
            smtp && !res.accountProvisioningMessage.includes(smtp) ? ` ${smtp}` : ''
          }`;
          const accountOkButEmailFailed =
            res.accountProvisioningSuccess === true && Boolean(smtp);

          if (accountOkButEmailFailed) {
            toast(
              <div className="text-left text-sm text-slate-800">
                <p className="mb-1 font-semibold text-amber-900">Employee saved — email not delivered</p>
                <p>
                  Account was created, but email delivery failed. Please check SMTP credentials or resend later.
                </p>
                {smtp ? <p className="mt-1 text-slate-600">{smtp}</p> : null}
                <p className="mt-2 text-xs text-slate-600">
                  Fix <code className="rounded bg-slate-100 px-1">SMTP_USER</code> and{' '}
                  <code className="rounded bg-slate-100 px-1">SMTP_PASS</code> (Google App Password), restart the API, then
                  use <code className="rounded bg-slate-100 px-1">POST /api/mail/test</code> or resend from the employee
                  view.
                </p>
              </div>,
              { icon: '⚠️', duration: 14_000, id: 'provision-mail' }
            );
          } else if (res.accountProvisioningSuccess === false && smtp) {
            toast(
              <div className="text-left text-sm text-slate-800">
                <p className="mb-1 font-semibold text-amber-900">Employee saved — email not sent</p>
                <p>{detail}</p>
                <p className="mt-2 text-xs text-slate-600">
                  Set <code className="rounded bg-slate-100 px-1">SMTP_USER</code> and{' '}
                  <code className="rounded bg-slate-100 px-1">SMTP_PASS</code> (Google App Password), restart the API, then
                  resend or use <code className="rounded bg-slate-100 px-1">POST /api/mail/test</code>.
                </p>
              </div>,
              { icon: '⚠️', duration: 12_000, id: 'provision-mail' }
            );
          } else if (res.accountProvisioningSuccess === false) {
            toast.error(detail);
          } else {
            toast.success(`Employee created. ${detail}`);
          }
        } else {
          toast.success('Employee created');
        }
      } else if (employee) {
        const res = await updateEmployee(employee.id, payload);
        if (res.accountProvisioningMessage) {
          const smtp = res.accountProvisioningSmtpError?.trim();
          const detail = `${res.accountProvisioningMessage}${
            smtp && !res.accountProvisioningMessage.includes(smtp) ? ` ${smtp}` : ''
          }`;
          const accountOkButEmailFailed =
            res.accountProvisioningSuccess === true && Boolean(smtp);

          if (accountOkButEmailFailed) {
            toast(
              <div className="text-left text-sm text-slate-800">
                <p className="mb-1 font-semibold text-amber-900">Employee updated — email not delivered</p>
                <p>
                  Account was updated, but email delivery failed. Please check SMTP credentials or resend later.
                </p>
                {smtp ? <p className="mt-1 text-slate-600">{smtp}</p> : null}
                <p className="mt-2 text-xs text-slate-600">
                  Fix <code className="rounded bg-slate-100 px-1">SMTP_USER</code> and{' '}
                  <code className="rounded bg-slate-100 px-1">SMTP_PASS</code>, restart the API, then use resend on the
                  employee or <code className="rounded bg-slate-100 px-1">POST /api/mail/test</code>.
                </p>
              </div>,
              { icon: '⚠️', duration: 14_000, id: 'provision-mail-update' }
            );
          } else if (res.accountProvisioningSuccess === false && smtp) {
            toast(
              <div className="text-left text-sm text-slate-800">
                <p className="mb-1 font-semibold text-amber-900">Employee updated — email not sent</p>
                <p>{detail}</p>
                <p className="mt-2 text-xs text-slate-600">
                  Check <code className="rounded bg-slate-100 px-1">SMTP_USER</code> /{' '}
                  <code className="rounded bg-slate-100 px-1">SMTP_PASS</code> and restart the backend.
                </p>
              </div>,
              { icon: '⚠️', duration: 12_000, id: 'provision-mail-update' }
            );
          } else if (res.accountProvisioningSuccess === false) {
            toast.error(detail);
          } else {
            toast.success(`Employee updated. ${detail}`);
          }
        } else {
          toast.success('Employee updated');
        }
      }
      onSaved();
      onClose();
    } catch (e) {
      toast.error(parseApiError(e));
    }
  };

  return (
    <div className="epms-emp-modal-overlay" role="presentation" onClick={onClose}>
      <div
        className="epms-emp-modal epms-emp-modal--wide"
        role="dialog"
        aria-modal="true"
        aria-labelledby="emp-form-title"
        onClick={(ev) => ev.stopPropagation()}
      >
        <div className="epms-emp-modal__accent" />
        <div className="epms-emp-modal__head">
          <h2 id="emp-form-title" className="epms-emp-modal__title">
            {mode === 'create' ? 'Add employee' : 'Edit employee'}
          </h2>
          <button type="button" className="epms-emp-modal__close" onClick={onClose} aria-label="Close">
            <i className="bi bi-x-lg" aria-hidden />
          </button>
        </div>

        <form className="epms-emp-form" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="epms-emp-form-body">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="epms-emp-field block">
                <span className="epms-emp-field__label">
                  First name <span className="text-red-600">*</span>
                </span>
                <input
                  className="epms-emp-input-field"
                  autoComplete="given-name"
                  {...register('firstName')}
                />
                {errors.firstName && (
                  <p className="mt-1 text-xs text-red-600">{errors.firstName.message}</p>
                )}
              </label>
              <label className="epms-emp-field block">
                <span className="epms-emp-field__label">
                  Last name <span className="text-red-600">*</span>
                </span>
                <input
                  className="epms-emp-input-field"
                  autoComplete="family-name"
                  {...register('lastName')}
                />
                {errors.lastName && (
                  <p className="mt-1 text-xs text-red-600">{errors.lastName.message}</p>
                )}
              </label>
            </div>

            <div className="mt-1 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="epms-emp-field block">
                <span className="epms-emp-field__label">Position</span>
                <select
                  className="epms-emp-input-field"
                  disabled={orgPickersLoading}
                  {...register('positionId')}
                >
                  <option value="">
                    {orgPickersLoading ? 'Loading…' : '—'}
                  </option>
                  {positions.map((p) => (
                    <option key={p.id} value={String(p.id)}>
                      {p.positionTitle}
                      {p.levelCode ? ` (${p.levelCode})` : ''}
                    </option>
                  ))}
                </select>
              </label>
              <label className="epms-emp-field block">
                <span className="epms-emp-field__label">Department</span>
                <select
                  className="epms-emp-input-field"
                  disabled={orgPickersLoading}
                  {...register('departmentId')}
                >
                  <option value="">
                    {orgPickersLoading ? 'Loading…' : '—'}
                  </option>
                  {departments.map((d) => (
                    <option key={d.id} value={String(d.id)}>
                      {d.departmentName}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="epms-emp-form-section">
              <h3>
                <i className="bi bi-person-vcard" aria-hidden />
                Contact &amp; identity
              </h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="epms-emp-field block">
                  <span className="epms-emp-field__label">Phone</span>
                  <input className="epms-emp-input-field" type="tel" {...register('phoneNumber')} />
                </label>
                <label className="epms-emp-field block">
                  <span className="epms-emp-field__label">Work email</span>
                  <input className="epms-emp-input-field" type="email" {...register('email')} />
                  {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
                </label>
                <label className="epms-emp-field block">
                  <span className="epms-emp-field__label">Staff NRC</span>
                  <input className="epms-emp-input-field" {...register('staffNrc')} />
                </label>
                <label className="epms-emp-field block">
                  <span className="epms-emp-field__label">Gender</span>
                  <select className="epms-emp-input-field" {...register('gender')}>
                    <option value="">—</option>
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="OTHER">Other</option>
                  </select>
                </label>
                <label className="epms-emp-field block">
                  <span className="epms-emp-field__label">Date of birth</span>
                  <input className="epms-emp-input-field" type="date" {...register('dateOfBirth')} />
                </label>
              </div>
              <div className="mt-3 flex flex-col gap-2">
                <label className="text-sm text-slate-700">
                  <input type="checkbox" className="mr-2" {...register('createLoginAccount')} />
                  Create login account automatically when email is provided
                </label>
                <label className="text-sm text-slate-700">
                  <input type="checkbox" className="mr-2" {...register('sendTemporaryPasswordEmail')} />
                  Send temporary password onboarding email
                </label>
              </div>
            </div>

            <div className="epms-emp-form-section">
              <h3>
                <i className="bi bi-globe2" aria-hidden />
                Background
              </h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="epms-emp-field block">
                  <span className="epms-emp-field__label">Race</span>
                  <input className="epms-emp-input-field" {...register('race')} />
                </label>
                <label className="epms-emp-field block">
                  <span className="epms-emp-field__label">Religion</span>
                  <input className="epms-emp-input-field" {...register('religion')} />
                </label>
                <label className="epms-emp-field col-span-1 sm:col-span-2 block">
                  <span className="epms-emp-field__label">Contact address</span>
                  <textarea className="epms-emp-input-field min-h-[72px]" rows={2} {...register('contactAddress')} />
                </label>
                <label className="epms-emp-field col-span-1 sm:col-span-2 block">
                  <span className="epms-emp-field__label">Permanent address</span>
                  <textarea className="epms-emp-input-field min-h-[72px]" rows={2} {...register('permanentAddress')} />
                </label>
              </div>
            </div>

            <div className="epms-emp-form-section">
              <h3>
                <i className="bi bi-people" aria-hidden />
                Family
              </h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="epms-emp-field block">
                  <span className="epms-emp-field__label">Marital status</span>
                  <input className="epms-emp-input-field" {...register('maritalStatus')} />
                </label>
                <div className="hidden sm:block" aria-hidden />
                <label className="epms-emp-field block">
                  <span className="epms-emp-field__label">Spouse name</span>
                  <input className="epms-emp-input-field" {...register('spouseName')} />
                </label>
                <label className="epms-emp-field block">
                  <span className="epms-emp-field__label">Spouse NRC</span>
                  <input className="epms-emp-input-field" {...register('spouseNrc')} />
                </label>
                <label className="epms-emp-field block">
                  <span className="epms-emp-field__label">Father name</span>
                  <input className="epms-emp-input-field" {...register('fatherName')} />
                </label>
                <label className="epms-emp-field block">
                  <span className="epms-emp-field__label">Father NRC</span>
                  <input className="epms-emp-input-field" {...register('fatherNrc')} />
                </label>
              </div>
            </div>
          </div>

          <div className="epms-emp-form-footer">
            <button type="button" className="epms-emp-btn epms-emp-btn--ghost" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="epms-emp-btn epms-emp-btn--primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <i className="bi bi-hourglass-split" aria-hidden />
                  Saving…
                </>
              ) : mode === 'create' ? (
                <>
                  <i className="bi bi-check-lg" aria-hidden />
                  Create
                </>
              ) : (
                <>
                  <i className="bi bi-save" aria-hidden />
                  Save changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EmployeeFormModal;
 */










import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import { fetchDepartments, type Department } from '../../services/departmentService';
import { positionService } from '../../services/positionService';
import type { PositionResponse } from '../../types/position';
import {
  createEmployee,
  responseToFormDefaults,
  updateEmployee,
  previewEmployeeDepartmentTransfer,
  parseApiError,
  type EmployeeDepartmentTransferPreview,
  type EmployeeResponse,
} from '../../services/employeeService';
import {
  defaultEmployeeFormValues,
  employeeFormSchema,
  formValuesToPayload,
  type EmployeeFormValues,
} from './employeeFormSchema';

type Props = {
  open: boolean;
  mode: 'create' | 'edit';
  employee: EmployeeResponse | null;
  onClose: () => void;
  onSaved: () => void;
};

const toNullableNumber = (value?: string | null): number | null => {
  if (!value || value === '') {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
};

const EmployeeFormModal = ({ open, mode, employee, onClose, onSaved }: Props) => {
  const [positions, setPositions] = useState<PositionResponse[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [orgPickersLoading, setOrgPickersLoading] = useState(false);

  const [transferPreview, setTransferPreview] =
    useState<EmployeeDepartmentTransferPreview | null>(null);
  const [pendingValues, setPendingValues] = useState<EmployeeFormValues | null>(null);
  const [selectedTransferTeamId, setSelectedTransferTeamId] = useState('');
  const [confirmSaving, setConfirmSaving] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeFormSchema),
    defaultValues: defaultEmployeeFormValues,
  });

  const selectedCurrentDepartmentId = watch('currentDepartmentId');
  const selectedParentDepartmentId = watch('parentDepartmentId');

  const parentDepartmentOptions = useMemo(() => {
    return departments.filter(
      (dept) => String(dept.id) !== String(selectedCurrentDepartmentId || '')
    );
  }, [departments, selectedCurrentDepartmentId]);

  useEffect(() => {
    if (!open) {
      return;
    }

    setTransferPreview(null);
    setPendingValues(null);
    setSelectedTransferTeamId('');

    if (mode === 'edit' && employee) {
      reset(responseToFormDefaults(employee));
    } else {
      reset(defaultEmployeeFormValues);
    }
  }, [open, mode, employee, reset]);

  useEffect(() => {
    if (!open) {
      return;
    }

    let cancelled = false;
    setOrgPickersLoading(true);

    Promise.all([positionService.getPositions(), fetchDepartments()])
      .then(([posList, deptList]) => {
        if (!cancelled) {
          setPositions(posList.filter((p) => p.status !== false));
          setDepartments(deptList);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPositions([]);
          setDepartments([]);
          toast.error('Could not load positions or departments.');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setOrgPickersLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    setValue('departmentId', selectedCurrentDepartmentId || '');

    if (
      selectedCurrentDepartmentId &&
      selectedParentDepartmentId &&
      selectedCurrentDepartmentId === selectedParentDepartmentId
    ) {
      setValue('parentDepartmentId', '');
    }
  }, [selectedCurrentDepartmentId, selectedParentDepartmentId, setValue]);

  if (!open) {
    return null;
  }

  const closeModal = () => {
    setTransferPreview(null);
    setPendingValues(null);
    setSelectedTransferTeamId('');
    onClose();
  };

  const showProvisionToast = (
    action: 'created' | 'updated',
    res: EmployeeResponse
  ) => {
    if (!res.accountProvisioningMessage) {
      toast.success(`Employee ${action}`);
      return;
    }

    const smtp = res.accountProvisioningSmtpError?.trim();
    const detail = `${res.accountProvisioningMessage}${
      smtp && !res.accountProvisioningMessage.includes(smtp) ? ` ${smtp}` : ''
    }`;

    const accountOkButEmailFailed = res.accountProvisioningSuccess === true && Boolean(smtp);

    if (accountOkButEmailFailed) {
      toast(
        <div className="text-left text-sm text-slate-800">
          <p className="mb-1 font-semibold text-amber-900">
            Employee {action} — email not delivered
          </p>
          <p>
            Account was saved, but email delivery failed. Please check SMTP credentials or resend
            later.
          </p>
          {smtp ? <p className="mt-1 text-slate-600">{smtp}</p> : null}
          <p className="mt-2 text-xs text-slate-600">
            Fix <code className="rounded bg-slate-100 px-1">SMTP_USER</code> and{' '}
            <code className="rounded bg-slate-100 px-1">SMTP_PASS</code>, restart the API, then
            resend from the employee view.
          </p>
        </div>,
        { icon: '⚠️', duration: 14_000, id: `provision-mail-${action}` }
      );
      return;
    }

    if (res.accountProvisioningSuccess === false && smtp) {
      toast(
        <div className="text-left text-sm text-slate-800">
          <p className="mb-1 font-semibold text-amber-900">
            Employee {action} — email not sent
          </p>
          <p>{detail}</p>
          <p className="mt-2 text-xs text-slate-600">
            Check <code className="rounded bg-slate-100 px-1">SMTP_USER</code> /{' '}
            <code className="rounded bg-slate-100 px-1">SMTP_PASS</code> and restart the backend.
          </p>
        </div>,
        { icon: '⚠️', duration: 12_000, id: `provision-mail-${action}` }
      );
      return;
    }

    if (res.accountProvisioningSuccess === false) {
      toast.error(detail);
      return;
    }

    toast.success(`Employee ${action}. ${detail}`);
  };

  const saveEmployee = async (
    values: EmployeeFormValues,
    options?: {
      confirmDepartmentTransfer?: boolean;
      transferTeamId?: number | null;
    }
  ) => {
    const payload = {
      ...formValuesToPayload(values),
      confirmDepartmentTransfer: options?.confirmDepartmentTransfer ?? false,
      transferTeamId: options?.transferTeamId ?? null,
    };

    if (mode === 'create') {
      const res = await createEmployee(payload);
      showProvisionToast('created', res);
    } else if (employee) {
      const res = await updateEmployee(employee.id, payload);
      showProvisionToast('updated', res);
    }

    onSaved();
    closeModal();
  };

  const onSubmit = async (values: EmployeeFormValues) => {
    try {
      if (mode === 'edit' && employee) {
        const currentDepartmentId = toNullableNumber(values.currentDepartmentId);
        const parentDepartmentId = toNullableNumber(values.parentDepartmentId);

        const preview = await previewEmployeeDepartmentTransfer(
          employee.id,
          currentDepartmentId,
          parentDepartmentId
        );

        if (preview.blocked) {
          toast.error(preview.blockingReason || preview.message || 'Department transfer is blocked.');
          return;
        }

        if (preview.requiresConfirmation) {
          setTransferPreview(preview);
          setPendingValues(values);
          setSelectedTransferTeamId('');
          return;
        }
      }

      await saveEmployee(values);
    } catch (e) {
      toast.error(parseApiError(e));
    }
  };

  const confirmDepartmentTransfer = async () => {
    if (!transferPreview || !pendingValues) {
      return;
    }

    if (transferPreview.requiresTeamSelection && !selectedTransferTeamId) {
      toast.error('Please select a team in the new working department.');
      return;
    }

    const selectedTeamId = transferPreview.requiresTeamSelection
      ? Number.parseInt(selectedTransferTeamId, 10)
      : null;

    setConfirmSaving(true);

    try {
      await saveEmployee(pendingValues, {
        confirmDepartmentTransfer: true,
        transferTeamId: selectedTeamId,
      });
    } catch (e) {
      toast.error(parseApiError(e));
    } finally {
      setConfirmSaving(false);
    }
  };

  const activeTransferTeams =
    transferPreview?.teams?.filter((team) => team.active) ?? [];

  return (
    <div className="epms-emp-modal-overlay" role="presentation" onClick={closeModal}>
      <div
        className="epms-emp-modal epms-emp-modal--wide"
        role="dialog"
        aria-modal="true"
        aria-labelledby="emp-form-title"
        onClick={(ev) => ev.stopPropagation()}
      >
        <div className="epms-emp-modal__accent" />

        <div className="epms-emp-modal__head">
          <h2 id="emp-form-title" className="epms-emp-modal__title">
            {mode === 'create' ? 'Add employee' : 'Edit employee'}
          </h2>

          <button
            type="button"
            className="epms-emp-modal__close"
            onClick={closeModal}
            aria-label="Close"
          >
            <i className="bi bi-x-lg" aria-hidden />
          </button>
        </div>

        <form className="epms-emp-form" onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="epms-emp-form-body">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="epms-emp-field block">
                <span className="epms-emp-field__label">
                  First name <span className="text-red-600">*</span>
                </span>
                <input
                  className="epms-emp-input-field"
                  autoComplete="given-name"
                  {...register('firstName')}
                />
                {errors.firstName && (
                  <p className="mt-1 text-xs text-red-600">{errors.firstName.message}</p>
                )}
              </label>

              <label className="epms-emp-field block">
                <span className="epms-emp-field__label">
                  Last name <span className="text-red-600">*</span>
                </span>
                <input
                  className="epms-emp-input-field"
                  autoComplete="family-name"
                  {...register('lastName')}
                />
                {errors.lastName && (
                  <p className="mt-1 text-xs text-red-600">{errors.lastName.message}</p>
                )}
              </label>
            </div>

            <div className="mt-1 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="epms-emp-field block">
                <span className="epms-emp-field__label">Position</span>
                <select
                  className="epms-emp-input-field"
                  disabled={orgPickersLoading}
                  {...register('positionId')}
                >
                  <option value="">{orgPickersLoading ? 'Loading…' : '—'}</option>

                  {positions.map((p) => (
                    <option key={p.id} value={String(p.id)}>
                      {p.positionTitle}
                      {p.levelCode ? ` (${p.levelCode})` : ''}
                    </option>
                  ))}
                </select>
              </label>

              <input type="hidden" {...register('departmentId')} />

              <label className="epms-emp-field block">
                <span className="epms-emp-field__label">
                  Current Department <span className="text-red-600">*</span>
                </span>
                <select
                  className="epms-emp-input-field"
                  disabled={orgPickersLoading}
                  {...register('currentDepartmentId')}
                >
                  <option value="">{orgPickersLoading ? 'Loading…' : '— Select Current Department —'}</option>

                  {departments.map((d) => (
                    <option key={d.id} value={String(d.id)}>
                      {d.departmentName}
                    </option>
                  ))}
                </select>
                {errors.currentDepartmentId && (
                  <p className="mt-1 text-xs text-red-600">
                    {errors.currentDepartmentId.message}
                  </p>
                )}
              </label>

              <label className="epms-emp-field block sm:col-span-2">
                <span className="epms-emp-field__label">Parent Department / Working Department</span>
                <select
                  className="epms-emp-input-field"
                  disabled={orgPickersLoading || !selectedCurrentDepartmentId}
                  {...register('parentDepartmentId')}
                >
                  <option value="">
                    {!selectedCurrentDepartmentId
                      ? '— Select Current Department first —'
                      : '— Same as Current Department —'}
                  </option>

                  {parentDepartmentOptions.map((d) => (
                    <option key={d.id} value={String(d.id)}>
                      {d.departmentName}
                    </option>
                  ))}
                </select>

                <p className="mt-1 text-xs text-slate-500">
                  Blank means the employee works in their Current Department. Select Parent
                  Department only when the employee is working under another department.
                </p>

                {errors.parentDepartmentId && (
                  <p className="mt-1 text-xs text-red-600">
                    {errors.parentDepartmentId.message}
                  </p>
                )}
              </label>
            </div>

            <div className="epms-emp-form-section">
              <h3>
                <i className="bi bi-person-vcard" aria-hidden />
                Contact &amp; identity
              </h3>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="epms-emp-field block">
                  <span className="epms-emp-field__label">Phone</span>
                  <input className="epms-emp-input-field" type="tel" {...register('phoneNumber')} />
                </label>

                <label className="epms-emp-field block">
                  <span className="epms-emp-field__label">Work email</span>
                  <input className="epms-emp-input-field" type="email" {...register('email')} />
                  {errors.email && (
                    <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>
                  )}
                </label>

                <label className="epms-emp-field block">
                  <span className="epms-emp-field__label">Staff NRC</span>
                  <input className="epms-emp-input-field" {...register('staffNrc')} />
                </label>

                <label className="epms-emp-field block">
                  <span className="epms-emp-field__label">Gender</span>
                  <select className="epms-emp-input-field" {...register('gender')}>
                    <option value="">—</option>
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="OTHER">Other</option>
                  </select>
                </label>

                <label className="epms-emp-field block">
                  <span className="epms-emp-field__label">Date of birth</span>
                  <input className="epms-emp-input-field" type="date" {...register('dateOfBirth')} />
                </label>
              </div>

              <div className="mt-3 flex flex-col gap-2">
                <label className="text-sm text-slate-700">
                  <input type="checkbox" className="mr-2" {...register('createLoginAccount')} />
                  Create login account automatically when email is provided
                </label>

                <label className="text-sm text-slate-700">
                  <input
                    type="checkbox"
                    className="mr-2"
                    {...register('sendTemporaryPasswordEmail')}
                  />
                  Send temporary password onboarding email
                </label>
              </div>
            </div>

            <div className="epms-emp-form-section">
              <h3>
                <i className="bi bi-globe2" aria-hidden />
                Background
              </h3>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="epms-emp-field block">
                  <span className="epms-emp-field__label">Race</span>
                  <input className="epms-emp-input-field" {...register('race')} />
                </label>

                <label className="epms-emp-field block">
                  <span className="epms-emp-field__label">Religion</span>
                  <input className="epms-emp-input-field" {...register('religion')} />
                </label>

                <label className="epms-emp-field col-span-1 sm:col-span-2 block">
                  <span className="epms-emp-field__label">Contact address</span>
                  <textarea
                    className="epms-emp-input-field min-h-[72px]"
                    rows={2}
                    {...register('contactAddress')}
                  />
                </label>

                <label className="epms-emp-field col-span-1 sm:col-span-2 block">
                  <span className="epms-emp-field__label">Permanent address</span>
                  <textarea
                    className="epms-emp-input-field min-h-[72px]"
                    rows={2}
                    {...register('permanentAddress')}
                  />
                </label>
              </div>
            </div>

            <div className="epms-emp-form-section">
              <h3>
                <i className="bi bi-people" aria-hidden />
                Family
              </h3>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="epms-emp-field block">
                  <span className="epms-emp-field__label">Marital status</span>
                  <input className="epms-emp-input-field" {...register('maritalStatus')} />
                </label>

                <div className="hidden sm:block" aria-hidden />

                <label className="epms-emp-field block">
                  <span className="epms-emp-field__label">Spouse name</span>
                  <input className="epms-emp-input-field" {...register('spouseName')} />
                </label>

                <label className="epms-emp-field block">
                  <span className="epms-emp-field__label">Spouse NRC</span>
                  <input className="epms-emp-input-field" {...register('spouseNrc')} />
                </label>

                <label className="epms-emp-field block">
                  <span className="epms-emp-field__label">Father name</span>
                  <input className="epms-emp-input-field" {...register('fatherName')} />
                </label>

                <label className="epms-emp-field block">
                  <span className="epms-emp-field__label">Father NRC</span>
                  <input className="epms-emp-input-field" {...register('fatherNrc')} />
                </label>
              </div>
            </div>
          </div>

          <div className="epms-emp-form-footer">
            <button
              type="button"
              className="epms-emp-btn epms-emp-btn--ghost"
              onClick={closeModal}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="epms-emp-btn epms-emp-btn--primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <i className="bi bi-hourglass-split" aria-hidden />
                  Saving…
                </>
              ) : mode === 'create' ? (
                <>
                  <i className="bi bi-check-lg" aria-hidden />
                  Create
                </>
              ) : (
                <>
                  <i className="bi bi-save" aria-hidden />
                  Save changes
                </>
              )}
            </button>
          </div>
        </form>

        {transferPreview && pendingValues && (
          <div
            className="epms-emp-modal-overlay"
            role="presentation"
            onClick={() => {
              setTransferPreview(null);
              setPendingValues(null);
              setSelectedTransferTeamId('');
            }}
          >
            <div
              className="epms-emp-modal max-w-lg"
              role="dialog"
              aria-modal="true"
              aria-labelledby="department-transfer-title"
              onClick={(ev) => ev.stopPropagation()}
            >
              <div className="epms-emp-modal__accent" />

              <div className="epms-emp-modal__head">
                <h2 id="department-transfer-title" className="epms-emp-modal__title">
                  Confirm department transfer
                </h2>

                <button
                  type="button"
                  className="epms-emp-modal__close"
                  onClick={() => {
                    setTransferPreview(null);
                    setPendingValues(null);
                    setSelectedTransferTeamId('');
                  }}
                  aria-label="Close"
                >
                  <i className="bi bi-x-lg" aria-hidden />
                </button>
              </div>

              <div className="epms-emp-form-body">
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
                  <p className="font-semibold">This employee is already in a team.</p>
                  <p className="mt-1">
                    {transferPreview.message ||
                      'Changing the working department will affect team, KPI, PIP, and 1:1 planning.'}
                  </p>
                </div>

                <dl className="epms-emp-dl epms-emp-dl-2 mt-4">
                  <div>
                    <dt>Employee</dt>
                    <dd>{transferPreview.employeeName || '—'}</dd>
                  </div>

                  <div>
                    <dt>Current team</dt>
                    <dd>{transferPreview.oldTeamName || 'No active team'}</dd>
                  </div>

                  <div>
                    <dt>Old working department</dt>
                    <dd>{transferPreview.oldWorkingDepartmentName || '—'}</dd>
                  </div>

                  <div>
                    <dt>New working department</dt>
                    <dd>{transferPreview.newWorkingDepartmentName || '—'}</dd>
                  </div>
                </dl>

                {transferPreview.requiresTeamSelection ? (
                  <label className="epms-emp-field mt-4 block">
                    <span className="epms-emp-field__label">
                      Select new team <span className="text-red-600">*</span>
                    </span>

                    <select
                      className="epms-emp-input-field"
                      value={selectedTransferTeamId}
                      onChange={(e) => setSelectedTransferTeamId(e.target.value)}
                    >
                      <option value="">— Select team —</option>

                      {transferPreview.teams.map((team) => (
                        <option
                          key={team.id}
                          value={String(team.id)}
                          disabled={!team.active}
                          style={{
                            color: team.active ? '#15803d' : '#b91c1c',
                          }}
                        >
                          {team.teamName} ({team.active ? 'Active' : 'Inactive'})
                        </option>
                      ))}
                    </select>

                    <p className="mt-1 text-xs text-slate-500">
                      Inactive teams are shown but cannot be selected.
                    </p>
                  </label>
                ) : activeTransferTeams.length === 0 ? (
                  <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                    The new department has no active team yet. HR can still transfer this employee
                    and create or assign a team later.
                  </div>
                ) : null}
              </div>

              <div className="epms-emp-form-footer">
                <button
                  type="button"
                  className="epms-emp-btn epms-emp-btn--ghost"
                  disabled={confirmSaving}
                  onClick={() => {
                    setTransferPreview(null);
                    setPendingValues(null);
                    setSelectedTransferTeamId('');
                  }}
                >
                  No
                </button>

                <button
                  type="button"
                  className="epms-emp-btn epms-emp-btn--primary"
                  disabled={
                    confirmSaving ||
                    (transferPreview.requiresTeamSelection && !selectedTransferTeamId)
                  }
                  onClick={confirmDepartmentTransfer}
                >
                  {confirmSaving ? (
                    <>
                      <i className="bi bi-hourglass-split" aria-hidden />
                      Saving…
                    </>
                  ) : (
                    <>
                      <i className="bi bi-check-lg" aria-hidden />
                      Yes, transfer employee
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmployeeFormModal;