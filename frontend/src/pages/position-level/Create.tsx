/*
import { useState, type FormEvent } from 'react';
import { positionService } from '../../services/positionService';
import '../position/position-ui.css';

type FormState = {
  levelCode: string;
};

const initialForm: FormState = {
  levelCode: '',
};

const PositionLevelCreate = () => {
  const [form, setForm] = useState<FormState>(initialForm);
  const [formError, setFormError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = (): string => {
    if (form.levelCode.trim().length === 0) {
      return 'Level code is required.';
    }

    return '';
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const validationMessage = validate();
    setFormError(validationMessage);
    setSubmitError('');
    setSuccessMessage('');

    if (validationMessage) {
      return;
    }

    try {
      setIsSubmitting(true);
      const createdLevel = await positionService.createPositionLevel({
        levelCode: form.levelCode.trim(),
      });

      setSuccessMessage(`Position level "${createdLevel.levelCode}" created successfully.`);
      setForm(initialForm);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create position level.';
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="position-page">
      <div className="position-hero">
        <span className="position-hero-badge">
          <i className="bi bi-diagram-3" />
          Hierarchy Setup
        </span>
        <h1>Position Level Create</h1>
        <p>Define reusable level codes to standardize organizational position hierarchy.</p>
      </div>

      <div className="position-surface">
        <div className="position-surface-inner">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="position-field">
              <label htmlFor="levelCode">
                Level Code <span className="position-required">*</span>
              </label>
              <input
                id="levelCode"
                type="text"
                value={form.levelCode}
                onChange={(event) => setForm((prev) => ({ ...prev, levelCode: event.target.value }))}
                className="position-input"
                placeholder="Example: L1, SENIOR, EXEC"
                maxLength={50}
              />
            </div>

            {formError && <div className="position-alert error">{formError}</div>}
            {submitError && <div className="position-alert error">{submitError}</div>}
            {successMessage && <div className="position-alert success">{successMessage}</div>}

            <div className="position-form-actions">
              <button type="submit" disabled={isSubmitting} className="position-btn primary">
                <i className={`bi ${isSubmitting ? 'bi-arrow-repeat animate-spin' : 'bi-check2-circle'}`} />
                {isSubmitting ? 'Submitting...' : 'Create Position Level'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default PositionLevelCreate;
 */





import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { positionService } from '../../services/positionService';
import type { PositionLevelResponse } from '../../types/position';
import '../position/position-ui.css';

type FormState = {
  levelCode: string;
  active: boolean;
  reason: string;
};

const initialForm: FormState = {
  levelCode: '',
  active: true,
  reason: '',
};

