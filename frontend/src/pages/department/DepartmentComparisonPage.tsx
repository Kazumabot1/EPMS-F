/*
frontend/src/pages/department/DepartmentComparisonPage.tsx file: */
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  formatPersonWithPosition,
  getDepartmentComparisonDetail,
  isDepartmentActive,
  isTeamActive,
  searchDepartmentComparison,
  type DepartmentComparisonDetail,
  type DepartmentComparisonEmployee,
  type DepartmentComparisonSummary,
  type DepartmentComparisonTeam,
} from '../../services/departmentComparisonService';
import './department-comparison.css';

type Side = 'left' | 'right';

const display = (value?: string | number | null) => {
  if (value === null || value === undefined || value === '') {
    return '—';
  }

  return String(value);
};

const formatDate = (value?: string | null) => {
  if (!value) {
    return '—';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return date.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
};

const DepartmentComparisonPage = () => {
  const [search, setSearch] = useState('');
  const [departments, setDepartments] = useState<DepartmentComparisonSummary[]>([]);
  const [loading, setLoading] = useState(false);

  const [leftDepartment, setLeftDepartment] = useState<DepartmentComparisonDetail | null>(null);
  const [rightDepartment, setRightDepartment] = useState<DepartmentComparisonDetail | null>(null);

  const [modalDepartment, setModalDepartment] = useState<DepartmentComparisonDetail | null>(null);
  const [modalLoading, setModalLoading] = useState(false);

  const loadDepartments = useCallback(async () => {
    setLoading(true);

    try {
      const data = await searchDepartmentComparison(search.trim());
      setDepartments(data);
    } catch {
      setDepartments([]);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    loadDepartments();
  }, [loadDepartments]);

  const remainingDepartments = useMemo(() => {
    const selectedIds = new Set<number>();

    if (leftDepartment) {
      selectedIds.add(leftDepartment.id);
    }

    if (rightDepartment) {
      selectedIds.add(rightDepartment.id);
    }

    return departments.filter((department) => !selectedIds.has(department.id));
  }, [departments, leftDepartment, rightDepartment]);

  const openDepartmentModal = async (departmentId: number) => {
    setModalLoading(true);

    try {
      const detail = await getDepartmentComparisonDetail(departmentId);
      setModalDepartment(detail);
    } catch {
      alert('Failed to load department detail.');
    } finally {
      setModalLoading(false);
    }
  };

  const addDepartmentToSide = async (
    department: DepartmentComparisonSummary | DepartmentComparisonDetail,
    side: Side
  ) => {
    const otherSide = side === 'left' ? rightDepartment : leftDepartment;

    if (otherSide?.id === department.id) {
      alert('Please select a different department for comparison.');
      return;
    }

    try {
      const detail =
        'teams' in department
          ? department
          : await getDepartmentComparisonDetail(department.id);

      if (side === 'left') {
        setLeftDepartment(detail);
      } else {
        setRightDepartment(detail);
      }

      setModalDepartment(null);
    } catch {
      alert('Failed to add department.');
    }
  };

  const clearSide = (side: Side) => {
    if (side === 'left') {
      setLeftDepartment(null);
    } else {
      setRightDepartment(null);
    }
  };

  return (
    <div className="dept-compare-page">
      <div className="dept-compare-header">
        <div>
          <p className="dept-compare-eyebrow">Organization</p>
          <h1>Departments Comparison</h1>
          <p>
            Search departments by name or code, inspect their details, and compare two departments
            side by side.
          </p>
        </div>
      </div>

      <section className="dept-compare-search-card">
        <label className="dept-compare-search-label" htmlFor="department-search">
          Search departments
        </label>

        <div className="dept-compare-search-row">
          <input
            id="department-search"
            className="dept-compare-search-input"
            type="text"
            placeholder="Search by department name or code..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />

          <button
            type="button"
            className="dept-compare-btn dept-compare-btn-primary"
            onClick={loadDepartments}
          >
            Search
          </button>
        </div>
      </section>

      <section className="dept-compare-selected-grid">
        <ComparisonSlot
          title="Left Side"
          department={leftDepartment}
          onClear={() => clearSide('left')}
        />

        <ComparisonSlot
          title="Right Side"
          department={rightDepartment}
          onClear={() => clearSide('right')}
        />
      </section>

      {leftDepartment && rightDepartment ? (
        <section className="dept-compare-vs-grid">
          <DepartmentComparePanel department={leftDepartment} sideLabel="Left" />
          <DepartmentComparePanel department={rightDepartment} sideLabel="Right" />
        </section>
      ) : (
        <section className="dept-compare-help-card">
          {leftDepartment && !rightDepartment
            ? 'Left side is selected. Search or choose another department and add it to the right side.'
            : rightDepartment && !leftDepartment
              ? 'Right side is selected. Search or choose another department and add it to the left side.'
              : 'Select a department for the left side and another department for the right side to compare.'}
        </section>
      )}

      <section className="dept-compare-results-card">
        <div className="dept-compare-section-head">
          <div>
            <h2>Departments</h2>
            <p>Click a department row to view full details, or add it directly to a side.</p>
          </div>

          <span>{remainingDepartments.length} result(s)</span>
        </div>

        {loading ? (
          <div className="dept-compare-empty">Loading departments...</div>
        ) : remainingDepartments.length === 0 ? (
          <div className="dept-compare-empty">No departments found.</div>
        ) : (
          <div className="dept-compare-table-wrap">
            <table className="dept-compare-table">
              <thead>
                <tr>
                  <th>No.</th>
                  <th>Department Name</th>
                  <th>Department Code</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {remainingDepartments.map((department, index) => (
                  <tr
                    key={department.id}
                    onClick={() => openDepartmentModal(department.id)}
                    className="dept-compare-row"
                  >
                    <td>{index + 1}</td>

                    <td>
                      <div className="dept-compare-name-cell">
                        <span>{department.departmentName}</span>
                        <StatusPill
                          active={isDepartmentActive(department.status)}
                          activeText="Active"
                          inactiveText="Inactive"
                        />
                      </div>
                    </td>

                    <td>{display(department.departmentCode)}</td>

                    <td>
                      <div
                        className="dept-compare-actions"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <button
                          type="button"
                          className="dept-compare-btn dept-compare-btn-soft"
                          onClick={() => addDepartmentToSide(department, 'left')}
                          disabled={rightDepartment?.id === department.id}
                        >
                          Add Left
                        </button>

                        <button
                          type="button"
                          className="dept-compare-btn dept-compare-btn-soft"
                          onClick={() => addDepartmentToSide(department, 'right')}
                          disabled={leftDepartment?.id === department.id}
                        >
                          Add Right
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {modalLoading && (
        <div className="dept-compare-modal-overlay">
          <div className="dept-compare-modal">
            <p className="dept-compare-empty">Loading department detail...</p>
          </div>
        </div>
      )}

      {modalDepartment && (
        <DepartmentDetailModal
          department={modalDepartment}
          onClose={() => setModalDepartment(null)}
          onAddLeft={() => addDepartmentToSide(modalDepartment, 'left')}
          onAddRight={() => addDepartmentToSide(modalDepartment, 'right')}
          leftDisabled={rightDepartment?.id === modalDepartment.id}
          rightDisabled={leftDepartment?.id === modalDepartment.id}
        />
      )}
    </div>
  );
};

type ComparisonSlotProps = {
  title: string;
  department: DepartmentComparisonDetail | null;
  onClear: () => void;
};

const ComparisonSlot = ({ title, department, onClear }: ComparisonSlotProps) => (
  <div className="dept-compare-slot">
    <div className="dept-compare-slot-head">
      <span>{title}</span>

      {department && (
        <button type="button" onClick={onClear}>
          Clear
        </button>
      )}
    </div>

    {department ? (
      <>
        <h3>{department.departmentName}</h3>
        <p>{display(department.departmentCode)}</p>
        <StatusPill
          active={isDepartmentActive(department.status)}
          activeText="Active"
          inactiveText="Inactive"
        />
      </>
    ) : (
      <p className="dept-compare-muted">No department selected.</p>
    )}
  </div>
);

type DepartmentComparePanelProps = {
  department: DepartmentComparisonDetail;
  sideLabel: string;
};

const DepartmentComparePanel = ({ department, sideLabel }: DepartmentComparePanelProps) => (
  <div className="dept-compare-panel">
    <div className="dept-compare-panel-head">
      <span>{sideLabel}</span>
      <h2>{department.departmentName}</h2>
      <StatusPill
        active={isDepartmentActive(department.status)}
        activeText="Active"
        inactiveText="Inactive"
      />
    </div>

    <div className="dept-compare-metric-grid">
      <Metric label="Total Employees" value={department.totalEmployeeCount} />
      <Metric label="As Current Department" value={department.currentDepartmentEmployeeCount} />
      <Metric label="As Parent Department" value={department.parentDepartmentEmployeeCount} />
      <Metric label="Teams" value={department.teamCount} />
    </div>

    <div className="dept-compare-info-list">
      <InfoRow label="Department Code" value={department.departmentCode} />
      <InfoRow label="Created At" value={formatDate(department.createdAt)} />
      <InfoRow label="Created By" value={department.createdBy} />
      <InfoRow label="ID" value={department.id} />
      <InfoRow label="Head Employee" value={department.headEmployee} />
    </div>

    <div className="dept-compare-mini-section">
      <h3>Teams</h3>

      {department.teams && department.teams.length > 0 ? (
        department.teams.map((team) => <TeamCard key={team.id} team={team} compact />)
      ) : (
        <p className="dept-compare-muted">No teams found.</p>
      )}
    </div>

    <div className="dept-compare-mini-section">
      <h3>Employees</h3>

      {department.employees && department.employees.length > 0 ? (
        <EmployeeList employees={department.employees} />
      ) : (
        <p className="dept-compare-muted">No active employees found.</p>
      )}
    </div>
  </div>
);

type DepartmentDetailModalProps = {
  department: DepartmentComparisonDetail;
  onClose: () => void;
  onAddLeft: () => void;
  onAddRight: () => void;
  leftDisabled: boolean;
  rightDisabled: boolean;
};

const DepartmentDetailModal = ({
  department,
  onClose,
  onAddLeft,
  onAddRight,
  leftDisabled,
  rightDisabled,
}: DepartmentDetailModalProps) => (
  <div className="dept-compare-modal-overlay" onClick={onClose}>
    <div className="dept-compare-modal" onClick={(event) => event.stopPropagation()}>
      <div className="dept-compare-modal-head">
        <div>
          <p>Department Details</p>
          <h2>{department.departmentName}</h2>
        </div>

        <button type="button" onClick={onClose} aria-label="Close">
          ×
        </button>
      </div>

      <div className="dept-compare-modal-body">
        <div className="dept-compare-info-list">
          <InfoRow label="Department Name" value={department.departmentName} />
          <InfoRow label="Department Code" value={department.departmentCode} />
          <InfoRow
            label="Status"
            value={
              isDepartmentActive(department.status) ? 'Active' : 'Inactive'
            }
          />
          <InfoRow label="Created At" value={formatDate(department.createdAt)} />
          <InfoRow label="Created By" value={department.createdBy} />
          <InfoRow label="ID" value={department.id} />
          <InfoRow label="Head Employee" value={department.headEmployee} />
        </div>

        <div className="dept-compare-metric-grid">
          <Metric label="Total Number of Employee" value={department.totalEmployeeCount} />
          <Metric
            label="Number of Employee as Parent"
            value={department.parentDepartmentEmployeeCount}
          />
          <Metric
            label="Number of Employee as Current Department"
            value={department.currentDepartmentEmployeeCount}
          />
          <Metric label="Number of Team" value={department.teamCount} />
        </div>

        <div className="dept-compare-mini-section">
          <h3>Teams in this department</h3>

          {department.teams && department.teams.length > 0 ? (
            department.teams.map((team) => <TeamCard key={team.id} team={team} />)
          ) : (
            <p className="dept-compare-muted">No teams found.</p>
          )}
        </div>

        <div className="dept-compare-mini-section">
          <h3>Employees in this department</h3>

          {department.employees && department.employees.length > 0 ? (
            <EmployeeList employees={department.employees} />
          ) : (
            <p className="dept-compare-muted">No active employees found.</p>
          )}
        </div>
      </div>

      <div className="dept-compare-modal-footer">
        <button type="button" className="dept-compare-btn dept-compare-btn-ghost" onClick={onClose}>
          Cancel
        </button>

        <button
          type="button"
          className="dept-compare-btn dept-compare-btn-soft"
          onClick={onAddLeft}
          disabled={leftDisabled}
        >
          Add in left side
        </button>

        <button
          type="button"
          className="dept-compare-btn dept-compare-btn-primary"
          onClick={onAddRight}
          disabled={rightDisabled}
        >
          Add in right side
        </button>
      </div>
    </div>
  </div>
);

type TeamCardProps = {
  team: DepartmentComparisonTeam;
  compact?: boolean;
};

const TeamCard = ({ team, compact = false }: TeamCardProps) => (
  <details className="dept-compare-team-card" open={!compact}>
    <summary>
      <span className="dept-compare-team-title">
        {team.teamName}
        <StatusPill
          active={isTeamActive(team.status)}
          activeText="Active"
          inactiveText="Inactive"
        />
      </span>

      <span>{team.employeeCount ?? 0} employee(s)</span>
    </summary>

    <div className="dept-compare-team-body">
      <InfoRow label="Team Name" value={team.teamName} />
      <InfoRow label="Team Goal" value={team.teamGoal} />
      <InfoRow
        label="Team Leader"
        value={formatPersonWithPosition(team.teamLeaderName, team.teamLeaderPositionTitle)}
      />
      <InfoRow label="Created Date" value={formatDate(team.createdDate)} />
      <InfoRow label="Created By" value={team.createdByName} />

      <div className="dept-compare-member-block">
        <h4>Members</h4>

        {team.members && team.members.length > 0 ? (
          <EmployeeList employees={team.members} />
        ) : (
          <p className="dept-compare-muted">No members found.</p>
        )}
      </div>
    </div>
  </details>
);

const EmployeeList = ({ employees }: { employees: DepartmentComparisonEmployee[] }) => (
  <ul className="dept-compare-employee-list">
    {employees.map((employee, index) => (
      <li key={`${employee.userId ?? employee.employeeId ?? index}-${index}`}>
        <span>{formatPersonWithPosition(employee.employeeName, employee.positionTitle)}</span>
        {employee.email && <small>{employee.email}</small>}
      </li>
    ))}
  </ul>
);

const Metric = ({ label, value }: { label: string; value?: number | null }) => (
  <div className="dept-compare-metric">
    <span>{label}</span>
    <strong>{value ?? 0}</strong>
  </div>
);

const InfoRow = ({ label, value }: { label: string; value?: string | number | null }) => (
  <div className="dept-compare-info-row">
    <span>{label}</span>
    <strong>{display(value)}</strong>
  </div>
);

const StatusPill = ({
  active,
  activeText,
  inactiveText,
}: {
  active: boolean;
  activeText: string;
  inactiveText: string;
}) => (
  <span className={`dept-compare-status ${active ? 'is-active' : 'is-inactive'}`}>
    {active ? activeText : inactiveText}
  </span>
);

export default DepartmentComparisonPage;