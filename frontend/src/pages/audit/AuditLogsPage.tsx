/*
import { useEffect, useMemo, useState } from 'react';
import api from '../../services/api';
import { extractErrorMessage } from '../../services/apiError';
import { authStorage } from '../../services/authStorage';
import '../position/position-ui.css';

type AuditLog = {
  id: number;
  userId?: number | null;
  changedByName?: string | null;
  action: string;
  entityType: string;
  entityId: number;
  changedColumn?: string | null;
  oldValue?: string | null;
  newValue?: string | null;
  reason?: string | null;
  timestamp?: string | null;
};

type ApiEnvelope<T> = {
  success?: boolean;
  message?: string;
  data?: T;
};

const ENTITY_LABELS: Record<string, string> = {
  DEPARTMENT: 'Department',
  POSITION_LEVEL: 'Position Level',
  ROLE: 'Role',
};

const normalizeRoleName = (role: string) =>
  role
    .replace(/^ROLE_/i, '')
    .replace(/[\s-]+/g, '_')
    .toUpperCase();

const formatEntity = (entityType: string) => ENTITY_LABELS[entityType] ?? entityType;

const formatDateTime = (value?: string | null) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
};

const formatValue = (value?: string | null) => {
  if (value === null || value === undefined || value === '') return '-';
  if (value === 'true') return 'Active';
  if (value === 'false') return 'Inactive';
  return value;
};

const AuditLogsPage = () => {
  const user = authStorage.getUser();
  const normalizedRoles = (user?.roles ?? []).map(normalizeRoleName);
  const isAdmin = normalizedRoles.includes('ADMIN') || user?.dashboard === 'ADMIN_DASHBOARD';

  const entityOptions = useMemo(
    () => [
      { value: '', label: 'All allowed logs' },
      { value: 'DEPARTMENT', label: 'Department' },
      { value: 'POSITION_LEVEL', label: 'Position Level' },
      ...(isAdmin ? [{ value: 'ROLE', label: 'Role' }] : []),
    ],
    [isAdmin],
  );

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [entityType, setEntityType] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadLogs = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await api.get<ApiEnvelope<AuditLog[]> | AuditLog[]>('/audit-logs', {
        params: entityType ? { entityType } : {},
      });
      const payload = response.data;
      const data = Array.isArray(payload) ? payload : payload.data ?? [];
      setLogs(data);
    } catch (err) {
      setError(extractErrorMessage(err, 'Unable to load audit logs.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadLogs();
  }, [entityType]);

  return (
    <div className="position-page">
      <div className="position-hero">
        <div>
          <span className="position-eyebrow">History</span>
          <h1>Audit Logs</h1>
          <p>
            Review department, position level, and role changes with old value, new value,
            reason, and the person who made the change.
          </p>
        </div>
      </div>

      <section className="position-surface">
        <div className="position-surface-inner">
          <div className="position-table-toolbar">
            <div>
              <h2>Change History</h2>
              <p>Admin can view role logs. HR can view department and position level logs.</p>
            </div>

            <div className="position-form-actions" style={{ marginTop: 0 }}>
              <select
                className="position-input"
                value={entityType}
                onChange={(event) => setEntityType(event.target.value)}
                style={{ minWidth: 210 }}
              >
                {entityOptions.map((option) => (
                  <option key={option.value || 'all'} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <button type="button" className="position-btn secondary" onClick={loadLogs} disabled={loading}>
                Refresh
              </button>
            </div>
          </div>

          {error && <div className="position-alert error">{error}</div>}

          {loading ? (
            <div className="position-state">Loading audit logs...</div>
          ) : logs.length === 0 ? (
            <div className="position-state">
              <i className="bi bi-clock-history" />
              No audit logs found.
            </div>
          ) : (
            <div className="position-table-wrap">
              <table className="position-table">
                <thead>
                  <tr>
                    <th>Changed At</th>
                    <th>Entity</th>
                    <th>Column</th>
                    <th>Old Value</th>
                    <th>New Value</th>
                    <th>Changed By</th>
                    <th>Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id}>
                      <td>{formatDateTime(log.timestamp)}</td>
                      <td>
                        <strong>{formatEntity(log.entityType)}</strong>
                        <br />
                        <small>ID: {log.entityId}</small>
                      </td>
                      <td>{log.changedColumn || '-'}</td>
                      <td>{formatValue(log.oldValue)}</td>
                      <td>{formatValue(log.newValue)}</td>
                      <td>{log.changedByName || (log.userId ? `User #${log.userId}` : '-')}</td>
                      <td>{log.reason || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default AuditLogsPage; */

