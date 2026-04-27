import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { resolveUserRole } from '../../config/roleNavigation';
import './force-change-password.css';

const ForceChangePasswordPage = () => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const currentRole = resolveUserRole(user);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }
    try {
      setLoading(true);
      await api.post('/auth/change-password', { currentPassword, newPassword });
      if (user) {
        login({
          accessToken: localStorage.getItem('epmsAccessToken') || '',
          refreshToken: localStorage.getItem('epmsRefreshToken') || '',
          tokenType: 'Bearer',
          expiresIn: 3600,
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          employeeCode: user.employeeCode,
          position: user.position,
          roles: user.roles,
          permissions: user.permissions,
          dashboard: user.dashboard,
          mustChangePassword: false,
        });
      }
      navigate(currentRole === 'Employee' ? '/employee/dashboard' : '/dashboard', { replace: true });
    } catch (err: unknown) {
      const message =
        typeof err === 'object' &&
        err !== null &&
        'response' in err &&
        typeof (err as { response?: { data?: { message?: string } } }).response?.data?.message ===
          'string'
          ? (err as { response: { data: { message: string } } }).response.data.message
          : 'Failed to change password';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="force-password-screen">
      <div className="force-password-overlay" />
      <div className="force-password-modal" role="dialog" aria-modal="true" aria-labelledby="force-password-title">
        <div className="force-password-icon">
          <i className="bi bi-shield-lock" />
        </div>
        <h1 id="force-password-title">Change Temporary Password</h1>
        <p>
          For security, please update your temporary password before continuing to your{' '}
          {currentRole === 'Employee' ? 'Employee Dashboard' : 'HR Dashboard'}.
        </p>

        <form onSubmit={handleSubmit} className="force-password-form">
          <input
            type="password"
            className="force-password-input"
            placeholder="Current temporary password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
          />
          <input
            type="password"
            className="force-password-input"
            placeholder="New password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />
          <input
            type="password"
            className="force-password-input"
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
          {error && <p className="force-password-error">{error}</p>}
          <button
            type="submit"
            className="force-password-submit"
            disabled={loading}
          >
            {loading ? 'Updating...' : 'Change password'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ForceChangePasswordPage;
