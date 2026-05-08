// KHN new file
// Modal component to update an existing team's details, leader, and members
// import { useEffect, useState, type FormEvent } from "react";
// import {
//   updateTeam,
//   fetchCandidateUsers,
//   fetchCandidateMembers,
// } from "../../services/teamService";
//
// import type {
//   TeamResponse,
//   CandidateUser,
// } from "../../services/teamService";
// import { authStorage } from "../../services/authStorage";
//
// interface TeamEditModalProps {
//   team: TeamResponse;
//   onClose: () => void;
//   onUpdate: () => void;
// }
//
// const TeamEditModal = ({ team, onClose, onUpdate }: TeamEditModalProps) => {
//   const [employees, setEmployees] = useState<CandidateUser[]>([]);
//   const [potentialLeaders, setPotentialLeaders] = useState<CandidateUser[]>([]);
//
//   const [formData, setFormData] = useState({
//     teamName: team.teamName,
//     teamGoal: team.teamGoal || "",
//     status: team.status || "Active",
//     teamLeaderId: team.teamLeaderId ? team.teamLeaderId.toString() : "",
//   });
//
//   const [selectedMembers, setSelectedMembers] = useState<number[]>(
//     team.members
//       ? team.members
//           .map((m) => m.userId ?? m.employeeId)
//           .filter((id): id is number => id !== undefined && id !== null)
//       : []
//   );
//
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState("");
//
//   const getCurrentUserId = (): number => {
//     const user = authStorage.getUser();
//     return Number(user?.id || user?.userId || team.createdById || 1);
//   };
//
//   useEffect(() => {
//     const loadCandidates = async () => {
//       try {
//         const [members, users] = await Promise.all([
//           fetchCandidateMembers(team.departmentId),
//           fetchCandidateUsers(team.departmentId),
//         ]);
//
//         setEmployees(members);
//         setPotentialLeaders(users);
//       } catch (err) {
//         console.error("Failed to load candidates for edit", err);
//         setError("Failed to load potential members and leaders.");
//       }
//     };
//
//     loadCandidates();
//   }, [team.departmentId]);
//
//   const handleMemberToggle = (id: number) => {
//     setSelectedMembers((prev) =>
//       prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
//     );
//   };
//
//   const handleSubmit = async (e: FormEvent) => {
//     e.preventDefault();
//     setError("");
//
//     if (!formData.teamName || !formData.teamLeaderId) {
//       setError("Team Name and Team Leader are required.");
//       return;
//     }
//
//     try {
//       setLoading(true);
//
//       await updateTeam(team.id, {
//         teamName: formData.teamName.trim(),
//         departmentId: team.departmentId,
//         teamLeaderId: Number(formData.teamLeaderId),
//         createdById: getCurrentUserId(),
//         teamGoal: formData.teamGoal,
//         status: formData.status,
//         memberUserIds: selectedMembers,
//         memberEmployeeIds: selectedMembers,
//       });
//
//       onUpdate();
//     } catch (err: any) {
//       setError(
//         err.response?.data?.message ||
//           err.response?.data?.error ||
//           err.response?.data?.data ||
//           err.message ||
//           "Failed to update team."
//       );
//       console.error("Team update error:", err);
//     } finally {
//       setLoading(false);
//     }
//   };
//
//   return (
//     <div className="team-modal-overlay">
//       <div className="team-modal-content">
//         <div className="team-modal-header">
//           <h2>Edit Team: {team.teamName}</h2>
//           <button className="team-btn ghost" onClick={onClose}>
//             <i className="bi bi-x-lg"></i>
//           </button>
//         </div>
//
//         <div className="team-modal-body">
//           <form onSubmit={handleSubmit} id="team-edit-form">
//             <div className="team-field">
//               <label>
//                 Team Name <span className="team-required">*</span>
//               </label>
//               <input
//                 type="text"
//                 className="team-input"
//                 value={formData.teamName}
//                 onChange={(e) =>
//                   setFormData({ ...formData, teamName: e.target.value })
//                 }
//                 required
//               />
//             </div>
//
//             <div className="team-field">
//               <label>Department</label>
//               <input
//                 type="text"
//                 className="team-input"
//                 value={team.departmentName || ""}
//                 disabled
//               />
//               <small className="text-muted">Department cannot be changed.</small>
//             </div>
//
//             <div className="team-field">
//               <label>
//                 Team Leader <span className="team-required">*</span>
//               </label>
//               <select
//                 className="team-select"
//                 value={formData.teamLeaderId}
//                 onChange={(e) =>
//                   setFormData({ ...formData, teamLeaderId: e.target.value })
//                 }
//                 required
//               >
//                 <option value="">Select Leader</option>
//                 {potentialLeaders.map((leader) => {
//                   const isCurrentLeader = leader.id === team.teamLeaderId;
//                   const isDisabled =
//                     leader.isAvailable === false && !isCurrentLeader;
//
//                   return (
//                     <option
//                       key={leader.id}
//                       value={leader.id}
//                       disabled={isDisabled}
//                     >
//                       {leader.name}
//                       {isDisabled
//                         ? ` (Already in ${leader.currentTeamName})`
//                         : isCurrentLeader
//                         ? " (Current)"
//                         : ""}
//                     </option>
//                   );
//                 })}
//               </select>
//             </div>
//
//             <div className="team-field">
//               <label>Team Goal</label>
//               <textarea
//                 className="team-textarea"
//                 rows={3}
//                 value={formData.teamGoal}
//                 onChange={(e) =>
//                   setFormData({ ...formData, teamGoal: e.target.value })
//                 }
//               />
//             </div>
//
//             <div className="team-field">
//               <label>Members</label>
//               <div className="team-members-list">
//                 {employees.map((emp) => {
//                   const isCurrentMember = selectedMembers.includes(emp.id);
//                   const isLeader = Number(formData.teamLeaderId) === emp.id;
//                   const isDisabled =
//                     isLeader || (emp.isAvailable === false && !isCurrentMember);
//
//                   return (
//                     <label
//                       key={emp.id}
//                       className={`team-member-item ${
//                         isDisabled ? "disabled" : ""
//                       }`}
//                       title={
//                         isLeader
//                           ? "Team leader cannot also be a member"
//                           : isDisabled
//                           ? `This user is in ${emp.currentTeamName}`
//                           : ""
//                       }
//                     >
//                       <input
//                         type="checkbox"
//                         checked={isCurrentMember}
//                         onChange={() => handleMemberToggle(emp.id)}
//                         disabled={isDisabled}
//                       />
//                       <span>{emp.name}</span>
//                       {isDisabled && (
//                         <i
//                           className="bi bi-slash-circle ms-2 text-danger"
//                           style={{ fontSize: "0.8rem" }}
//                         />
//                       )}
//                     </label>
//                   );
//                 })}
//               </div>
//             </div>
//
//             <div className="team-field">
//               <label>Status</label>
//               <select
//                 className="team-select"
//                 value={formData.status}
//                 onChange={(e) =>
//                   setFormData({ ...formData, status: e.target.value })
//                 }
//               >
//                 <option value="Active">Active</option>
//                 <option value="Inactive">Inactive</option>
//               </select>
//               <small className="text-muted mt-1 d-block">
//                 Changing status to Active will fail if any selected member is
//                 currently active in another team.
//               </small>
//             </div>
//
//             {error && <div className="team-alert error mb-0">{error}</div>}
//           </form>
//         </div>
//
//         <div className="team-modal-footer">
//           <button type="button" className="team-btn secondary" onClick={onClose}>
//             Cancel
//           </button>
//           <button
//             type="submit"
//             form="team-edit-form"
//             className="team-btn primary"
//             disabled={loading}
//           >
//             <i
//               className={`bi ${
//                 loading ? "bi-arrow-repeat animate-spin" : "bi-check-lg"
//               }`}
//             />
//             {loading ? "Saving..." : "Save Changes"}
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// };
//
// export default TeamEditModal;




