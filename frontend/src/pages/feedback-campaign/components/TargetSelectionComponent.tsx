import { zodResolver } from '@hookform/resolvers/zod';
import { useDeferredValue, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import type {
  FeedbackDepartmentOption,
  FeedbackTargetEmployee,
  FeedbackTeamOption,
} from '../../../types/feedbackCampaign';

const targetSelectionSchema = z.object({
  departmentId: z.string(),
  teamId: z.string(),
  search: z.string(),
  employeeIds: z.array(z.number()).min(1, 'Select at least one target employee.'),
});

type TargetSelectionValues = z.input<typeof targetSelectionSchema>;

type TargetSelectionComponentProps = {
  employees: FeedbackTargetEmployee[];
  departments: FeedbackDepartmentOption[];
  teams: FeedbackTeamOption[];
  initialSelectedIds: number[];
  submitting: boolean;
  onSubmit: (payload: { employeeIds: number[] }) => Promise<void> | void;
};

const TargetSelectionComponent = ({
  employees,
  departments,
  teams,
  initialSelectedIds,
  submitting,
  onSubmit,
}: TargetSelectionComponentProps) => {
  const {
    handleSubmit,
    register,
    setValue,
    watch,
    formState: { errors },
  } = useForm<TargetSelectionValues>({
    resolver: zodResolver(targetSelectionSchema),
    defaultValues: {
      departmentId: '',
      teamId: '',
      search: '',
      employeeIds: initialSelectedIds,
    },
  });

  useEffect(() => {
    setValue('employeeIds', initialSelectedIds, { shouldDirty: false, shouldValidate: true });
  }, [initialSelectedIds, setValue]);

  const selectedIds = watch('employeeIds');
  const departmentId = watch('departmentId');
  const teamId = watch('teamId');
  const search = watch('search');
  const deferredSearch = useDeferredValue(search.trim().toLowerCase());

  const selectedTeam = teamId ? teams.find((team) => team.id === Number(teamId)) : undefined;

  const filteredEmployees = employees.filter((employee) => {
    const matchesDepartment = !departmentId || employee.currentDepartmentId === Number(departmentId);
    const matchesTeam = !selectedTeam || selectedTeam.memberEmployeeIds.includes(employee.id);
    const matchesSearch =
      deferredSearch.length === 0 ||
      employee.fullName.toLowerCase().includes(deferredSearch) ||
      (employee.currentDepartment ?? '').toLowerCase().includes(deferredSearch);

    return matchesDepartment && matchesTeam && matchesSearch;
  });

  const toggleEmployee = (employeeId: number) => {
    const next = selectedIds.includes(employeeId)
      ? selectedIds.filter((id) => id !== employeeId)
      : [...selectedIds, employeeId];
    setValue('employeeIds', next, { shouldDirty: true, shouldValidate: true });
  };

  const selectVisible = () => {
    const next = Array.from(new Set([...selectedIds, ...filteredEmployees.map((employee) => employee.id)]));
    setValue('employeeIds', next, { shouldDirty: true, shouldValidate: true });
  };

  const clearVisible = () => {
    const visibleIds = new Set(filteredEmployees.map((employee) => employee.id));
    const next = selectedIds.filter((employeeId) => !visibleIds.has(employeeId));
    setValue('employeeIds', next, { shouldDirty: true, shouldValidate: true });
  };

  return (
    <section className="feedback-setup-card">
      <div className="feedback-setup-card-header">
        <div>
          <p className="feedback-setup-eyebrow">Step 2</p>
          <h2>Select target employees</h2>
        </div>
        <div className="feedback-setup-chip">{selectedIds.length} selected</div>
      </div>

      <form
        className="feedback-setup-stack"
        onSubmit={handleSubmit(async (values) => {
          await onSubmit({ employeeIds: values.employeeIds });
        })}
      >
        <div className="feedback-setup-filter-grid">
          <label className="feedback-setup-field">
            <span>Department</span>
            <select {...register('departmentId')}>
              <option value="">All departments</option>
              {departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </select>
          </label>

          <label className="feedback-setup-field">
            <span>Team</span>
            <select {...register('teamId')}>
              <option value="">All teams</option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.teamName}
                </option>
              ))}
            </select>
          </label>

          <label className="feedback-setup-field feedback-setup-field-wide">
            <span>Search employee</span>
            <input
              {...register('search')}
              type="search"
              placeholder="Filter by name or department"
            />
          </label>
        </div>

        <div className="feedback-setup-inline-actions">
          <button className="feedback-setup-secondary" type="button" onClick={selectVisible}>
            Select visible
          </button>
          <button className="feedback-setup-secondary" type="button" onClick={clearVisible}>
            Clear visible
          </button>
        </div>

        <div className="feedback-setup-target-list">
          {filteredEmployees.length === 0 ? (
            <div className="feedback-setup-empty">No employees match the current filters.</div>
          ) : (
            filteredEmployees.map((employee) => {
              const checked = selectedIds.includes(employee.id);
              return (
                <label key={employee.id} className={`feedback-setup-target-row ${checked ? 'selected' : ''}`}>
                  <input
                    checked={checked}
                    type="checkbox"
                    onChange={() => toggleEmployee(employee.id)}
                  />
                  <div>
                    <strong>{employee.fullName}</strong>
                    <span>{employee.currentDepartment ?? 'No department assigned'}</span>
                  </div>
                </label>
              );
            })
          )}
        </div>

        {errors.employeeIds ? <p className="feedback-setup-error">{errors.employeeIds.message}</p> : null}

        <div className="feedback-setup-actions">
          <button className="feedback-setup-primary" disabled={submitting} type="submit">
            {submitting ? 'Saving targets...' : 'Save target employees'}
          </button>
        </div>
      </form>
    </section>
  );
};

export default TargetSelectionComponent;
