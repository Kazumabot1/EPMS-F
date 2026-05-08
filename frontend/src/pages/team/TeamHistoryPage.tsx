/*
TeamHistoryPage.tsx file :  */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  fetchDepartments,
  fetchMyDepartmentTeamHistory,
  fetchMyDepartmentTeams,
  fetchTeamHistory,
  fetchTeamsByDepartment,
  type Department,
  type TeamHistoryResponse,
  type TeamResponse,
} from '../../services/teamService';
import { useAuth } from '../../contexts/AuthContext';
import './team-history.css';

const normalizeRole = (role?: string | null) =>
  String(role ?? '')
    .replace(/^ROLE_/i, '')
    .replace(/[\s_-]+/g, '')
    .toUpperCase();

const isDepartmentHeadUser = (user: any) => {
  const dashboard = String(user?.dashboard ?? '').toUpperCase();

  if (dashboard === 'DEPARTMENT_HEAD_DASHBOARD') {
    return true;
  }

  return (user?.roles ?? []).some((role: string) => {
    const normalized = normalizeRole(role);
    return normalized === 'DEPARTMENTHEAD';
  });
};

const getApiErrorMessage = (err: any) => {
  return (
    err?.response?.data?.message ||
    err?.response?.data?.error ||
    err?.message ||
    'Request failed.'
  );
};

