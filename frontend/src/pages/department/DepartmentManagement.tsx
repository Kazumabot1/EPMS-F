/*
import { useEffect, useMemo, useState } from 'react';
import {
  createDepartment,
  deleteDepartment,
  fetchDepartments,
  updateDepartment,
} from '../../services/departmentService';
import type { Department } from '../../services/departmentService';
import './department-ui.css';

 */
/* ─── helpers ─────────────────────────────────────────── *//*

const getErrorMessage = (error: unknown, fallback: string) => {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const r = (error as { response?: { data?: { message?: string; error?: string } } }).response;
    return r?.data?.message || r?.data?.error || fallback;
  }
  return fallback;
};

interface FormValues {
  departmentName: string;
  departmentCode: string;
  headEmployee: string;
  status: boolean;
}

const emptyForm: FormValues = {
  departmentName: '',
  departmentCode: '',
  headEmployee: '',
  status: true,
};

 */
/* ─── component ───────────────────────────────────────── *//*

const DepartmentManagement = () => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading]         = useState(true);
  const [saving, setSaving]           = useState(false);
  const [message, setMessage]         = useState('');
  const [isError, setIsError]         = useState(false);
  const [query, setQuery]             = useState('');

   */
/* modal state *//*

  const [showModal, setShowModal]               = useState(false);
  const [editing, setEditing]                   = useState<Department | null>(null);
  const [form, setForm]                         = useState<FormValues>(emptyForm);
  const [showConfirm, setShowConfirm]           = useState(false);
  const [confirmMessages, setConfirmMessages]   = useState<string[]>([]);

   */
/* ── data loading ─────────────────────────────────── *//*

  const loadDepartments = async () => {
    try {
      setLoading(true);
      setMessage('');
      setDepartments(await fetchDepartments());
    } catch (err) {
      setDepartments([]);
      setMessage(getErrorMessage(err, 'Unable to load departments.'));
      setIsError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadDepartments(); }, []);

  const filteredDepartments = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return departments;
    return departments.filter((d) =>
      [d.departmentName, d.departmentCode, d.headEmployee, d.createdBy]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    );
  }, [departments, query]);

   */
/* ── open / close modal ───────────────────────────── *//*

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setMessage('');
    setShowModal(true);
  };

  const openEdit = (dept: Department) => {
    setEditing(dept);
    setForm({
      departmentName: dept.departmentName || '',
      departmentCode: dept.departmentCode || '',
      headEmployee:   dept.headEmployee   || '',
      status:         dept.status !== false,
    });
    setMessage('');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditing(null);
    setShowConfirm(false);
    setConfirmMessages([]);
  };

   */
/* ── form field helper ────────────────────────────── *//*

  const setField = <K extends keyof FormValues>(key: K, value: FormValues[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

   */
/* ── build change summary for confirm dialog ──────── *//*

  const buildChanges = (): string[] => {
    if (!editing) return [];
    const changes: string[] = [];

    if (form.departmentName.trim() !== (editing.departmentName || ''))
      changes.push(`Name: "${editing.departmentName}" → "${form.departmentName.trim()}"`);

    if ((form.departmentCode.trim() || '') !== (editing.departmentCode || ''))
      changes.push(`Code: "${editing.departmentCode || '(none)'}" → "${form.departmentCode.trim() || '(none)'}"`);

    if ((form.headEmployee.trim() || '') !== (editing.headEmployee || ''))
      changes.push(`Head Employee: "${editing.headEmployee || '(none)'}" → "${form.headEmployee.trim() || '(none)'}"`);

    const currentStatus = editing.status !== false;
    if (form.status !== currentStatus)
      changes.push(`Status: ${currentStatus ? 'Active' : 'Inactive'} → ${form.status ? 'Active' : 'Inactive'}`);

    return changes;
  };

   */
