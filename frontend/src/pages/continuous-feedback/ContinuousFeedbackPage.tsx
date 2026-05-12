import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import '../../components/one-on-one.css';
import { extractErrorMessage } from '../../services/apiError';
import { authStorage } from '../../services/authStorage';
import {
  createContinuousFeedback,
  getContinuousFeedbackTeamEmployees,
  getContinuousFeedbackTeams,
  getGivenContinuousFeedback,
  getReceivedContinuousFeedback,
  type ContinuousFeedback,
} from '../../services/continuousFeedbackService';
import type { TeamEmployeeOption, TeamOption } from '../../services/oneOnOneService';

const categories = ['Positive', 'Improvement', 'General'];

const normalizeRoleName = (role: string) =>
  role.replace(/^ROLE_/i, '').replace(/[\s-]+/g, '_').toUpperCase();

const formatDate = (value?: string | null) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
};

const ContinuousFeedbackPage = () => {
  const location = useLocation();
  const user = authStorage.getUser();

  const normalizedRoles = (user?.roles ?? []).map(normalizeRoleName);
  const isEmployeeView =
    location.pathname.startsWith('/employee') ||
    normalizedRoles.includes('EMPLOYEE') ||
    user?.dashboard === 'EMPLOYEE_DASHBOARD';

  const [teams, setTeams] = useState<TeamOption[]>([]);
  const [employees, setEmployees] = useState<TeamEmployeeOption[]>([]);
  const [history, setHistory] = useState<ContinuousFeedback[]>([]);

  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [feedbackText, setFeedbackText] = useState('');
  const [category, setCategory] = useState('General');
  const [rating, setRating] = useState('');

  const [loading, setLoading] = useState(true);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const selectedTeam = useMemo(
    () => teams.find((team) => String(team.id) === selectedTeamId) ?? null,
    [teams, selectedTeamId],
  );

  const loadHistory = async () => {
    const data = isEmployeeView
      ? await getReceivedContinuousFeedback()
      : await getGivenContinuousFeedback();

    setHistory(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    let mounted = true;

    const loadInitial = async () => {
      setLoading(true);
      setError('');

      try {
        if (!isEmployeeView) {
          const teamData = await getContinuousFeedbackTeams();
          if (mounted) setTeams(Array.isArray(teamData) ? teamData : []);
        }

        const historyData = isEmployeeView
          ? await getReceivedContinuousFeedback()
          : await getGivenContinuousFeedback();

        if (mounted) setHistory(Array.isArray(historyData) ? historyData : []);
      } catch (err) {
        if (mounted) setError(extractErrorMessage(err, 'Failed to load continuous feedback.'));
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void loadInitial();

    return () => {
      mounted = false;
    };
  }, [isEmployeeView]);

  useEffect(() => {
    let mounted = true;

    const loadEmployees = async () => {
      if (!selectedTeamId) {
        setEmployees([]);
        setSelectedEmployeeId('');
        return;
      }

      setLoadingEmployees(true);
      setError('');
      setSuccess('');
      setEmployees([]);
      setSelectedEmployeeId('');

      try {
        const data = await getContinuousFeedbackTeamEmployees(Number(selectedTeamId));
        if (mounted) setEmployees(Array.isArray(data) ? data : []);
      } catch (err) {
        if (mounted) setError(extractErrorMessage(err, 'Failed to load team employees.'));
      } finally {
        if (mounted) setLoadingEmployees(false);
      }
    };

    void loadEmployees();

    return () => {
      mounted = false;
    };
  }, [selectedTeamId]);

  const resetForm = () => {
    setSelectedEmployeeId('');
    setFeedbackText('');
    setCategory('General');
    setRating('');
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    setError('');
    setSuccess('');

    if (!selectedTeamId) {
      setError('Please select a team.');
      return;
    }

    if (!selectedEmployeeId) {
      setError('Please select an employee.');
      return;
    }

    if (!feedbackText.trim()) {
      setError('Feedback message is required.');
      return;
    }

    const ratingNumber = rating ? Number(rating) : null;

    if (ratingNumber !== null && (ratingNumber < 1 || ratingNumber > 5)) {
      setError('Rating must be between 1 and 5.');
      return;
    }

    setSubmitting(true);

    try {
      await createContinuousFeedback({
        teamId: Number(selectedTeamId),
        employeeId: Number(selectedEmployeeId),
        feedbackText: feedbackText.trim(),
        category,
        rating: ratingNumber,
      });

      setSuccess('Continuous feedback submitted successfully.');
      resetForm();
      await loadHistory();
    } catch (err) {
      setError(extractErrorMessage(err, 'Failed to submit continuous feedback.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="oom-page">
      <div className="oom-header">
        <h1>Continuous Feedback</h1>
        <p>
          {isEmployeeView
            ? 'View continuous feedback you received from your Project Manager or Team Leader.'
            : 'Give feedback to active employees from your own teams only.'}
        </p>
      </div>

      {error && <div className="oom-alert oom-alert--error">{error}</div>}
      {success && <div className="oom-alert oom-alert--success">{success}</div>}

      {!isEmployeeView && (
        <div className="oom-card">
          <form className="oom-form" onSubmit={handleSubmit}>
            <div className="oom-field">
              <label className="oom-label">Team</label>
              <select
                className="oom-select"
                value={selectedTeamId}
                onChange={(event) => setSelectedTeamId(event.target.value)}
                disabled={loading || submitting}
                required
              >
                <option value="">
                  {loading ? 'Loading teams...' : teams.length === 0 ? 'No teams found' : '— Select Team —'}
                </option>

                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.teamName}
                  </option>
                ))}
              </select>
            </div>

            <div className="oom-field">
              <label className="oom-label">Department</label>
              <input
                className="oom-input"
                value={selectedTeam?.departmentName ?? ''}
                disabled
                placeholder="Auto selected by team"
              />
            </div>

            <div className="oom-field">
              <label className="oom-label">Employee</label>
              <select
                className="oom-select"
                value={selectedEmployeeId}
                onChange={(event) => setSelectedEmployeeId(event.target.value)}
                disabled={!selectedTeamId || loadingEmployees || submitting}
                required
              >
                <option value="">
                  {!selectedTeamId
                    ? '— Select a team first —'
                    : loadingEmployees
                      ? 'Loading employees...'
                      : employees.length === 0
                        ? 'No active employees in this team'
                        : '— Select Employee —'}
                </option>

                {employees.map((employee) => (
                  <option key={employee.employeeId} value={employee.employeeId}>
                    {employee.firstName} {employee.lastName}
                  </option>
                ))}
              </select>
            </div>

            <div className="oom-field">
              <label className="oom-label">Category</label>
              <select
                className="oom-select"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                disabled={submitting}
              >
                {categories.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <div className="oom-field">
              <label className="oom-label">Rating Optional</label>
              <select
                className="oom-select"
                value={rating}
                onChange={(event) => setRating(event.target.value)}
                disabled={submitting}
              >
                <option value="">No rating</option>
                <option value="1">1 - Needs improvement</option>
                <option value="2">2</option>
                <option value="3">3 - Good</option>
                <option value="4">4</option>
                <option value="5">5 - Excellent</option>
              </select>
            </div>

            <div className="oom-field">
              <label className="oom-label">Feedback Message</label>
              <textarea
                className="oom-textarea"
                value={feedbackText}
                onChange={(event) => setFeedbackText(event.target.value)}
                placeholder="Write feedback for this employee..."
                rows={5}
                maxLength={3000}
                disabled={submitting}
                required
              />
            </div>

            <button type="submit" className="oom-submit" disabled={submitting}>
              {submitting ? 'Submitting...' : 'Submit Feedback'}
            </button>
          </form>
        </div>
      )}

      <div className="oom-card" style={{ marginTop: 20 }}>
        <h2>{isEmployeeView ? 'Received Feedback' : 'My Feedback History'}</h2>

        {loading ? (
          <p>Loading feedback...</p>
        ) : history.length === 0 ? (
          <p>No continuous feedback found.</p>
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            {history.map((item) => (
              <div
                key={item.id}
                style={{
                  border: '1px solid #e5e7eb',
                  borderRadius: 12,
                  padding: 14,
                  background: '#fff',
                }}
              >
                <strong>{item.category}</strong>
                {item.rating ? <span> • Rating: {item.rating}/5</span> : null}
                <p style={{ margin: '8px 0' }}>{item.feedbackText}</p>
                <small>
                  Team: {item.teamName || '-'} • Employee: {item.employeeName || '-'} • Given by:{' '}
                  {item.giverName || '-'} • {formatDate(item.createdAt)}
                </small>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ContinuousFeedbackPage;