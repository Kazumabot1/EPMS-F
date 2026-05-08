/*
import React, { useEffect, useState } from "react";
import {
  createTeam,
  fetchCandidateMembers,
  fetchCandidateUsers,
  fetchDepartments,
} from "../../services/teamService";

import type {
  CandidateUser,
  Department,
  TeamRequest,
} from "../../services/teamService";
import { authStorage } from "../../services/authStorage";

interface TeamCreateProps {
  embedded?: boolean;
  onCancel?: () => void;
  onCreated?: () => void;
}

const TeamCreate: React.FC<TeamCreateProps> = ({
  embedded = false,
  onCancel,
  onCreated,
}) => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [leaders, setLeaders] = useState<CandidateUser[]>([]);
  const [members, setMembers] = useState<CandidateUser[]>([]);

  const [teamName, setTeamName] = useState("");
  const [departmentId, setDepartmentId] = useState<number | "">("");
  const [teamLeaderId, setTeamLeaderId] = useState<number | "">("");
  const [teamGoal, setTeamGoal] = useState("");
  const [status, setStatus] = useState("Active");
  const [memberUserIds, setMemberUserIds] = useState<number[]>([]);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const getCurrentUserId = (): number => {
    const user = authStorage.getUser();
    return Number(user?.id || user?.userId || 1);
  };

  const isCandidateAvailable = (user: CandidateUser): boolean => {
    return user.available ?? user.isAvailable ?? true;
  };

  const candidateLabel = (user: CandidateUser): string => {
    if (!isCandidateAvailable(user)) {
      return `${user.name} ⚠️ (already in a team: ${
        user.currentTeamName || "Unknown Team"
      })`;
    }

    return user.name;
  };

  useEffect(() => {
    loadDepartments();
  }, []);

  useEffect(() => {
    if (departmentId !== "") {
      loadCandidates(Number(departmentId));
    } else {
      setLeaders([]);
      setMembers([]);
      setTeamLeaderId("");
      setMemberUserIds([]);
    }
  }, [departmentId]);

  const loadDepartments = async () => {
    try {
      const data = await fetchDepartments();
      setDepartments(data);
    } catch (error) {
      console.error("Failed to fetch departments", error);
      setMessage("Failed to fetch departments. Please login again.");
    }
  };

  const loadCandidates = async (deptId: number) => {
    try {
      const [leaderData, memberData] = await Promise.all([
        fetchCandidateUsers(deptId),
        fetchCandidateMembers(deptId),
      ]);

      setLeaders(leaderData);
      setMembers(memberData);
      setTeamLeaderId("");
      setMemberUserIds([]);
    } catch (error) {
      console.error("Failed to fetch candidates", error);
      setMessage("Failed to fetch users. Please check your login session.");
    }
  };

  const toggleMember = (id: number) => {
    const member = members.find((item) => item.id === id);

    if (!member) return;

    if (!isCandidateAvailable(member)) {
      setMessage(
        `${member.name} is already in a team: ${
          member.currentTeamName || "Unknown Team"
        }`
      );
      return;
    }

    if (Number(teamLeaderId) === id) {
      setMessage("Team leader cannot also be a member.");
      return;
    }

    setMemberUserIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const resetForm = () => {
    setTeamName("");
    setDepartmentId("");
    setTeamLeaderId("");
    setTeamGoal("");
    setStatus("Active");
    setMemberUserIds([]);
    setLeaders([]);
    setMembers([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!teamName.trim() || departmentId === "" || teamLeaderId === "") {
      setMessage("Please fill all required fields.");
      return;
    }

    const selectedLeader = leaders.find(
      (leader) => leader.id === Number(teamLeaderId)
    );

    if (selectedLeader && !isCandidateAvailable(selectedLeader)) {
      setMessage(
        `${selectedLeader.name} is already in a team: ${
          selectedLeader.currentTeamName || "Unknown Team"
        }`
      );
      return;
    }

    const unavailableMember = members.find(
      (member) => memberUserIds.includes(member.id) && !isCandidateAvailable(member)
    );

    if (unavailableMember) {
      setMessage(
        `${unavailableMember.name} is already in a team: ${
          unavailableMember.currentTeamName || "Unknown Team"
        }`
      );
      return;
    }

    if (memberUserIds.includes(Number(teamLeaderId))) {
      setMessage("Team leader cannot also be a member.");
      return;
    }

    try {
      setLoading(true);
      setMessage("");

      const request: TeamRequest = {
        teamName: teamName.trim(),
        departmentId: Number(departmentId),
        teamLeaderId: Number(teamLeaderId),
        createdById: getCurrentUserId(),
        teamGoal,
        status,
        memberUserIds,
        memberEmployeeIds: memberUserIds,
      };

      await createTeam(request);

      setMessage("Team created successfully.");
      resetForm();

      if (onCreated) {
        onCreated();
      }
    } catch (error: any) {
      console.error("Failed to create team", error);
      setMessage(
        error?.response?.data?.message ||
          error?.response?.data?.error ||
          error?.response?.data?.data ||
          "Failed to save team."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={embedded ? "" : "p-6 max-w-3xl mx-auto"}>
      {!embedded && <h1 className="text-2xl font-semibold mb-6">Create Team</h1>}

      {message && <div className="team-alert mb-3">{message}</div>}

      <form onSubmit={handleSubmit} className="team-form">
        <div className="team-field">
          <label>
            Team Name <span className="team-required">*</span>
          </label>
          <input
            className="team-input"
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            placeholder="Enter team name"
            required
          />
        </div>

        <div className="team-field">
          <label>
            Department <span className="team-required">*</span>
          </label>
          <select
            className="team-select"
            value={departmentId}
            onChange={(e) =>
              setDepartmentId(e.target.value ? Number(e.target.value) : "")
            }
            required
          >
            <option value="">Select department</option>
            {departments.map((dept) => (
              <option key={dept.id} value={dept.id}>
                {dept.departmentName || dept.name}
              </option>
            ))}
          </select>
        </div>

        <div className="team-field">
          <label>
            Team Leader <span className="team-required">*</span>
          </label>
          <select
            className="team-select"
            value={teamLeaderId}
            onChange={(e) =>
              setTeamLeaderId(e.target.value ? Number(e.target.value) : "")
            }
            disabled={!departmentId}
            required
          >
            <option value="">Select team leader</option>
            {leaders.map((leader) => {
              const disabled = !isCandidateAvailable(leader);

              return (
                <option key={leader.id} value={leader.id} disabled={disabled}>
                  {candidateLabel(leader)}
                </option>
              );
            })}
          </select>
        </div>

        <div className="team-field">
          <label>Team Goal</label>
          <textarea
            className="team-textarea"
            value={teamGoal}
            onChange={(e) => setTeamGoal(e.target.value)}
            placeholder="Enter team goal"
            rows={3}
          />
        </div>

        <div className="team-field">
          <label>Status</label>
          <select
            className="team-select"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>

        <div className="team-field">
          <label>Members</label>

          {!departmentId && (
            <p className="text-muted">Select a department first.</p>
          )}

          {departmentId && members.length === 0 && (
            <p className="text-muted">No members found.</p>
          )}

          <div className="team-members-list">
            {members.map((member) => {
              const isLeader = Number(teamLeaderId) === member.id;
              const isSelected = memberUserIds.includes(member.id);
              const alreadyInTeam = !isCandidateAvailable(member);
              const disabled = isLeader || alreadyInTeam;

              return (
                <label
                  key={member.id}
                  className={`team-member-item ${disabled ? "disabled" : ""}`}
                  title={
                    isLeader
                      ? "Team leader cannot also be a member"
                      : alreadyInTeam
                      ? `Already in a team: ${
                          member.currentTeamName || "Unknown Team"
                        }`
                      : ""
                  }
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleMember(member.id)}
                    disabled={disabled}
                  />
                  <span>
                    {candidateLabel(member)}
                    {isLeader ? " (selected as team leader)" : ""}
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        <div className="team-modal-footer">
          {embedded && (
            <button
              type="button"
              className="team-btn secondary"
              onClick={onCancel}
              disabled={loading}
            >
              Cancel
            </button>
          )}

          <button type="submit" disabled={loading} className="team-btn primary">
            {loading ? "Creating..." : "Create Team"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default TeamCreate; */