const formatDateTime = (value?: string | null) => {
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

const display = (value?: string | null) => {
  const clean = value?.trim();
  return clean ? clean : '—';
};

const actionLabel = (actionType?: string | null) => {
  const value = String(actionType ?? '').trim();

  const labels: Record<string, string> = {
    TEAM_CREATED: 'Team Created',
    TEAM_NAME_CHANGED: 'Team Name Changed',
    TEAM_GOAL_CHANGED: 'Team Goal Changed',
    TEAM_LEADER_CHANGED: 'Team Leader Changed',
    PROJECT_MANAGER_CHANGED: 'Project Manager Changed',
    MEMBER_ADDED: 'Member Added',
    MEMBER_REMOVED: 'Member Removed',
    STATUS_CHANGED: 'Status Changed',
  };

  return labels[value] ?? value.replace(/_/g, ' ');
};

const actionClass = (actionType?: string | null) => {
  const value = String(actionType ?? '').trim();

  if (value === 'MEMBER_ADDED' || value === 'TEAM_CREATED') {
    return 'is-positive';
  }

  if (value === 'MEMBER_REMOVED') {
    return 'is-danger';
  }

  if (value === 'STATUS_CHANGED') {
    return 'is-warning';
  }

  return 'is-neutral';
};

const TeamHistoryPage: React.FC = () => {
  const { user } = useAuth();
  const isDepartmentHead = isDepartmentHeadUser(user);

  const [departments, setDepartments] = useState<Department[]>([]);
  const [teams, setTeams] = useState<TeamResponse[]>([]);
  const [histories, setHistories] = useState<TeamHistoryResponse[]>([]);

  const [departmentId, setDepartmentId] = useState('');
  const [teamId, setTeamId] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [search, setSearch] = useState('');

  const [loadingDepartments, setLoadingDepartments] = useState(false);
  const [loadingTeams, setLoadingTeams] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const [error, setError] = useState('');

  const loadDepartments = useCallback(async () => {
    if (isDepartmentHead) {
      setDepartments([]);
      return;
    }

    setLoadingDepartments(true);

    try {
      const data = await fetchDepartments();
      setDepartments(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setDepartments([]);
      setError(getApiErrorMessage(err));
    } finally {
      setLoadingDepartments(false);
    }
  }, [isDepartmentHead]);

  const loadMyDepartmentTeams = useCallback(async () => {
    setLoadingTeams(true);
    setError('');

    try {
      const data = await fetchMyDepartmentTeams();
      setTeams(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setTeams([]);
      setError(getApiErrorMessage(err));
    } finally {
      setLoadingTeams(false);
    }
  }, []);

  const loadTeamsByDepartment = useCallback(async () => {
    if (!departmentId) {
      setTeams([]);
      setTeamId('');
      return;
    }

    setLoadingTeams(true);
    setError('');

    try {
      const data = await fetchTeamsByDepartment(Number(departmentId));
      setTeams(Array.isArray(data) ? data : []);
      setTeamId('');
      setHistories([]);
    } catch (err: any) {
      setTeams([]);
      setError(getApiErrorMessage(err));
    } finally {
      setLoadingTeams(false);
    }
  }, [departmentId]);


  const loadHistory = useCallback(async () => {
    if (!teamId) {
      setHistories([]);
      return;
    }

    setLoadingHistory(true);
    setError('');

    try {
      const data = isDepartmentHead
        ? await fetchMyDepartmentTeamHistory(Number(teamId))
        : await fetchTeamHistory(Number(teamId));

      setHistories(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setHistories([]);
      setError(getApiErrorMessage(err));
    } finally {
      setLoadingHistory(false);
    }
  }, [teamId, isDepartmentHead]);

  useEffect(() => {
    loadDepartments();
  }, [loadDepartments]);

  useEffect(() => {
    if (isDepartmentHead) {
      loadMyDepartmentTeams();
    }
  }, [isDepartmentHead, loadMyDepartmentTeams]);

  useEffect(() => {
    if (!isDepartmentHead) {
      loadTeamsByDepartment();
    }
  }, [isDepartmentHead, loadTeamsByDepartment]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const actionOptions = useMemo(() => {
    const unique = new Set<string>();

    histories.forEach((history) => {
      if (history.actionType) {
        unique.add(history.actionType);
      }
    });

    return Array.from(unique).sort();
  }, [histories]);

  const filteredHistories = useMemo(() => {
    const cleanSearch = search.trim().toLowerCase();

    return histories.filter((history) => {
      const matchesAction = !actionFilter || history.actionType === actionFilter;

      const text = [
        history.teamName,
        history.actionType,
        history.fieldName,
        history.oldValue,
        history.newValue,
        history.reason,
        history.changedByName,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      const matchesSearch = !cleanSearch || text.includes(cleanSearch);

      return matchesAction && matchesSearch;
    });
  }, [histories, actionFilter, search]);

  return (
    <div className="team-history-page">
      <div className="team-history-header">
        <div>
          <p className="team-history-eyebrow">Team Organization</p>
          <h1>Team History</h1>
          <p>
            Review team changes, including members, leaders, project managers, status, and update
            reasons.
          </p>
        </div>
      </div>

      <section className="team-history-filter-card">
        {!isDepartmentHead && (
          <div className="team-history-field">
            <label>Select Department</label>
            <select
              value={departmentId}
              onChange={(event) => {
                setDepartmentId(event.target.value);
                setTeamId('');
                setHistories([]);
                setActionFilter('');
              }}
              disabled={loadingDepartments}
            >
              <option value="">
                {loadingDepartments ? 'Loading departments...' : 'Select Department'}
              </option>

              {departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.departmentName || department.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="team-history-field">
          <label>Select Team</label>
          <select
            value={teamId}
            onChange={(event) => {
              setTeamId(event.target.value);
              setActionFilter('');
            }}
            disabled={loadingTeams || (!isDepartmentHead && !departmentId)}
          >
            <option value="">
              {loadingTeams
                ? 'Loading teams...'
                : !isDepartmentHead && !departmentId
                  ? 'Select Department first'
                  : 'Select Team'}
            </option>

            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.teamName} ({team.status})
              </option>
            ))}
          </select>
        </div>

        <div className="team-history-field">
          <label>Action</label>
          <select
            value={actionFilter}
            onChange={(event) => setActionFilter(event.target.value)}
            disabled={!teamId || histories.length === 0}
          >
            <option value="">All Actions</option>

            {actionOptions.map((action) => (
              <option key={action} value={action}>
                {actionLabel(action)}
              </option>
            ))}
          </select>
        </div>

        <div className="team-history-field">
          <label>Search History</label>
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search reason, changed by, old value, new value..."
            disabled={!teamId || histories.length === 0}
          />
        </div>
      </section>

      {error && <div className="team-history-error">{error}</div>}

      <section className="team-history-card">
        <div className="team-history-card-head">
          <div>
            <h2>History Changes</h2>
            <p>
              {teamId
                ? `${filteredHistories.length} record(s) found.`
                : 'Select a team to view history.'}
            </p>
          </div>
        </div>

        {loadingHistory ? (
          <div className="team-history-empty">Loading history...</div>
        ) : !teamId ? (
          <div className="team-history-empty">Please select a team.</div>
        ) : filteredHistories.length === 0 ? (
          <div className="team-history-empty">No history records found.</div>
        ) : (
          <div className="team-history-table-wrap">
            <table className="team-history-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Team</th>
                  <th>Action</th>
                  <th>Field</th>
                  <th>Old Value</th>
                  <th>New Value</th>
                  <th>Reason</th>
                  <th>Changed By</th>
                </tr>
              </thead>

              <tbody>
                {filteredHistories.map((history) => (
                  <tr key={history.id}>
                    <td>{formatDateTime(history.changedAt)}</td>

                    <td>{display(history.teamName)}</td>

                    <td>
                      <span className={`team-history-action ${actionClass(history.actionType)}`}>
                        {actionLabel(history.actionType)}
                      </span>
                    </td>

                    <td>{display(history.fieldName)}</td>

                    <td>
                      <span className="team-history-value old">
                        {display(history.oldValue)}
                      </span>
                    </td>

                    <td>
                      <span className="team-history-value new">
                        {display(history.newValue)}
                      </span>
                    </td>

                    <td className="team-history-reason">{display(history.reason)}</td>

                    <td>{display(history.changedByName)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};

export default TeamHistoryPage;