const PositionLevelCreate = () => {
  const [levels, setLevels] = useState<PositionLevelResponse[]>([]);
  const [query, setQuery] = useState('');
  const [form, setForm] = useState<FormState>(initialForm);
  const [editing, setEditing] = useState<PositionLevelResponse | null>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<PositionLevelResponse | null>(null);
  const [deactivateReason, setDeactivateReason] = useState('');
  const [formError, setFormError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadLevels = async () => {
    try {
      setLoading(true);
      setLevels(await positionService.getPositionLevels());
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Failed to load position levels.');
      setLevels([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadLevels();
  }, []);

  const filteredLevels = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return levels;
    return levels.filter((level) => level.levelCode.toLowerCase().includes(q));
  }, [levels, query]);

  const validate = (): string => {
    if (form.levelCode.trim().length === 0) {
      return 'Level code is required.';
    }
    if (editing && form.reason.trim().length === 0) {
      return 'Reason is required for edit or deactivate.';
    }
    return '';
  };

  const resetForm = () => {
    setForm(initialForm);
    setEditing(null);
    setFormError('');
  };

  const handleEdit = (level: PositionLevelResponse) => {
    setEditing(level);
    setForm({
      levelCode: level.levelCode,
      active: level.active !== false,
      reason: '',
    });
    setFormError('');
    setSubmitError('');
    setSuccessMessage('');
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const validationMessage = validate();
    setFormError(validationMessage);
    setSubmitError('');
    setSuccessMessage('');

    if (validationMessage) {
      return;
    }

    try {
      setIsSubmitting(true);

      if (editing) {
        const updatedLevel = await positionService.updatePositionLevel(editing.id, {
          levelCode: form.levelCode.trim(),
          active: form.active,
          reason: form.reason.trim(),
        });
        setSuccessMessage(`Position level "${updatedLevel.levelCode}" updated successfully.`);
      } else {
        const createdLevel = await positionService.createPositionLevel({
          levelCode: form.levelCode.trim(),
          active: true,
        });
        setSuccessMessage(`Position level "${createdLevel.levelCode}" created successfully.`);
      }

      resetForm();
      await loadLevels();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save position level.';
      setSubmitError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openDeactivate = (level: PositionLevelResponse) => {
    setDeactivateTarget(level);
    setDeactivateReason('');
    setSubmitError('');
    setSuccessMessage('');
  };

  const confirmDeactivate = async () => {
    if (!deactivateTarget) return;
    if (!deactivateReason.trim()) {
      setSubmitError('Reason is required for edit or deactivate.');
      return;
    }

    try {
      setIsSubmitting(true);
      await positionService.deactivatePositionLevel(deactivateTarget.id, deactivateReason.trim());
      setSuccessMessage(`Position level "${deactivateTarget.levelCode}" deactivated successfully.`);
      setDeactivateTarget(null);
      setDeactivateReason('');
      await loadLevels();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Failed to deactivate position level.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="position-page">
      <div className="position-hero">
        <span className="position-hero-badge">
          <i className="bi bi-diagram-3" />
          Hierarchy Setup
        </span>
        <h1>Position Levels</h1>
        <p>Create, edit, and deactivate reusable level codes for organizational hierarchy.</p>
      </div>

      <div className="position-surface">
        <div className="position-surface-inner">
          <form onSubmit={handleSubmit}>
            <div className="position-form-grid">
              <div className="position-field">
                <label htmlFor="levelCode">Level Code <span className="position-required">*</span></label>
                <input
                  id="levelCode"
                  className="position-input"
                  value={form.levelCode}
                  onChange={(event) => setForm((prev) => ({ ...prev, levelCode: event.target.value }))}
                  placeholder="e.g. LD1, LD2, M3"
                  required
                />
              </div>

              {editing && (
                <div className="position-field">
                  <label>Status</label>
                  <select
                    className="position-select"
                    value={form.active ? 'active' : 'inactive'}
                    onChange={(event) => setForm((prev) => ({ ...prev, active: event.target.value === 'active' }))}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              )}

              {editing && (
                <div className="position-field" style={{ gridColumn: '1 / -1' }}>
                  <label>Reason <span className="position-required">*</span></label>
                  <textarea
                    className="position-textarea"
                    value={form.reason}
                    onChange={(event) => setForm((prev) => ({ ...prev, reason: event.target.value.slice(0, 150) }))}
                    placeholder="Why is this position level being edited?"
                    required
                  />
                  <small>{form.reason.length}/150</small>
                </div>
              )}
            </div>

            {(formError || submitError || successMessage) && (
              <div className={`position-alert ${formError || submitError ? 'error' : 'success'}`}>
                {formError || submitError || successMessage}
              </div>
            )}

            <div className="position-form-actions" style={{ gap: 10 }}>
              {editing && (
                <button type="button" className="position-btn secondary" onClick={resetForm} disabled={isSubmitting}>
                  Cancel Edit
                </button>
              )}
              <button className="position-btn primary" type="submit" disabled={isSubmitting}>
                <i className={`bi ${isSubmitting ? 'bi-arrow-repeat' : editing ? 'bi-check-circle' : 'bi-plus-circle'}`} />
                {isSubmitting ? 'Saving...' : editing ? 'Update Position Level' : 'Create Position Level'}
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="position-surface">
        <div className="position-surface-inner">
          <div className="position-table-toolbar" style={{ justifyContent: 'space-between' }}>
            <div>
              <h2>Position Level List</h2>
              <p className="text-muted">Total: {levels.length}</p>
            </div>
            <input
              className="position-input"
              style={{ maxWidth: 320 }}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search level code..."
            />
          </div>

          {loading ? (
            <div className="position-state">Loading position levels...</div>
          ) : filteredLevels.length === 0 ? (
            <div className="position-state">No position levels found.</div>
          ) : (
            <div className="position-table-wrap">
              <table className="position-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Level Code</th>
                    <th>Status</th>
                    <th>Created By</th>
                    <th>Created At</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLevels.map((level) => (
                    <tr key={level.id}>
                      <td>{level.id}</td>
                      <td><strong>{level.levelCode}</strong></td>
                      <td>
                        <span className={`position-pill ${level.active === false ? 'inactive' : 'active'}`}>
                          {level.active === false ? 'Inactive' : 'Active'}
                        </span>
                      </td>
                      <td>{level.createdBy || '-'}</td>
                      <td>{level.createdAt ? new Date(level.createdAt).toLocaleString() : '-'}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button className="position-btn ghost" type="button" onClick={() => handleEdit(level)}>
                            <i className="bi bi-pencil-square" /> Edit
                          </button>
                          {level.active !== false && (
                            <button className="position-btn ghost" type="button" style={{ color: '#dc2626' }} onClick={() => openDeactivate(level)}>
                              <i className="bi bi-slash-circle" /> Deactivate
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

      {deactivateTarget && (
        <div className="position-modal-backdrop">
          <div className="position-modal">
            <div className="position-modal-header">
              <h2>Deactivate Position Level</h2>
              <button className="position-btn ghost" type="button" onClick={() => setDeactivateTarget(null)}>
                <i className="bi bi-x-lg" />
              </button>
            </div>
            <p>Deactivate <strong>{deactivateTarget.levelCode}</strong>?</p>
            <div className="position-field" style={{ marginTop: 12 }}>
              <label>Reason <span className="position-required">*</span></label>
              <textarea
                className="position-textarea"
                value={deactivateReason}
                onChange={(event) => setDeactivateReason(event.target.value.slice(0, 150))}
                placeholder="Why is this position level being deactivated?"
                required
              />
              <small>{deactivateReason.length}/150</small>
            </div>
            <div className="position-modal-actions" style={{ marginTop: 16 }}>
              <button className="position-btn secondary" type="button" onClick={() => setDeactivateTarget(null)} disabled={isSubmitting}>Cancel</button>
              <button className="position-btn primary" type="button" onClick={confirmDeactivate} disabled={isSubmitting || !deactivateReason.trim()}>
                {isSubmitting ? 'Saving...' : 'Deactivate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PositionLevelCreate;