/*

import { useEffect, useMemo, useState } from 'react';
import api from '../../services/api';
import { extractErrorMessage } from '../../services/apiError';
import { authStorage } from '../../services/authStorage';
import '../position/position-ui.css';

type AuditLog = {
  id: number;
  userId?: number | null;
  changedByName?: string | null;
  action: string;
  entityType: string;
  entityId: number;
  changedColumn?: string | null;
  oldValue?: string | null;
  newValue?: string | null;
  reason?: string | null;
  timestamp?: string | null;
};

type ApiEnvelope<T> = {
  success?: boolean;
  message?: string;
  data?: T;
};

const ENTITY_LABELS: Record<string, string> = {
  DEPARTMENT: 'Department',
  POSITION_LEVEL: 'Position Level',
  POSITION: 'Position',
  ROLE: 'Role',
};

const normalizeRoleName = (role: string) =>
  role
    .replace(/^ROLE_/i, '')
    .replace(/[\s-]+/g, '_')
    .toUpperCase();

const formatEntity = (entityType: string) => ENTITY_LABELS[entityType] ?? entityType;

const formatDateTime = (value?: string | null) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
};

const formatValue = (value?: string | null) => {
  if (value === null || value === undefined || value === '') return '-';
  if (value === 'true') return 'Active';
  if (value === 'false') return 'Inactive';
  return value;
};

const AuditLogsPage = () => {
  const user = authStorage.getUser();
  const normalizedRoles = (user?.roles ?? []).map(normalizeRoleName);
  const isAdmin = normalizedRoles.includes('ADMIN') || user?.dashboard === 'ADMIN_DASHBOARD';

  const entityOptions = useMemo(
    () => [
      { value: '', label: 'All allowed logs' },
      { value: 'DEPARTMENT', label: 'Department' },
      { value: 'POSITION_LEVEL', label: 'Position Level' },
      { value: 'POSITION', label: 'Position' },
      ...(isAdmin ? [{ value: 'ROLE', label: 'Role' }] : []),
    ],
    [isAdmin],
  );

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [entityType, setEntityType] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadLogs = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await api.get<ApiEnvelope<AuditLog[]> | AuditLog[]>('/audit-logs', {
        params: entityType ? { entityType } : {},
      });
      const payload = response.data;
      const data = Array.isArray(payload) ? payload : payload.data ?? [];
      setLogs(data);
    } catch (err) {
      setError(extractErrorMessage(err, 'Unable to load audit logs.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadLogs();
  }, [entityType]);

  return (
    <div className="position-page">
      <div className="position-hero">
        <div>
          <span className="position-hero-badge">History</span>
          <h1>Audit Logs</h1>
          <p>
            Review department, position level, position, and role changes with old value,
            new value, reason, and the person who made the change.
          </p>
        </div>
      </div>

      <section className="position-surface">
        <div className="position-surface-inner">
          <div className="position-table-toolbar" style={{ justifyContent: 'space-between' }}>
            <div>
              <h2>Change History</h2>
              <p>Admin can view role logs. HR can view department, position level, and position logs.</p>
            </div>

            <div className="position-form-actions" style={{ marginTop: 0 }}>
              <select
                className="position-input"
                value={entityType}
                onChange={(event) => setEntityType(event.target.value)}
                style={{ minWidth: 210 }}
              >
                {entityOptions.map((option) => (
                  <option key={option.value || 'all'} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <button type="button" className="position-btn secondary" onClick={loadLogs} disabled={loading}>
                Refresh
              </button>
            </div>
          </div>

          {error && <div className="position-alert error">{error}</div>}

          {loading ? (
            <div className="position-state">Loading audit logs...</div>
          ) : logs.length === 0 ? (
            <div className="position-state">
              <i className="bi bi-clock-history" />
              No audit logs found.
            </div>
          ) : (
            <div className="position-table-wrap">
              <table className="position-table">
                <thead>
                  <tr>
                    <th>Changed At</th>
                    <th>Entity</th>
                    <th>Column</th>
                    <th>Old Value</th>
                    <th>New Value</th>
                    <th>Changed By</th>
                    <th>Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id}>
                      <td>{formatDateTime(log.timestamp)}</td>
                      <td>
                        <strong>{formatEntity(log.entityType)}</strong>
                        <br />
                        <small>ID: {log.entityId}</small>
                      </td>
                      <td>{log.changedColumn || '-'}</td>
                      <td>{formatValue(log.oldValue)}</td>
                      <td>{formatValue(log.newValue)}</td>
                      <td>{log.changedByName || (log.userId ? `User #${log.userId}` : '-')}</td>
                      <td>{log.reason || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default AuditLogsPage;
 */