/*
import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  updateTeam,
  fetchCandidateUsers,
  fetchCandidateMembers,
} from "../../services/teamService";

import type { TeamResponse, CandidateUser } from "../../services/teamService";
import { authStorage } from "../../services/authStorage";

interface TeamEditModalProps {
  team: TeamResponse;
  onClose: () => void;
  onUpdate: () => void;
}

const TeamEditModal = ({ team, onClose, onUpdate }: TeamEditModalProps) => {
  const [employees, setEmployees] = useState<CandidateUser[]>([]);
  const [potentialLeaders, setPotentialLeaders] = useState<CandidateUser[]>([]);

  const [formData, setFormData] = useState({
    teamName: team.teamName || "",
    teamGoal: team.teamGoal || "",
    status: team.status || "Active",
    teamLeaderId: team.teamLeaderId ? String(team.teamLeaderId) : "",
  });

  const [selectedMembers, setSelectedMembers] = useState<number[]>(
    team.members
      ? team.members
          .map((m) => m.userId ?? m.employeeId)
          .filter((id): id is number => id !== undefined && id !== null)
      : []
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [changeMessages, setChangeMessages] = useState<string[]>([]);

  const getCurrentUserId = (): number | undefined => {
    const user = authStorage.getUser();
    const id = user?.id || user?.userId;
    return id ? Number(id) : undefined;
  };

  useEffect(() => {
    const loadCandidates = async () => {
      try {
        const [memberData, leaderData] = await Promise.all([
          fetchCandidateMembers(team.departmentId),
          fetchCandidateUsers(team.departmentId),
        ]);

        const currentLeaderExists = leaderData.some(
          (leader) => Number(leader.id) === Number(team.teamLeaderId)
        );

        const fixedLeaders = currentLeaderExists
          ? leaderData
          : [
              {
                id: team.teamLeaderId,
                name: team.teamLeaderName,
                isAvailable: true,
                currentTeamId: team.id,
                currentTeamName: team.teamName,
              },
              ...leaderData,
            ];

        setEmployees(memberData);
        setPotentialLeaders(fixedLeaders);
      } catch (err) {
        console.error("Failed to load candidates for edit", err);
        setError("Failed to load potential members and leaders.");
      }
    };

    loadCandidates();
  }, [team]);

  const originalMembers = useMemo(() => {
    return team.members
      ? team.members
          .map((m) => m.userId ?? m.employeeId)
          .filter((id): id is number => id !== undefined && id !== null)
      : [];
  }, [team.members]);

  const getMemberName = (id: number) => {
    const found = employees.find((e) => Number(e.id) === Number(id));
    return found?.name || `User ID ${id}`;
  };

  const getLeaderName = (id: number | string) => {
    const found = potentialLeaders.find((l) => Number(l.id) === Number(id));
    return found?.name || `User ID ${id}`;
  };

  const buildChangeMessages = () => {
    const changes: string[] = [];

    if (formData.teamName.trim() !== team.teamName) {
      changes.push(`Team name will change from "${team.teamName}" to "${formData.teamName.trim()}".`);
    }

    if ((formData.teamGoal || "") !== (team.teamGoal || "")) {
      changes.push("Team goal will be updated.");
    }

    if (Number(formData.teamLeaderId) !== Number(team.teamLeaderId)) {
      changes.push(
        `Team leader will change from "${team.teamLeaderName}" to "${getLeaderName(
          formData.teamLeaderId
        )}".`
      );
    }

    if ((formData.status || "").toLowerCase() !== (team.status || "").toLowerCase()) {
      if (formData.status.toLowerCase() === "inactive") {
        changes.push("Are you sure you are going to inactive this team?");
      } else {
        changes.push(`Team status will change from "${team.status}" to "${formData.status}".`);
      }
    }

    const addedMembers = selectedMembers.filter((id) => !originalMembers.includes(id));
    const removedMembers = originalMembers.filter((id) => !selectedMembers.includes(id));

    if (addedMembers.length > 0) {
      changes.push(
        `Members will be added: ${addedMembers.map(getMemberName).join(", ")}.`
      );
    }

    if (removedMembers.length > 0) {
      changes.push(
        `Members will be removed: ${removedMembers.map(getMemberName).join(", ")}.`
      );
    }

    return changes;
  };

  const handleMemberToggle = (id: number) => {
    setSelectedMembers((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };

  const getBackendError = (err: any) => {
    if (err?.response?.status === 403) {
      return "Request failed with status code 403. Please log out and log in again, then try once more.";
    }

    return (
      err.response?.data?.message ||
      err.response?.data?.error ||
      err.response?.data?.data ||
      err.message ||
      "Failed to update team."
    );
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.teamName.trim() || !formData.teamLeaderId) {
      setError("Team Name and Team Leader are required.");
      return;
    }

    const changes = buildChangeMessages();

    if (changes.length === 0) {
      setError("No changes detected.");
      return;
    }

    setChangeMessages(changes);
    setShowConfirmModal(true);
  };

  const confirmUpdate = async () => {
    try {
      setLoading(true);
      setError("");

      await updateTeam(team.id, {
        teamName: formData.teamName.trim(),
        departmentId: team.departmentId,
        teamLeaderId: Number(formData.teamLeaderId),
        createdById: getCurrentUserId(),
        teamGoal: formData.teamGoal,
        status: formData.status,
        memberUserIds: selectedMembers,
        memberEmployeeIds: selectedMembers,
      });

      setShowConfirmModal(false);
      onUpdate();
    } catch (err: any) {
      console.error("Team update error:", err);
      setShowConfirmModal(false);
      setError(getBackendError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="team-modal-overlay">
        <div className="team-modal-content">
          <div className="team-modal-header">
            <h2>Edit Team: {team.teamName}</h2>
            <button type="button" className="team-btn ghost" onClick={onClose}>
              <i className="bi bi-x-lg"></i>
            </button>
          </div>

          <div className="team-modal-body">
            <form onSubmit={handleSubmit} id="team-edit-form">
              <div className="team-field">
                <label>
                  Team Name <span className="team-required">*</span>
                </label>
                <input
                  type="text"
                  className="team-input"
                  value={formData.teamName}
                  onChange={(e) =>
                    setFormData({ ...formData, teamName: e.target.value })
                  }
                  required
                />
              </div>

              <div className="team-field">
                <label>Department</label>
                <input
                  type="text"
                  className="team-input"
                  value={team.departmentName || ""}
                  disabled
                />
                <small className="text-muted">Department cannot be changed.</small>
              </div>

              <div className="team-field">
                <label>
                  Team Leader <span className="team-required">*</span>
                </label>
                <select
                  className="team-select"
                  value={formData.teamLeaderId}
                  onChange={(e) =>
                    setFormData({ ...formData, teamLeaderId: e.target.value })
                  }
                  required
                >
                  <option value="">Select Leader</option>

                  {potentialLeaders.map((leader) => {
                    const isCurrentLeader =
                      Number(leader.id) === Number(team.teamLeaderId);

                    const isDisabled =
                      leader.isAvailable === false && !isCurrentLeader;

                    return (
                      <option
                        key={leader.id}
                        value={leader.id}
                        disabled={isDisabled}
                      >
                        {leader.name}
                        {isCurrentLeader
                          ? " (Current)"
                          : isDisabled
                          ? ` (Already in ${leader.currentTeamName})`
                          : ""}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="team-field">
                <label>Team Goal</label>
                <textarea
                  className="team-textarea"
                  rows={3}
                  value={formData.teamGoal}
                  onChange={(e) =>
                    setFormData({ ...formData, teamGoal: e.target.value })
                  }
                />
              </div>

              <div className="team-field">
                <label>Members</label>

                <div className="team-members-list">
                  {employees.map((emp) => {
                    const isCurrentMember = selectedMembers.includes(emp.id);
                    const isLeader = Number(formData.teamLeaderId) === emp.id;

                    const isDisabled =
                      isLeader || (emp.isAvailable === false && !isCurrentMember);

                    return (
                      <label
                        key={emp.id}
                        className={`team-member-item ${
                          isDisabled ? "disabled" : ""
                        }`}
                        title={
                          isLeader
                            ? "Team leader cannot also be a member"
                            : isDisabled
                            ? `This user is in ${emp.currentTeamName}`
                            : ""
                        }
                      >
                        <input
                          type="checkbox"
                          checked={isCurrentMember}
                          onChange={() => handleMemberToggle(emp.id)}
                          disabled={isDisabled}
                        />
                        <span>{emp.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="team-field">
                <label>Status</label>
                <select
                  className="team-select"
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({ ...formData, status: e.target.value })
                  }
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              {error && <div className="team-alert error mb-0">{error}</div>}
            </form>
          </div>

          <div className="team-modal-footer">
            <button
              type="button"
              className="team-btn secondary"
              onClick={onClose}
            >
              Cancel
            </button>

            <button
              type="submit"
              form="team-edit-form"
              className="team-btn primary"
              disabled={loading}
            >
              <i
                className={`bi ${
                  loading ? "bi-arrow-repeat animate-spin" : "bi-check-lg"
                }`}
              />
              {loading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </div>

      {showConfirmModal && (
        <div className="team-modal-overlay" style={{ zIndex: 1100 }}>
          <div className="team-modal-content">
            <div className="team-modal-header">
              <h2>Confirm Changes</h2>
              <button
                type="button"
                className="team-btn ghost"
                onClick={() => setShowConfirmModal(false)}
              >
                <i className="bi bi-x-lg"></i>
              </button>
            </div>

            <div className="team-modal-body">
              <p>Please confirm the following changes:</p>

              <ul style={{ paddingLeft: "20px", lineHeight: "1.8" }}>
                {changeMessages.map((msg, index) => (
                  <li key={index}>{msg}</li>
                ))}
              </ul>
            </div>

            <div className="team-modal-footer">
              <button
                type="button"
                className="team-btn secondary"
                onClick={() => setShowConfirmModal(false)}
                disabled={loading}
              >
                No
              </button>

              <button
                type="button"
                className="team-btn primary"
                onClick={confirmUpdate}
                disabled={loading}
              >
                {loading ? "Saving..." : "Yes, Apply Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default TeamEditModal; */