/* ── submit ───────────────────────────────────────── *//*

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.departmentName.trim()) return;

    if (editing) {
      const changes = buildChanges();
      if (changes.length === 0) {
        setMessage('No changes detected.');
        setIsError(false);
        return;
      }
      setConfirmMessages(changes);
      setShowConfirm(true);
    } else {
      doCreate();
    }
  };

  const doCreate = async () => {
    try {
      setSaving(true);
      setMessage('');
      await createDepartment({
        departmentName: form.departmentName.trim(),
        departmentCode: form.departmentCode.trim() || null,
        headEmployee:   form.headEmployee.trim()   || null,
      });
      await loadDepartments();
      closeModal();
      setMessage('Department created successfully.');
      setIsError(false);
    } catch (err) {
      setMessage(getErrorMessage(err, 'Unable to create department.'));
      setIsError(true);
    } finally {
      setSaving(false);
    }
  };

  const doUpdate = async () => {
    if (!editing) return;
    try {
      setSaving(true);
      setMessage('');
      await updateDepartment(editing.id, {
        departmentName: form.departmentName.trim(),
        departmentCode: form.departmentCode.trim() || null,
        headEmployee:   form.headEmployee.trim()   || null,
        status:         form.status,
      });
      await loadDepartments();
      closeModal();
      setMessage('Department updated successfully.');
      setIsError(false);
    } catch (err) {
      setShowConfirm(false);
      setMessage(getErrorMessage(err, 'Unable to update department.'));
      setIsError(true);
    } finally {
      setSaving(false);
    }
  };

   */
/* ── delete / deactivate ──────────────────────────── *//*

  const handleDelete = async (dept: Department) => {
    if (!window.confirm(`Deactivate "${dept.departmentName}"?`)) return;
    try {
      setMessage('');
      await deleteDepartment(dept.id);
      await loadDepartments();
      setMessage('Department deactivated successfully.');
      setIsError(false);
    } catch (err) {
      setMessage(getErrorMessage(err, 'Unable to deactivate department.'));
      setIsError(true);
    }
  };

   */
/* ── render ───────────────────────────────────────── *//*

  return (
    <div className="team-page">

      { */
/* Hero *//*
}
      <div className="team-hero">
        <span className="team-hero-badge">
          <i className="bi bi-building" />
          Organization
        </span>
        <h1>Departments</h1>
        <p>Create, update, and deactivate departments for your organization.</p>
      </div>

      { */
/* Global feedback *//*
}
      {message && !showModal && (
        <div className={`team-alert ${isError ? 'error' : 'success'}`}>
          <i className={`bi ${isError ? 'bi-exclamation-triangle' : 'bi-check-circle'} me-2`} />
          {message}
        </div>
      )}

      { */
/* Table card *//*
}
      <div className="team-surface">
        <div className="team-surface-inner">

          { */
/* Toolbar *//*
}
          <div className="team-table-toolbar">
            <div>
              <h2>Department List</h2>
              <p className="text-muted">Total: {departments.length}</p>
            </div>
            <button className="team-btn primary" onClick={openCreate}>
              <i className="bi bi-plus-lg" />
              Create Department
            </button>
          </div>

          { */
/* Search *//*
}
          <div style={{ marginBottom: 16 }}>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search departments…"
              className="team-search-input"
              style={{ maxWidth: 380 }}
            />
          </div>

          { */
/* Content *//*
}
          {loading ? (
            <div className="team-state">
              <i className="bi bi-hourglass-split" />
              Loading departments…
            </div>
          ) : filteredDepartments.length === 0 ? (
            <div className="team-state">
              <i className="bi bi-building" />
              <p>No departments found. Click <strong>Create Department</strong> to add one.</p>
            </div>
          ) : (
            <div className="team-table-wrap">
              <table className="team-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Department Name</th>
                    <th>Code</th>
                    <th>Head Employee</th>
                    <th>Status</th>
                    <th>Created By</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDepartments.map((dept) => (
                    <tr key={dept.id}>
                      <td>{dept.id}</td>
                      <td><strong>{dept.departmentName || '-'}</strong></td>
                      <td>{dept.departmentCode || '-'}</td>
                      <td>{dept.headEmployee || '-'}</td>
                      <td>
                        <span className={`team-pill ${dept.status === false ? 'inactive' : 'active'}`}>
                          {dept.status === false ? 'Inactive' : 'Active'}
                        </span>
                      </td>
                      <td>{dept.createdBy || '-'}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            className="team-btn ghost"
                            onClick={() => openEdit(dept)}
                          >
                            <i className="bi bi-pencil-square" />
                            Edit
                          </button>
                          <button
                            className="team-btn ghost"
                            onClick={() => handleDelete(dept)}
                            style={{ color: '#dc2626' }}
                          >
                            <i className="bi bi-slash-circle" />
                            Deactivate
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      { */
/* ── Edit / Create Modal ─────────────────────── *//*
}
      {showModal && (
        <div className="team-modal-overlay">
          <div className="team-modal-content">

            <div className="team-modal-header">
              <h2>
                <i className={`bi ${editing ? 'bi-pencil-square' : 'bi-plus-circle'} me-2`} />
                {editing ? `Edit: ${editing.departmentName}` : 'Create Department'}
              </h2>
              <button type="button" className="team-btn ghost" onClick={closeModal}>
                <i className="bi bi-x-lg" />
              </button>
            </div>

            <div className="team-modal-body">
              { */