import { useEffect, useMemo, useState } from 'react';
import api from '../../services/api';
import { extractErrorMessage } from '../../services/apiError';
import { authStorage } from '../../services/authStorage';
import '../position/position-ui.css';

type AuditLog = {
  id: number;
  userId?: number | null;
  changedByName?: string | null;
  action: string;
  entityType: string;
  entityId: number;
  changedColumn?: string | null;
  oldValue?: string | null;
  newValue?: string | null;
  reason?: string | null;
  timestamp?: string | null;
};

type AuditLogEditor = {
  userId: number;
  displayName: string;
  roleName: string;
  label: string;
};

type ApiEnvelope<T> = {
  success?: boolean;
  message?: string;
  data?: T;
};

const ENTITY_LABELS: Record<string, string> = {
  DEPARTMENT: 'Department',
  POSITION_LEVEL: 'Position Level',
  POSITION: 'Position',
  ROLE: 'Role',
};

const normalizeRoleName = (role: string) =>
  role
    .replace(/^ROLE_/i, '')
    .replace(/[\s-]+/g, '_')
    .toUpperCase();

const unwrap = <T,>(payload: ApiEnvelope<T> | T, fallback: T): T => {
  if (Array.isArray(payload)) return payload as T;
  return (payload as ApiEnvelope<T>).data ?? fallback;
};

const formatEntity = (entityType: string) => ENTITY_LABELS[entityType] ?? entityType;

const formatDateTime = (value?: string | null) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
};

const formatValue = (value?: string | null) => {
  if (value === null || value === undefined || value === '') return '-';
  if (value === 'true') return 'Active';
  if (value === 'false') return 'Inactive';
  return value;
};