import React, { useEffect, useMemo, useState } from 'react';
import {
  countReasonWords,
  fetchCandidateMembers,
  fetchCandidateProjectManagers,
  fetchCandidateUsers,
  fetchMyDepartmentCandidateMembers,
  fetchMyDepartmentCandidateProjectManagers,
  fetchMyDepartmentCandidateUsers,
  formatCandidateLabel,
  isReasonOverLimit,
  updateMyDepartmentTeam,
  updateTeam,
  type CandidateUser,
  type Department,
  type TeamRequest,
  type TeamResponse,
} from '../../services/teamService';

type Props = {
  open: boolean;
  team: TeamResponse | null;
  departments?: Department[];
  isDepartmentHead?: boolean;
  onClose: () => void;
  onSaved: () => void;
};

const getApiErrorMessage = (err: any) => {
  return (
    err?.response?.data?.message ||
    err?.response?.data?.error ||
    err?.message ||
    'Request failed.'
  );
};

const TeamEditModal: React.FC<Props> = ({
  open,
  team,
  departments = [],
  isDepartmentHead = false,
  onClose,
  onSaved,
}) => {
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
  const [reason, setReason] = useState('');

  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState('');

  const selectedLeaderIdNumber = teamLeaderId ? Number(teamLeaderId) : null;
  const selectedProjectManagerIdNumber = projectManagerId ? Number(projectManagerId) : null;

  useEffect(() => {
    if (!open || !team) {
      return;
    }

    setDepartmentId(team.departmentId ? String(team.departmentId) : '');
    setTeamName(team.teamName ?? '');
    setTeamGoal(team.teamGoal ?? '');
    setStatus(team.status ?? 'Active');
    setTeamLeaderId(team.teamLeaderId ? String(team.teamLeaderId) : '');
    setProjectManagerId(team.projectManagerId ? String(team.projectManagerId) : '');
    setSelectedMemberIds(
      Array.isArray(team.members)
        ? team.members
            .map((member) => member.userId ?? member.employeeId)
            .filter((id): id is number => typeof id === 'number')
        : []
    );
    setReason('');
    setError('');
  }, [open, team]);

  useEffect(() => {
    if (!open || !team) {
      return;
    }

    let cancelled = false;

    const loadCandidates = async () => {
      setLoadingCandidates(true);
      setError('');

      try {
        if (isDepartmentHead) {
          const [leaderData, memberData, pmData] = await Promise.all([
            fetchMyDepartmentCandidateUsers(),
            fetchMyDepartmentCandidateMembers(),
            fetchMyDepartmentCandidateProjectManagers(),
          ]);

          if (!cancelled) {
            setLeaders(Array.isArray(leaderData) ? leaderData : []);
            setMembers(Array.isArray(memberData) ? memberData : []);
            setProjectManagers(Array.isArray(pmData) ? pmData : []);
          }

          return;
        }

        const deptId = Number(departmentId || team.departmentId);

        if (!deptId) {
          if (!cancelled) {
            setLeaders([]);
            setMembers([]);
            setProjectManagers([]);
          }

          return;
        }

        const [leaderData, memberData, pmData] = await Promise.all([
          fetchCandidateUsers(deptId),
          fetchCandidateMembers(deptId),
          fetchCandidateProjectManagers(deptId),
        ]);

        if (!cancelled) {
          setLeaders(Array.isArray(leaderData) ? leaderData : []);
          setMembers(Array.isArray(memberData) ? memberData : []);
          setProjectManagers(Array.isArray(pmData) ? pmData : []);
        }
      } catch {
        if (!cancelled) {
          setError('Failed to load team candidates.');
          setLeaders([]);
          setMembers([]);
          setProjectManagers([]);
        }
      } finally {
        if (!cancelled) {
          setLoadingCandidates(false);
        }
      }
    };

    loadCandidates();

    return () => {
      cancelled = true;
    };
  }, [open, team, departmentId, isDepartmentHead]);

  useEffect(() => {
    if (!teamLeaderId) {
      return;
    }

    if (projectManagerId && projectManagerId === teamLeaderId) {
      setProjectManagerId('');
    }

    setSelectedMemberIds((prev) => prev.filter((id) => id !== Number(teamLeaderId)));
  }, [teamLeaderId, projectManagerId]);

  useEffect(() => {
    if (!projectManagerId) {
      return;
    }

    setSelectedMemberIds((prev) => prev.filter((id) => id !== Number(projectManagerId)));
  }, [projectManagerId]);

  const availableProjectManagers = useMemo(() => {
    return projectManagers.filter((pm) => pm.id !== selectedLeaderIdNumber);
  }, [projectManagers, selectedLeaderIdNumber]);

  const memberRows = useMemo(() => {
    const existingMemberIds = new Set(selectedMemberIds);

    return members.map((member) => {
      const isLeader = selectedLeaderIdNumber === member.id;
      const isProjectManager = selectedProjectManagerIdNumber === member.id;

      const alreadyInOtherTeam =
        (member.available === false || member.isAvailable === false) &&
        !existingMemberIds.has(member.id);

      return {
        ...member,
        disabled: isLeader || isProjectManager || alreadyInOtherTeam,
        disabledReason: isLeader
          ? 'Selected as Team Leader'
          : isProjectManager
            ? 'Selected as Project Manager'
            : alreadyInOtherTeam
              ? member.currentTeamName
                ? `Already in ${member.currentTeamName}`
                : 'Already in another team'
              : '',
      };
    });
  }, [members, selectedLeaderIdNumber, selectedProjectManagerIdNumber, selectedMemberIds]);

  const reasonWordCount = countReasonWords(reason);

  const toggleMember = (memberId: number) => {
    setSelectedMemberIds((prev) => {
      if (prev.includes(memberId)) {
        return prev.filter((id) => id !== memberId);
      }

      return [...prev, memberId];
    });
  };

  const validateForm = () => {
    if (!team) {
      return 'Team is required.';
    }

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

    if (!reason.trim()) {
      return 'Please enter the reason for this team change.';
    }

    if (isReasonOverLimit(reason)) {
      return 'Cannot exceed more than 250 words.';
    }

    return '';
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!team) {
      return;
    }

    setError('');

    const validationMessage = validateForm();

    if (validationMessage) {
      setError(validationMessage);
      return;
    }

    setSaving(true);

    try {
      const request: TeamRequest = {
        teamName: teamName.trim(),
        departmentId: isDepartmentHead ? team.departmentId : Number(departmentId),
        teamLeaderId: Number(teamLeaderId),
        projectManagerId: projectManagerId ? Number(projectManagerId) : null,
        teamGoal: teamGoal.trim(),
        status,
        reason: reason.trim(),
        memberUserIds: selectedMemberIds,
        memberEmployeeIds: selectedMemberIds,
      };

      if (isDepartmentHead) {
        await updateMyDepartmentTeam(team.id, request);
      } else {
        await updateTeam(team.id, request);
      }

      onSaved();
      onClose();
    } catch (err: any) {
      setError(getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (!open || !team) {
    return null;
  }








  return (
    <div className="team-modal-overlay" onClick={onClose}>
      <div className="team-modal" onClick={(event) => event.stopPropagation()}>
        <div className="team-modal-header">
          <div>
            <p className="team-eyebrow">Team Organization</p>
            <h2>Edit Team</h2>
          </div>

          <button type="button" className="team-modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        <form onSubmit={handleSave} className="team-modal-body">
          {!isDepartmentHead && (
            <div className="team-field">
              <label>Department</label>
              <select
                value={departmentId}
                onChange={(event) => setDepartmentId(event.target.value)}
              >
                <option value="">Select Department</option>

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
              You can only edit teams inside your assigned department.
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
              disabled={loadingCandidates}
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
              disabled={loadingCandidates}
            >
              <option value="">Optional - Select Project Manager</option>

              {availableProjectManagers.map((pm) => (
                <option key={pm.id} value={pm.id}>
                  {formatCandidateLabel(pm)}
                </option>
              ))}
            </select>

            <small>
              Optional. Project Manager can manage many teams, but cannot be Team Leader or a
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

          <div className="team-field">
            <label>
              Reason for change <span className="team-required">*</span>
            </label>

            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Explain why this team change is being made..."
              rows={4}
            />

            <small className={reasonWordCount > 250 ? 'team-limit-error' : ''}>
              {reasonWordCount}/250 words
              {reasonWordCount > 250 ? ' — Cannot exceed more than 250 words.' : ''}
            </small>
          </div>

          {error && <div className="team-error">{error}</div>}

          <div className="team-modal-footer">
            <button
              type="button"
              className="team-btn team-btn-secondary"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>

            <button type="submit" className="team-btn team-btn-primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TeamEditModal;