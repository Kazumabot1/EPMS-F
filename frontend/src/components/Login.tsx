/*
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import type { ApiEnvelope, AuthResponse } from '../types/auth';
import './login.css';
import { useAuth } from '../contexts/AuthContext';
import aceLogo from '../assets/Ace.png';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const navigate = useNavigate();
  const { login } = useAuth();

  const normalizeRoleName = (role: string) =>
    role
      .replace(/^ROLE_/i, '')
      .replace(/[\s-]+/g, '_')
      .toUpperCase();

  const resolveRoute = (dashboard?: string, roles: string[] = []) => {
    const normalizedRoles = roles.map(normalizeRoleName);

    if (normalizedRoles.includes('ADMIN') || dashboard === 'ADMIN_DASHBOARD') {
      return '/admin/dashboard';
    }

    switch (dashboard) {
      case 'EMPLOYEE_DASHBOARD':
        return '/employee/dashboard';

      case 'MANAGER_DASHBOARD':
        return '/manager/dashboard';

      case 'DEPARTMENT_HEAD_DASHBOARD':
        return '/department-head/dashboard';

      case 'EXECUTIVE_DASHBOARD':
        return '/executive/dashboard';

      case 'HR_DASHBOARD':
        return '/dashboard';

      default:
        if (normalizedRoles.includes('HR')) {
          return '/dashboard';
        }

        if (
          normalizedRoles.includes('DEPARTMENT_HEAD') ||
          normalizedRoles.includes('DEPARTMENTHEAD')
        ) {
          return '/department-head/dashboard';
        }

        if (normalizedRoles.includes('MANAGER')) {
          return '/manager/dashboard';
        }

        return '/employee/dashboard';
    }
  };

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();

    setError('');
    setIsSubmitting(true);

    try {
      const res = await api.post<ApiEnvelope<AuthResponse>>('/auth/login', {
        email: email.trim(),
        password,
      });

      const payload = res.data.data;

      if (!payload?.accessToken || !payload?.refreshToken) {
        throw new Error('Login response did not include tokens.');
      }

      login(payload);

      navigate(
        payload.mustChangePassword
          ? '/change-password'
          : resolveRoute(payload.dashboard, payload.roles ?? []),
        { replace: true },
      );
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          err?.message ||
          'Login failed. Please check your email/password.',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-shell">
        <div className="login-showcase">
          <div className="login-showcase-stars" aria-hidden="true">
            <span className="star star-1" />
            <span className="star star-2" />
            <span className="star star-3" />
            <span className="star star-4" />
            <span className="star star-5" />
          </div>
          <img className="showcase-logo" src={aceLogo} alt="ACE Data Systems" />
          <h2>Welcome back!</h2>
          <p>You can sign in to access your existing account.</p>
        </div>

        <div className="login-card">
          <div className="login-card-header">
            <h1>Sign In</h1>
          </div>

          <form onSubmit={handleLogin} className="login-form">
            <label className="login-label" htmlFor="email">
              Username or email
            </label>

            <input
              id="email"
              className="login-input"
              type="email"
              placeholder="Username or email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />

            <label className="login-label" htmlFor="password">
              Password
            </label>

            <input
              id="password"
              className="login-input"
              type="password"
              placeholder="Password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />

            <div className="login-form-actions">
              <label className="remember-wrap">
                <input type="checkbox" />
                <span>Remember me</span>
              </label>

              <a
                className="forgot-password-link"
                href="mailto:support@acedatasystemsltd.com?subject=Password%20Reset%20Request"
              >
                Forgot password?
              </a>
            </div>

            {error && <p className="login-error">{error}</p>}

            <button className="login-submit" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Login; */







import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import type { ApiEnvelope, AuthResponse } from '../types/auth';
import './login.css';
import { useAuth } from '../contexts/AuthContext';
import aceLogo from '../assets/Ace.png';

type ForgotStep = 'email' | 'otp' | 'reset' | 'done';