/* Inline error inside modal *//*
}
              {message && showModal && (
                <div className={`team-alert ${isError ? 'error' : 'success'}`} style={{ marginBottom: 12 }}>
                  {message}
                </div>
              )}

              <form id="dept-form" onSubmit={handleSubmit} className="team-form">

                <div className="team-field">
                  <label>
                    Department Name <span className="team-required">*</span>
                  </label>
                  <input
                    className="team-input"
                    value={form.departmentName}
                    onChange={(e) => setField('departmentName', e.target.value)}
                    placeholder="e.g. Human Resources"
                    required
                  />
                </div>

                <div className="team-field">
                  <label>
                    Department Code{' '}
                    <span style={{ color: '#94a3b8', fontWeight: 400 }}>(optional)</span>
                  </label>
                  <input
                    className="team-input"
                    value={form.departmentCode}
                    onChange={(e) => setField('departmentCode', e.target.value)}
                    placeholder="e.g. HR, FIN, ENG"
                  />
                </div>

                <div className="team-field">
                  <label>
                    Head Employee{' '}
                    <span style={{ color: '#94a3b8', fontWeight: 400 }}>(optional)</span>
                  </label>
                  <input
                    className="team-input"
                    value={form.headEmployee}
                    onChange={(e) => setField('headEmployee', e.target.value)}
                    placeholder="Name or employee code of the department head"
                  />
                </div>

                { */
/* Status — edit only *//*
}
                {editing && (
                  <div className="team-field">
                    <label>Status</label>
                    <select
                      className="team-select"
                      value={form.status ? 'active' : 'inactive'}
                      onChange={(e) => setField('status', e.target.value === 'active')}
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                )}
              </form>
            </div>

            <div className="team-modal-footer">
              <button
                type="button"
                className="team-btn secondary"
                onClick={closeModal}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="submit"
                form="dept-form"
                className="team-btn primary"
                disabled={saving}
              >
                <i className={`bi ${saving ? 'bi-arrow-repeat animate-spin' : editing ? 'bi-check-lg' : 'bi-plus-lg'}`} />
                {saving ? 'Saving…' : editing ? 'Save Changes' : 'Create Department'}
              </button>
            </div>
          </div>
        </div>
      )}

      { */
/* ── Confirm Changes Modal ────────────────────── *//*
}
      {showConfirm && (
        <div className="team-modal-overlay" style={{ zIndex: 1100 }}>
          <div className="team-modal-content">

            <div className="team-modal-header">
              <h2>Confirm Changes</h2>
              <button
                type="button"
                className="team-btn ghost"
                onClick={() => setShowConfirm(false)}
              >
                <i className="bi bi-x-lg" />
              </button>
            </div>

            <div className="team-modal-body">
              <p>
                The following changes will be applied to{' '}
                <strong>{editing?.departmentName}</strong>:
              </p>
              <ul style={{ paddingLeft: 20, lineHeight: 1.9, marginTop: 10 }}>
                {confirmMessages.map((msg, i) => (
                  <li key={i}>{msg}</li>
                ))}
              </ul>
            </div>

            <div className="team-modal-footer">
              <button
                type="button"
                className="team-btn secondary"
                onClick={() => setShowConfirm(false)}
                disabled={saving}
              >
                No, Go Back
              </button>
              <button
                type="button"
                className="team-btn primary"
                onClick={doUpdate}
                disabled={saving}
              >
                <i className={`bi ${saving ? 'bi-arrow-repeat animate-spin' : 'bi-check-lg'}`} />
                {saving ? 'Saving…' : 'Yes, Apply Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DepartmentManagement;
 */






import { useEffect, useMemo, useState } from 'react';
import {
  createDepartment,
  deleteDepartment,
  fetchDepartments,
  updateDepartment,
} from '../../services/departmentService';
import type { Department } from '../../services/departmentService';
import './department-ui.css';

const getErrorMessage = (error: unknown, fallback: string) => {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const r = (error as { response?: { data?: { message?: string; error?: string } } }).response;
    return r?.data?.message || r?.data?.error || fallback;
  }
  return error instanceof Error ? error.message : fallback;
};

