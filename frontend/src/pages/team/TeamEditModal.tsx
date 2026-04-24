// KHN new file
// Modal component to update an existing team's details, leader, and members

import { useEffect, useState, type FormEvent } from "react";
import {
  updateTeam,
  fetchCandidateUsers,
  fetchCandidateMembers,
} from "../../services/teamService";

import type {
  TeamResponse,
  CandidateUser,
} from "../../services/teamService";
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
    teamName: team.teamName,
    teamGoal: team.teamGoal || "",
    status: team.status || "Active",
    teamLeaderId: team.teamLeaderId ? team.teamLeaderId.toString() : "",
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

  const getCurrentUserId = (): number => {
    const user = authStorage.getUser();
    return Number(user?.id || user?.userId || team.createdById || 1);
  };

  useEffect(() => {
    const loadCandidates = async () => {
      try {
        const [members, users] = await Promise.all([
          fetchCandidateMembers(team.departmentId),
          fetchCandidateUsers(team.departmentId),
        ]);

        setEmployees(members);
        setPotentialLeaders(users);
      } catch (err) {
        console.error("Failed to load candidates for edit", err);
        setError("Failed to load potential members and leaders.");
      }
    };

    loadCandidates();
  }, [team.departmentId]);

  const handleMemberToggle = (id: number) => {
    setSelectedMembers((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.teamName || !formData.teamLeaderId) {
      setError("Team Name and Team Leader are required.");
      return;
    }

    try {
      setLoading(true);

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

      onUpdate();
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          err.response?.data?.error ||
          err.response?.data?.data ||
          err.message ||
          "Failed to update team."
      );
      console.error("Team update error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="team-modal-overlay">
      <div className="team-modal-content">
        <div className="team-modal-header">
          <h2>Edit Team: {team.teamName}</h2>
          <button className="team-btn ghost" onClick={onClose}>
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
                  const isCurrentLeader = leader.id === team.teamLeaderId;
                  const isDisabled =
                    leader.isAvailable === false && !isCurrentLeader;

                  return (
                    <option
                      key={leader.id}
                      value={leader.id}
                      disabled={isDisabled}
                    >
                      {leader.name}
                      {isDisabled
                        ? ` (Already in ${leader.currentTeamName})`
                        : isCurrentLeader
                        ? " (Current)"
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
                      {isDisabled && (
                        <i
                          className="bi bi-slash-circle ms-2 text-danger"
                          style={{ fontSize: "0.8rem" }}
                        />
                      )}
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
              <small className="text-muted mt-1 d-block">
                Changing status to Active will fail if any selected member is
                currently active in another team.
              </small>
            </div>

            {error && <div className="team-alert error mb-0">{error}</div>}
          </form>
        </div>

        <div className="team-modal-footer">
          <button type="button" className="team-btn secondary" onClick={onClose}>
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
  );
};

export default TeamEditModal;