const AuditLogsPage = () => {
  const user = authStorage.getUser();
  const normalizedRoles = (user?.roles ?? []).map(normalizeRoleName);
  const isAdmin = normalizedRoles.includes('ADMIN') || user?.dashboard === 'ADMIN_DASHBOARD';

  const entityOptions = useMemo(
    () => [
      { value: '', label: 'All allowed logs' },
      { value: 'DEPARTMENT', label: 'Department' },
      { value: 'POSITION_LEVEL', label: 'Position Level' },
      { value: 'POSITION', label: 'Position' },
      ...(isAdmin ? [{ value: 'ROLE', label: 'Role' }] : []),
    ],
    [isAdmin],
  );

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [editors, setEditors] = useState<AuditLogEditor[]>([]);
  const [entityType, setEntityType] = useState('');
  const [selectedEditorId, setSelectedEditorId] = useState('');
  const [loading, setLoading] = useState(true);
  const [editorsLoading, setEditorsLoading] = useState(false);
  const [error, setError] = useState('');

  const loadEditors = async () => {
    if (!isAdmin) return;

    setEditorsLoading(true);

    try {
      const response = await api.get<ApiEnvelope<AuditLogEditor[]> | AuditLogEditor[]>('/audit-logs/editors');
      setEditors(unwrap<AuditLogEditor[]>(response.data, []));
    } catch (err) {
      setError(extractErrorMessage(err, 'Unable to load audit log editors.'));
    } finally {
      setEditorsLoading(false);
    }
  };

  const loadLogs = async () => {
    setLoading(true);
    setError('');

    const params: Record<string, string> = {};
    if (entityType) params.entityType = entityType;
    if (isAdmin && selectedEditorId) params.userId = selectedEditorId;

    try {
      const response = await api.get<ApiEnvelope<AuditLog[]> | AuditLog[]>('/audit-logs', { params });
      setLogs(unwrap<AuditLog[]>(response.data, []));
    } catch (err) {
      setError(extractErrorMessage(err, 'Unable to load audit logs.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadEditors();
  }, [isAdmin]);

  useEffect(() => {
    void loadLogs();
  }, [entityType, selectedEditorId]);

  return (
    <div className="position-page">
      <div className="position-hero">
        <div>
          <span className="position-hero-badge">History</span>
          <h1>Audit Logs</h1>
          <p>
            Review department, position level, position, and role changes with old value,
            new value, reason, and the person who made the change.
          </p>
        </div>
      </div>

      <section className="position-surface">
        <div className="position-surface-inner">
          <div className="position-table-toolbar" style={{ justifyContent: 'space-between', gap: 16 }}>
            <div>
              <h2>Change History</h2>
              <p>
                {isAdmin
                  ? 'Admin can view all HR/Admin edits and filter by editor.'
                  : 'HR can view only their own department, position level, and position edits.'}
              </p>
            </div>

            <div className="position-form-actions" style={{ marginTop: 0, flexWrap: 'wrap' }}>
              {isAdmin && (
                <select
                  className="position-input"
                  value={selectedEditorId}
                  onChange={(event) => setSelectedEditorId(event.target.value)}
                  style={{ minWidth: 230 }}
                  disabled={editorsLoading}
                >
                  <option value="">All Editors</option>
                  {editors.map((editor) => (
                    <option key={editor.userId} value={String(editor.userId)}>
                      {editor.label || `${editor.displayName} (${editor.roleName})`}
                    </option>
                  ))}
                </select>
              )}

              <select
                className="position-input"
                value={entityType}
                onChange={(event) => setEntityType(event.target.value)}
                style={{ minWidth: 210 }}
              >
                {entityOptions.map((option) => (
                  <option key={option.value || 'all'} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              <button type="button" className="position-btn secondary" onClick={loadLogs} disabled={loading}>
                Refresh
              </button>
            </div>
          </div>

          {error && <div className="position-alert error">{error}</div>}

          {loading ? (
            <div className="position-state">Loading audit logs...</div>
          ) : logs.length === 0 ? (
            <div className="position-state">
              <i className="bi bi-clock-history" />
              No audit logs found.
            </div>
          ) : (
            <div className="position-table-wrap">
              <table className="position-table">
                <thead>
                  <tr>
                    <th>Changed At</th>
                    <th>Action</th>
                    <th>Entity</th>
                    <th>Column</th>
                    <th>Old Value</th>
                    <th>New Value</th>
                    <th>Changed By</th>
                    <th>Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id}>
                      <td>{formatDateTime(log.timestamp)}</td>
                      <td>{log.action || '-'}</td>
                      <td>
                        <strong>{formatEntity(log.entityType)}</strong>
                        <br />
                        <small>ID: {log.entityId}</small>
                      </td>
                      <td>{log.changedColumn || '-'}</td>
                      <td>{formatValue(log.oldValue)}</td>
                      <td>{formatValue(log.newValue)}</td>
                      <td>{log.changedByName || (log.userId ? `User #${log.userId}` : '-')}</td>
                      <td>{log.reason || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default AuditLogsPage;