interface FormValues {
  departmentName: string;
  departmentCode: string;
  headEmployee: string;
  status: boolean;
  reason: string;
}

const emptyForm: FormValues = {
  departmentName: '',
  departmentCode: '',
  headEmployee: '',
  status: true,
  reason: '',
};

const DepartmentManagement = () => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [query, setQuery] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Department | null>(null);
  const [form, setForm] = useState<FormValues>(emptyForm);
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmMessages, setConfirmMessages] = useState<string[]>([]);

  const [deactivateTarget, setDeactivateTarget] = useState<Department | null>(null);
  const [deactivateReason, setDeactivateReason] = useState('');

  const loadDepartments = async () => {
    try {
      setLoading(true);
      setMessage('');
      setDepartments(await fetchDepartments());
    } catch (err) {
      setDepartments([]);
      setMessage(getErrorMessage(err, 'Unable to load departments.'));
      setIsError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadDepartments();
  }, []);

  const filteredDepartments = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return departments;
    return departments.filter((d) =>
      [d.departmentName, d.departmentCode, d.headEmployee, d.createdBy]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    );
  }, [departments, query]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setMessage('');
    setShowModal(true);
  };

  const openEdit = (dept: Department) => {
    setEditing(dept);
    setForm({
      departmentName: dept.departmentName || '',
      departmentCode: dept.departmentCode || '',
      headEmployee: dept.headEmployee || '',
      status: dept.status !== false,
      reason: '',
    });
    setMessage('');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditing(null);
    setShowConfirm(false);
    setConfirmMessages([]);
    setForm(emptyForm);
  };

  const setField = <K extends keyof FormValues>(key: K, value: FormValues[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const buildChanges = (): string[] => {
    if (!editing) return [];
    const changes: string[] = [];

    if (form.departmentName.trim() !== (editing.departmentName || '')) {
      changes.push(`Name: "${editing.departmentName}" -> "${form.departmentName.trim()}"`);
    }

    if ((form.departmentCode.trim() || '') !== (editing.departmentCode || '')) {
      changes.push(`Code: "${editing.departmentCode || '(none)'}" -> "${form.departmentCode.trim() || '(none)'}"`);
    }

    if ((form.headEmployee.trim() || '') !== (editing.headEmployee || '')) {
      changes.push(`Head Employee: "${editing.headEmployee || '(none)'}" -> "${form.headEmployee.trim() || '(none)'}"`);
    }

    const currentStatus = editing.status !== false;
    if (form.status !== currentStatus) {
      changes.push(`Status: ${currentStatus ? 'Active' : 'Inactive'} -> ${form.status ? 'Active' : 'Inactive'}`);
    }

    return changes;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setIsError(false);

    if (!form.departmentName.trim()) {
      setMessage('Department name is required.');
      setIsError(true);
      return;
    }

    if (editing) {
      const changes = buildChanges();
      if (changes.length === 0) {
        setMessage('No changes detected.');
        setIsError(false);
        return;
      }
      if (!form.reason.trim()) {
        setMessage('Reason is required for edit or deactivate.');
        setIsError(true);
        return;
      }
      setConfirmMessages(changes);
      setShowConfirm(true);
    } else {
      void doCreate();
    }
  };

  const doCreate = async () => {
    try {
      setSaving(true);
      setMessage('');
      await createDepartment({
        departmentName: form.departmentName.trim(),
        departmentCode: form.departmentCode.trim() || null,
        headEmployee: form.headEmployee.trim() || null,
      });
      await loadDepartments();
      closeModal();
      setMessage('Department created successfully.');
      setIsError(false);
    } catch (err) {
      setMessage(getErrorMessage(err, 'Unable to create department.'));
      setIsError(true);
    } finally {
      setSaving(false);
    }
  };

  const doUpdate = async () => {
    if (!editing) return;
    try {
      setSaving(true);
      setMessage('');
      await updateDepartment(editing.id, {
        departmentName: form.departmentName.trim(),
        departmentCode: form.departmentCode.trim() || null,
        headEmployee: form.headEmployee.trim() || null,
        status: form.status,
        reason: form.reason.trim(),
      });
      await loadDepartments();
      closeModal();
      setMessage('Department updated successfully.');
      setIsError(false);
    } catch (err) {
      setShowConfirm(false);
      setMessage(getErrorMessage(err, 'Unable to update department.'));
      setIsError(true);
    } finally {
      setSaving(false);
    }
  };

  const openDeactivate = (dept: Department) => {
    setDeactivateTarget(dept);
    setDeactivateReason('');
    setMessage('');
  };

  const closeDeactivate = () => {
    setDeactivateTarget(null);
    setDeactivateReason('');
  };

  const confirmDeactivate = async () => {
    if (!deactivateTarget) return;
    if (!deactivateReason.trim()) {
      setMessage('Reason is required for edit or deactivate.');
      setIsError(true);
      return;
    }

    try {
      setSaving(true);
      setMessage('');
      await deleteDepartment(deactivateTarget.id, deactivateReason.trim());
      await loadDepartments();
      closeDeactivate();
      setMessage('Department deactivated successfully.');
      setIsError(false);
    } catch (err) {
      setMessage(getErrorMessage(err, 'Unable to deactivate department.'));
      setIsError(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="team-page">
      <div className="team-hero">
        <span className="team-hero-badge">
          <i className="bi bi-building" />
          Organization
        </span>
        <h1>Departments</h1>
        <p>Create, update, and deactivate departments for your organization.</p>
      </div>

      {message && !showModal && (
        <div className={`team-alert ${isError ? 'error' : 'success'}`}>
          <i className={`bi ${isError ? 'bi-exclamation-triangle' : 'bi-check-circle'} me-2`} />
          {message}
        </div>
      )}

      <div className="team-surface">
        <div className="team-surface-inner">
          <div className="team-table-toolbar">
            <div>
              <h2>Department List</h2>
              <p className="text-muted">Total: {departments.length}</p>
            </div>
            <button className="team-btn primary" onClick={openCreate}>
              <i className="bi bi-plus-lg" />
              Create Department
            </button>
          </div>

          <div style={{ marginBottom: 16 }}>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search departments..."
              className="team-search-input"
              style={{ maxWidth: 380 }}
            />
          </div>

          {loading ? (
            <div className="team-state">
              <i className="bi bi-hourglass-split" />
              Loading departments...
            </div>
          ) : filteredDepartments.length === 0 ? (
            <div className="team-state">
              <i className="bi bi-building" />
              <p>No departments found. Click <strong>Create Department</strong> to add one.</p>
            </div>
          ) : (
            <div className="team-table-wrap">
              <table className="team-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Department Name</th>
                    <th>Code</th>
                    <th>Head Employee</th>
                    <th>Status</th>
                    <th>Created By</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDepartments.map((dept) => (
                    <tr key={dept.id}>
                      <td>{dept.id}</td>
                      <td><strong>{dept.departmentName || '-'}</strong></td>
                      <td>{dept.departmentCode || '-'}</td>
                      <td>{dept.headEmployee || '-'}</td>
                      <td>
                        <span className={`team-pill ${dept.status === false ? 'inactive' : 'active'}`}>
                          {dept.status === false ? 'Inactive' : 'Active'}
                        </span>
                      </td>
                      <td>{dept.createdBy || '-'}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="team-btn ghost" onClick={() => openEdit(dept)}>
                            <i className="bi bi-pencil-square" />
                            Edit
                          </button>
                          {dept.status !== false && (
                            <button
                              className="team-btn ghost"
                              onClick={() => openDeactivate(dept)}
                              style={{ color: '#dc2626' }}
                            >
                              <i className="bi bi-slash-circle" />
                              Deactivate
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="team-modal-overlay">
          <div className="team-modal-content">
            <div className="team-modal-header">
              <h2>
                <i className={`bi ${editing ? 'bi-pencil-square' : 'bi-plus-circle'} me-2`} />
                {editing ? `Edit: ${editing.departmentName}` : 'Create Department'}
              </h2>
              <button type="button" className="team-btn ghost" onClick={closeModal}>
                <i className="bi bi-x-lg" />
              </button>
            </div>

            <div className="team-modal-body">
              {message && showModal && (
                <div className={`team-alert ${isError ? 'error' : 'success'}`} style={{ marginBottom: 12 }}>
                  {message}
                </div>
              )}

              <form id="dept-form" onSubmit={handleSubmit} className="team-form">
                <div className="team-field">
                  <label>Department Name <span className="team-required">*</span></label>
                  <input
                    className="team-input"
                    value={form.departmentName}
                    onChange={(e) => setField('departmentName', e.target.value)}
                    placeholder="e.g. Human Resources"
                    required
                  />
                </div>

                <div className="team-field">
                  <label>Department Code <span style={{ color: '#94a3b8', fontWeight: 400 }}>(optional)</span></label>
                  <input
                    className="team-input"
                    value={form.departmentCode}
                    onChange={(e) => setField('departmentCode', e.target.value)}
                    placeholder="e.g. HR, FIN, ENG"
                  />
                </div>

                <div className="team-field">
                  <label>Head Employee <span style={{ color: '#94a3b8', fontWeight: 400 }}>(optional)</span></label>
                  <input
                    className="team-input"
                    value={form.headEmployee}
                    onChange={(e) => setField('headEmployee', e.target.value)}
                    placeholder="Name or employee code of the department head"
                  />
                </div>

                {editing && (
                  <>
                    <div className="team-field">
                      <label>Status</label>
                      <select
                        className="team-select"
                        value={form.status ? 'active' : 'inactive'}
                        onChange={(e) => setField('status', e.target.value === 'active')}
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>

                    <div className="team-field">
                      <label>Reason <span className="team-required">*</span></label>
                      <textarea
                        className="team-input"
                        value={form.reason}
                        onChange={(e) => setField('reason', e.target.value.slice(0, 150))}
                        placeholder="Why is this department being edited?"
                        rows={3}
                        required
                      />
                      <small>{form.reason.length}/150</small>
                    </div>
                  </>
                )}
              </form>
            </div>

            <div className="team-modal-footer">
              <button type="button" className="team-btn secondary" onClick={closeModal} disabled={saving}>Cancel</button>
              <button type="submit" form="dept-form" className="team-btn primary" disabled={saving}>
                <i className={`bi ${saving ? 'bi-arrow-repeat animate-spin' : editing ? 'bi-check-lg' : 'bi-plus-lg'}`} />
                {saving ? 'Saving...' : editing ? 'Save Changes' : 'Create Department'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showConfirm && (
        <div className="team-modal-overlay" style={{ zIndex: 1100 }}>
          <div className="team-modal-content">
            <div className="team-modal-header">
              <h2>Confirm Changes</h2>
              <button type="button" className="team-btn ghost" onClick={() => setShowConfirm(false)}>
                <i className="bi bi-x-lg" />
              </button>
            </div>

            <div className="team-modal-body">
              <p>The following changes will be applied to <strong>{editing?.departmentName}</strong>:</p>
              <ul style={{ paddingLeft: 20, lineHeight: 1.9, marginTop: 10 }}>
                {confirmMessages.map((msg, i) => <li key={i}>{msg}</li>)}
              </ul>
              <p style={{ marginTop: 12 }}><strong>Reason:</strong> {form.reason}</p>
            </div>

            <div className="team-modal-footer">
              <button type="button" className="team-btn secondary" onClick={() => setShowConfirm(false)} disabled={saving}>No, Go Back</button>
              <button type="button" className="team-btn primary" onClick={doUpdate} disabled={saving}>
                <i className={`bi ${saving ? 'bi-arrow-repeat animate-spin' : 'bi-check-lg'}`} />
                {saving ? 'Saving...' : 'Yes, Apply Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deactivateTarget && (
        <div className="team-modal-overlay" style={{ zIndex: 1100 }}>
          <div className="team-modal-content">
            <div className="team-modal-header">
              <h2>Deactivate Department</h2>
              <button type="button" className="team-btn ghost" onClick={closeDeactivate}>
                <i className="bi bi-x-lg" />
              </button>
            </div>
            <div className="team-modal-body">
              <p>Deactivate <strong>{deactivateTarget.departmentName}</strong>?</p>
              <div className="team-field" style={{ marginTop: 12 }}>
                <label>Reason <span className="team-required">*</span></label>
                <textarea
                  className="team-input"
                  rows={3}
                  maxLength={150}
                  value={deactivateReason}
                  onChange={(e) => setDeactivateReason(e.target.value)}
                  placeholder="Why is this department being deactivated?"
                  required
                />
                <small>{deactivateReason.length}/150</small>
              </div>
            </div>
            <div className="team-modal-footer">
              <button type="button" className="team-btn secondary" onClick={closeDeactivate} disabled={saving}>Cancel</button>
              <button type="button" className="team-btn primary" onClick={confirmDeactivate} disabled={saving || !deactivateReason.trim()}>
                <i className={`bi ${saving ? 'bi-arrow-repeat animate-spin' : 'bi-slash-circle'}`} />
                {saving ? 'Saving...' : 'Deactivate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DepartmentManagement;