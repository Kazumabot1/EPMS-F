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

      case 'PROJECT_MANAGER_DASHBOARD':
        return '/project-manager/dashboard';

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

        if (
          normalizedRoles.includes('PROJECT_MANAGER') ||
          normalizedRoles.includes('PROJECTMANAGER')
        ) {
          return '/project-manager/dashboard';
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
        { replace: true }
      );
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          err?.message ||
          'Login failed. Please check your email/password.'
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

export default Login;