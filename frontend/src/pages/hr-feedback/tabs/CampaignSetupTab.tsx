import { useEffect, useState } from 'react';
import { hrFeedbackApi, type FormOptionItem } from '../../../api/hrFeedbackApi';
import { feedbackCampaignApi } from '../../../api/feedbackCampaignApi';
import type { FeedbackCampaign } from '../../../types/feedbackCampaign';

interface Props {
  onCampaignCreated: (campaign: FeedbackCampaign) => void;
}

export default function CampaignSetupTab({ onCampaignCreated }: Props) {
  const [forms, setForms] = useState<FormOptionItem[]>([]);
  const [loadingForms, setLoadingForms] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [formId, setFormId] = useState<number | ''>('');

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    hrFeedbackApi.getActiveForms()
      .then(setForms)
      .catch(() => setForms([]))
      .finally(() => setLoadingForms(false));
  }, []);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Campaign name is required.';
    if (!startDate) e.startDate = 'Start date is required.';
    if (!endDate) e.endDate = 'End date is required.';
    if (startDate && endDate && startDate >= endDate) e.endDate = 'End date must be after start date.';
    if (!formId) e.formId = 'Please select a feedback form.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!validate()) return;
    setSaving(true);
    try {
      const campaign = await feedbackCampaignApi.createCampaign({
        name: name.trim(),
        startDate,
        endDate,
        formId: formId as number,
      });
      setSuccess(`Campaign "${campaign.name}" created successfully!`);
      onCampaignCreated(campaign);
      setName(''); setStartDate(''); setEndDate(''); setFormId('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="hfd-card-header">
        <div className="hfd-card-title">
          <i className="bi bi-megaphone" />
          <div>
            <h2>Campaign Setup</h2>
            <p>Create a new 360-feedback campaign and link it to a form</p>
          </div>
        </div>
      </div>

      {error && <div className="hfd-alert hfd-alert-error"><i className="bi bi-exclamation-triangle" />{error}</div>}
      {success && <div className="hfd-alert hfd-alert-success"><i className="bi bi-check-circle" />{success}</div>}

      <form onSubmit={handleSubmit} noValidate>
        <div className="hfd-field">
          <label className="hfd-label">Campaign Name <span>*</span></label>
          <input
            id="campaign-name"
            className={`hfd-input ${errors.name ? 'error' : ''}`}
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Q2 2025 360-Degree Feedback"
          />
          {errors.name && <p className="hfd-error-msg">{errors.name}</p>}
        </div>

        <div className="hfd-grid-2">
          <div className="hfd-field">
            <label className="hfd-label">Start Date <span>*</span></label>
            <input
              id="campaign-start-date"
              type="date"
              className={`hfd-input ${errors.startDate ? 'error' : ''}`}
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
            />
            {errors.startDate && <p className="hfd-error-msg">{errors.startDate}</p>}
          </div>
          <div className="hfd-field">
            <label className="hfd-label">End Date <span>*</span></label>
            <input
              id="campaign-end-date"
              type="date"
              className={`hfd-input ${errors.endDate ? 'error' : ''}`}
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
            />
            {errors.endDate && <p className="hfd-error-msg">{errors.endDate}</p>}
          </div>
        </div>

        <div className="hfd-field">
          <label className="hfd-label">Feedback Form <span>*</span></label>
          {loadingForms ? (
            <div className="hfd-spinner" style={{ justifyContent: 'flex-start', padding: '8px 0' }}>
              <i className="bi bi-arrow-repeat" /> Loading forms…
            </div>
          ) : (
            <select
              id="campaign-form-select"
              className={`hfd-select ${errors.formId ? 'error' : ''}`}
              value={formId}
              onChange={e => setFormId(e.target.value ? +e.target.value : '')}
            >
              <option value="">— Select a form —</option>
              {forms.map(f => (
                <option key={f.id} value={f.id}>
                  {f.formName} (v{f.versionNumber})
                </option>
              ))}
            </select>
          )}
          {forms.length === 0 && !loadingForms && (
            <p className="hfd-error-msg">No active forms available. Please create and activate a form first (Tab 1).</p>
          )}
          {errors.formId && <p className="hfd-error-msg">{errors.formId}</p>}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 8 }}>
          <button id="btn-create-campaign" type="submit" className="hfd-btn hfd-btn-primary" disabled={saving || loadingForms}>
            {saving
              ? <><i className="bi bi-arrow-repeat" /> Creating…</>
              : <><i className="bi bi-check2-circle" /> Create Campaign</>
            }
          </button>
        </div>
      </form>
    </div>
  );
}