import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  createMyDepartmentTeam,
  createTeam,
  fetchCandidateMembers,
  fetchCandidateProjectManagers,
  fetchCandidateUsers,
  fetchDepartments,
  fetchMyDepartmentCandidateMembers,
  fetchMyDepartmentCandidateProjectManagers,
  fetchMyDepartmentCandidateUsers,
  formatCandidateLabel,
  type CandidateUser,
  type Department,
  type TeamRequest,
} from '../../services/teamService';
import { useAuth } from '../../contexts/AuthContext';
import './team-ui.css';

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

const TeamCreate: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const isDepartmentHead = isDepartmentHeadUser(user);

  const [departments, setDepartments] = useState<Department[]>([]);
  const [leaders, setLeaders] = useState<CandidateUser[]>([]);
  const [projectManagers, setProjectManagers] = useState<CandidateUser[]>([]);
  const [members, setMembers] = useState<CandidateUser[]>([]);

  const [departmentId, setDepartmentId] = useState('');
  const [teamName, setTeamName] = useState('');
  const [teamGoal, setTeamGoal] = useState('');
  const [status, setStatus] = useState('Active');
  const [teamLeaderId, setTeamLeaderId] = useState('');
  const [projectManagerId, setProjectManagerId] = useState('');
  const [selectedMemberIds, setSelectedMemberIds] = useState<number[]>([]);

  const [loadingDepartments, setLoadingDepartments] = useState(false);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const selectedLeaderIdNumber = teamLeaderId ? Number(teamLeaderId) : null;
  const selectedProjectManagerIdNumber = projectManagerId ? Number(projectManagerId) : null;

  const canLoadHrCandidates = !isDepartmentHead && Boolean(departmentId);

  useEffect(() => {
    let cancelled = false;

    if (isDepartmentHead) {
      return;
    }

    setLoadingDepartments(true);

    fetchDepartments()
      .then((data) => {
        if (!cancelled) {
          setDepartments(Array.isArray(data) ? data : []);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setError('Failed to load departments.');
          setDepartments([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingDepartments(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [isDepartmentHead]);

  useEffect(() => {
    let cancelled = false;

    const resetCandidates = () => {
      setLeaders([]);
      setProjectManagers([]);
      setMembers([]);
      setTeamLeaderId('');
      setProjectManagerId('');
      setSelectedMemberIds([]);
    };

    const loadForHr = async () => {
      if (!canLoadHrCandidates) {
        resetCandidates();
        return;
      }

      setLoadingCandidates(true);
      setError('');

      try {
        const deptId = Number(departmentId);

        const [leaderData, memberData, pmData] = await Promise.all([
          fetchCandidateUsers(deptId),
          fetchCandidateMembers(deptId),
          fetchCandidateProjectManagers(deptId),
        ]);

        if (!cancelled) {
          setLeaders(Array.isArray(leaderData) ? leaderData : []);
          setMembers(Array.isArray(memberData) ? memberData : []);
          setProjectManagers(Array.isArray(pmData) ? pmData : []);
          setTeamLeaderId('');
          setProjectManagerId('');
          setSelectedMemberIds([]);
        }
      } catch {
        if (!cancelled) {
          setError('Failed to load team candidates.');
          resetCandidates();
        }
      } finally {
        if (!cancelled) {
          setLoadingCandidates(false);
        }
      }
    };

    const loadForDepartmentHead = async () => {
      if (!isDepartmentHead) {
        return;
      }

      setLoadingCandidates(true);
      setError('');

      try {
        const [leaderData, memberData, pmData] = await Promise.all([
          fetchMyDepartmentCandidateUsers(),
          fetchMyDepartmentCandidateMembers(),
          fetchMyDepartmentCandidateProjectManagers(),
        ]);

        if (!cancelled) {
          setLeaders(Array.isArray(leaderData) ? leaderData : []);
          setMembers(Array.isArray(memberData) ? memberData : []);
          setProjectManagers(Array.isArray(pmData) ? pmData : []);
          setTeamLeaderId('');
          setProjectManagerId('');
          setSelectedMemberIds([]);
        }
      } catch {
        if (!cancelled) {
          setError('Failed to load department team candidates.');
          resetCandidates();
        }
      } finally {
        if (!cancelled) {
          setLoadingCandidates(false);
        }
      }
    };

    if (isDepartmentHead) {
      loadForDepartmentHead();
    } else {
      loadForHr();
    }

    return () => {
      cancelled = true;
    };
  }, [departmentId, canLoadHrCandidates, isDepartmentHead]);

  useEffect(() => {
    if (!teamLeaderId) {
      return;
    }

    if (projectManagerId && projectManagerId === teamLeaderId) {
      setProjectManagerId('');
    }

    setSelectedMemberIds((prev) =>
      prev.filter((id) => id !== Number(teamLeaderId))
    );
  }, [teamLeaderId, projectManagerId]);

  useEffect(() => {
    if (!projectManagerId) {
      return;
    }

    setSelectedMemberIds((prev) =>
      prev.filter((id) => id !== Number(projectManagerId))
    );
  }, [projectManagerId]);

  const availableProjectManagers = useMemo(() => {
    return projectManagers.filter((pm) => pm.id !== selectedLeaderIdNumber);
  }, [projectManagers, selectedLeaderIdNumber]);

  const memberRows = useMemo(() => {
    return members.map((member) => {
      const isLeader = selectedLeaderIdNumber === member.id;
      const isProjectManager = selectedProjectManagerIdNumber === member.id;
      const alreadyInTeam = member.available === false || member.isAvailable === false;

      return {
        ...member,
        disabled: isLeader || isProjectManager || alreadyInTeam,
        disabledReason: isLeader
          ? 'Selected as Team Leader'
          : isProjectManager
            ? 'Selected as Project Manager'
            : alreadyInTeam
              ? member.currentTeamName
                ? `Already in ${member.currentTeamName}`
                : 'Already in another team'
              : '',
      };
    });
  }, [members, selectedLeaderIdNumber, selectedProjectManagerIdNumber]);

  const toggleMember = (memberId: number) => {
    setSelectedMemberIds((prev) => {
      if (prev.includes(memberId)) {
        return prev.filter((id) => id !== memberId);
      }

      return [...prev, memberId];
    });
  };




  const validateForm = () => {
    if (!isDepartmentHead && !departmentId) {
      return 'Please select a department.';
    }

    if (!teamName.trim()) {
      return 'Please enter a team name.';
    }

    if (!teamLeaderId) {
      return 'Please select a Team Leader.';
    }

    if (projectManagerId && projectManagerId === teamLeaderId) {
      return 'Project Manager cannot be the same as Team Leader.';
    }

    if (projectManagerId && selectedMemberIds.includes(Number(projectManagerId))) {
      return 'Project Manager cannot be selected as a normal member.';
    }

    if (selectedMemberIds.includes(Number(teamLeaderId))) {
      return 'Team Leader cannot be selected as a normal member.';
    }

    return '';
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    setError('');
    setSuccess('');

    const validationMessage = validateForm();

    if (validationMessage) {
      setError(validationMessage);
      return;
    }

    setSubmitting(true);

    try {
      const request: TeamRequest = {
        teamName: teamName.trim(),
        departmentId: isDepartmentHead ? 0 : Number(departmentId),
        teamLeaderId: Number(teamLeaderId),
        projectManagerId: projectManagerId ? Number(projectManagerId) : null,
        teamGoal: teamGoal.trim(),
        status,
        memberUserIds: selectedMemberIds,
        memberEmployeeIds: selectedMemberIds,
      };

      if (isDepartmentHead) {
        await createMyDepartmentTeam(request);
      } else {
        await createTeam(request);
      }

      setSuccess('Team created successfully.');

      setTimeout(() => {
        navigate(isDepartmentHead ? '/department-head/teams' : '/hr/team');
      }, 600);
    } catch (err: any) {
      setError(getApiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const backPath = isDepartmentHead ? '/department-head/teams' : '/hr/team';

  return (
    <div className="team-page">
      <div className="team-header">
        <div>
          <p className="team-eyebrow">Team Organization</p>
          <h1>Create Team</h1>
          <p>
            Create a team, assign a Team Leader, optionally assign a Project Manager, and choose
            members.
          </p>
        </div>

        <button
          type="button"
          className="team-btn team-btn-secondary"
          onClick={() => navigate(backPath)}
        >
          Back
        </button>
      </div>

      <form className="team-form-card" onSubmit={handleSubmit}>
        {!isDepartmentHead && (
          <div className="team-field">
            <label>Department</label>
            <select
              value={departmentId}
              onChange={(event) => setDepartmentId(event.target.value)}
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

        {isDepartmentHead && (
          <div className="team-info-banner">
            This team will be created inside your assigned department.
          </div>
        )}

        <div className="team-field">
          <label>Team Name</label>
          <input
            type="text"
            value={teamName}
            onChange={(event) => setTeamName(event.target.value)}
            placeholder="Enter team name"
            maxLength={100}
          />
        </div>

        <div className="team-field">
          <label>Team Goal</label>
          <textarea
            value={teamGoal}
            onChange={(event) => setTeamGoal(event.target.value)}
            placeholder="Enter team goal"
            maxLength={500}
          />
        </div>

        <div className="team-field">
          <label>Status</label>
          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>

        <div className="team-field">
          <label>Team Leader</label>
          <select
            value={teamLeaderId}
            onChange={(event) => setTeamLeaderId(event.target.value)}
            disabled={loadingCandidates || (!isDepartmentHead && !departmentId)}
          >
            <option value="">
              {loadingCandidates ? 'Loading leaders...' : 'Select Team Leader'}
            </option>

            {leaders.map((leader) => (
              <option key={leader.id} value={leader.id}>
                {leader.name}
              </option>
            ))}
          </select>
        </div>

        <div className="team-field">
          <label>Project Manager</label>
          <select
            value={projectManagerId}
            onChange={(event) => setProjectManagerId(event.target.value)}
            disabled={loadingCandidates || (!isDepartmentHead && !departmentId)}
          >
            <option value="">Optional - Select Project Manager</option>

            {availableProjectManagers.map((pm) => (
              <option key={pm.id} value={pm.id}>
                {formatCandidateLabel(pm)}
              </option>
            ))}
          </select>

          <small>
            Optional. Project Manager can manage many teams, but cannot be the Team Leader or a
            normal member in this team.
          </small>
        </div>

        <div className="team-members-box">
          <div className="team-members-head">
            <div>
              <h3>Members</h3>
              <p>Select available members for this team.</p>
            </div>

            <span>{selectedMemberIds.length} selected</span>
          </div>

          {loadingCandidates ? (
            <div className="team-empty">Loading members...</div>
          ) : memberRows.length === 0 ? (
            <div className="team-empty">No members found.</div>
          ) : (
            <div className="team-member-grid">
              {memberRows.map((member) => (
                <label
                  key={member.id}
                  className={`team-member-card ${member.disabled ? 'is-disabled' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={selectedMemberIds.includes(member.id)}
                    disabled={member.disabled}
                    onChange={() => toggleMember(member.id)}
                  />

                  <span>
                    <strong>{member.name}</strong>
                    {member.disabledReason && <small>{member.disabledReason}</small>}
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>

        {error && <div className="team-error">{error}</div>}
        {success && <div className="team-success">{success}</div>}

        <div className="team-form-actions">
          <button
            type="button"
            className="team-btn team-btn-secondary"
            onClick={() => navigate(backPath)}
          >
            Cancel
          </button>

          <button type="submit" className="team-btn team-btn-primary" disabled={submitting}>
            {submitting ? 'Creating...' : 'Create Team'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default TeamCreate;