const getErrorMessage = (err: any, fallback: string) =>
  err?.response?.data?.message ||
  err?.response?.data?.error ||
  err?.message ||
  fallback;

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotStep, setForgotStep] = useState<ForgotStep>('email');
  const [forgotEmail, setForgotEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [forgotMessage, setForgotMessage] = useState('');
  const [forgotError, setForgotError] = useState('');
  const [forgotSubmitting, setForgotSubmitting] = useState(false);

  const navigate = useNavigate();
  const { login } = useAuth();

  const normalizeRoleName = (role: string) =>
    role
      .replace(/^ROLE_/i, '')
      .replace(/[\s-]+/g, '_')
      .toUpperCase();

  const resolveRoute = (dashboard?: string, roles: string[] = []) => {
    const normalizedRoles = roles.map(normalizeRoleName);

    if (normalizedRoles.includes('ADMIN') || dashboard === 'ADMIN_DASHBOARD') {
      return '/admin/dashboard';
    }

    switch (dashboard) {
      case 'EMPLOYEE_DASHBOARD':
        return '/employee/dashboard';
      case 'MANAGER_DASHBOARD':
        return '/manager/dashboard';
      case 'DEPARTMENT_HEAD_DASHBOARD':
        return '/department-head/dashboard';
      case 'EXECUTIVE_DASHBOARD':
        return '/executive/dashboard';
      case 'HR_DASHBOARD':
        return '/dashboard';
      default:
        if (normalizedRoles.includes('HR')) {
          return '/dashboard';
        }
        if (normalizedRoles.includes('DEPARTMENT_HEAD') || normalizedRoles.includes('DEPARTMENTHEAD')) {
          return '/department-head/dashboard';
        }
        if (normalizedRoles.includes('MANAGER')) {
          return '/manager/dashboard';
        }
        return '/employee/dashboard';
    }
  };

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();

    setError('');
    setIsSubmitting(true);

    try {
      const res = await api.post<ApiEnvelope<AuthResponse>>('/auth/login', {
        email: email.trim(),
        password,
      });

      const payload = res.data.data;

      if (!payload?.accessToken || !payload?.refreshToken) {
        throw new Error('Login response did not include tokens.');
      }

      login(payload);

      navigate(
        payload.mustChangePassword
          ? '/change-password'
          : resolveRoute(payload.dashboard, payload.roles ?? []),
        { replace: true },
      );
    } catch (err: any) {
      setError(getErrorMessage(err, 'Login failed. Please check your email/password.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const openForgotModal = () => {
    setForgotStep('email');
    setForgotEmail(email.trim());
    setOtp('');
    setResetToken('');
    setNewPassword('');
    setConfirmPassword('');
    setForgotMessage('');
    setForgotError('');
    setShowForgotModal(true);
  };

  const closeForgotModal = () => {
    setShowForgotModal(false);
    setForgotSubmitting(false);
  };

  const requestOtp = async (event: React.FormEvent) => {
    event.preventDefault();
    setForgotError('');
    setForgotMessage('');

    if (!forgotEmail.trim()) {
      setForgotError('Email is required.');
      return;
    }

    try {
      setForgotSubmitting(true);
      const response = await api.post<ApiEnvelope<void>>('/auth/forgot-password/request', {
        email: forgotEmail.trim(),
      });
      setForgotMessage(response.data.message || 'If this email exists, we sent an OTP.');
      setForgotStep('otp');
    } catch (err: any) {
      setForgotError(getErrorMessage(err, 'Unable to send OTP.'));
    } finally {
      setForgotSubmitting(false);
    }
  };

  const verifyOtp = async (event: React.FormEvent) => {
    event.preventDefault();
    setForgotError('');
    setForgotMessage('');

    if (!/^\d{6}$/.test(otp.trim())) {
      setForgotError('Please enter the 6-digit OTP code.');
      return;
    }

    try {
      setForgotSubmitting(true);
      const response = await api.post<ApiEnvelope<{ resetToken: string }>>('/auth/forgot-password/verify', {
        email: forgotEmail.trim(),
        otp: otp.trim(),
      });
      setResetToken(response.data.data.resetToken);
      setForgotMessage('OTP verified. Please enter your new password.');
      setForgotStep('reset');
    } catch (err: any) {
      setForgotError(getErrorMessage(err, 'Invalid OTP.'));
    } finally {
      setForgotSubmitting(false);
    }
  };

  const resetPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setForgotError('');
    setForgotMessage('');

    if (newPassword.length < 8) {
      setForgotError('New password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setForgotError('New password and confirm password do not match.');
      return;
    }

    try {
      setForgotSubmitting(true);
      await api.post<ApiEnvelope<void>>('/auth/forgot-password/reset', {
        resetToken,
        newPassword,
        confirmPassword,
      });
      setForgotStep('done');
      setForgotMessage('Password reset successfully. You can now sign in.');
      setPassword('');
      setEmail(forgotEmail.trim());
    } catch (err: any) {
      setForgotError(getErrorMessage(err, 'Unable to reset password.'));
    } finally {
      setForgotSubmitting(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-shell">
        <div className="login-showcase">
          <div className="login-showcase-stars" aria-hidden="true">
            <span className="star star-1" />
            <span className="star star-2" />
            <span className="star star-3" />
            <span className="star star-4" />
            <span className="star star-5" />
          </div>
          <img className="showcase-logo" src={aceLogo} alt="ACE Data Systems" />
          <h2>Welcome back!</h2>
          <p>You can sign in to access your existing account.</p>
        </div>

        <div className="login-card">
          <div className="login-card-header">
            <h1>Sign In</h1>
          </div>

          <form onSubmit={handleLogin} className="login-form">
            <label className="login-label" htmlFor="email">
              Username or email
            </label>

            <input
              id="email"
              className="login-input"
              type="email"
              placeholder="Username or email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />

            <label className="login-label" htmlFor="password">
              Password
            </label>

            <input
              id="password"
              className="login-input"
              type="password"
              placeholder="Password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />

            <div className="login-form-actions">
              <label className="remember-wrap">
                <input type="checkbox" />
                <span>Remember me</span>
              </label>

              <button type="button" className="forgot-link" onClick={openForgotModal}>
                Forgot password?
              </button>
            </div>

            {error && <div className="login-alert">{error}</div>}

            <button className="login-submit" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>

      {showForgotModal && (
        <div className="forgot-modal-backdrop" role="presentation">
          <div className="forgot-modal" role="dialog" aria-modal="true" aria-labelledby="forgot-password-title">
            <button type="button" className="forgot-modal-close" onClick={closeForgotModal} aria-label="Close">
              ×
            </button>

            <h2 id="forgot-password-title">Forgot password</h2>
            <p className="forgot-modal-subtitle">
              {forgotStep === 'email' && 'Enter your Gmail address and we will send a 6-digit OTP.'}
              {forgotStep === 'otp' && 'Enter the 6-digit OTP sent to your Gmail address.'}
              {forgotStep === 'reset' && 'Set a new password for your account.'}
              {forgotStep === 'done' && 'Your password has been reset successfully.'}
            </p>

            {forgotError && <div className="login-alert">{forgotError}</div>}
            {forgotMessage && <div className="forgot-success">{forgotMessage}</div>}

            {forgotStep === 'email' && (
              <form className="login-form" onSubmit={requestOtp}>
                <label className="login-label" htmlFor="forgotEmail">
                  Gmail
                </label>
                <input
                  id="forgotEmail"
                  className="login-input"
                  type="email"
                  placeholder="yourname@gmail.com"
                  value={forgotEmail}
                  onChange={(event) => setForgotEmail(event.target.value)}
                  required
                />
                <button className="login-submit" type="submit" disabled={forgotSubmitting}>
                  {forgotSubmitting ? 'Sending OTP...' : 'Send OTP'}
                </button>
              </form>
            )}

            {forgotStep === 'otp' && (
              <form className="login-form" onSubmit={verifyOtp}>
                <label className="login-label" htmlFor="otp">
                  OTP Code
                </label>
                <input
                  id="otp"
                  className="login-input"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="123456"
                  value={otp}
                  onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))}
                  required
                />
                <button className="login-submit" type="submit" disabled={forgotSubmitting}>
                  {forgotSubmitting ? 'Verifying...' : 'Enter'}
                </button>
                <button type="button" className="forgot-secondary" onClick={() => setForgotStep('email')}>
                  Change email
                </button>
              </form>
            )}

            {forgotStep === 'reset' && (
              <form className="login-form" onSubmit={resetPassword}>
                <label className="login-label" htmlFor="newPassword">
                  New Password
                </label>
                <input
                  id="newPassword"
                  className="login-input"
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  required
                />

                <label className="login-label" htmlFor="confirmPassword">
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  className="login-input"
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  required
                />

                <button className="login-submit" type="submit" disabled={forgotSubmitting}>
                  {forgotSubmitting ? 'Resetting...' : 'Reset Password'}
                </button>
              </form>
            )}

            {forgotStep === 'done' && (
              <button type="button" className="login-submit" onClick={closeForgotModal}>
                Back to Sign In
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default Login;