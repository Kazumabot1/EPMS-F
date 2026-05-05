import { useEffect, useMemo, useState } from 'react';
import { hrFeedbackApi, type FormOptionItem } from '../../../api/hrFeedbackApi';
import { feedbackCampaignApi } from '../../../api/feedbackCampaignApi';
import type { FeedbackCampaign, FeedbackCampaignRound } from '../../../types/feedbackCampaign';

interface Props {
  onCampaignCreated: (campaign: FeedbackCampaign) => void;
}

type FieldErrors = Record<string, string>;

const roundLabels: Record<FeedbackCampaignRound, string> = {
  ANNUAL: 'Annual / One time this year',
  FIRST_HALF: 'First half / H1',
  SECOND_HALF: 'Second half / H2',
  SPECIAL: 'Special / Ad-hoc',
};

const blockingStatuses = ['DRAFT', 'ACTIVE', 'CLOSED'];
const openStatuses = ['DRAFT', 'ACTIVE'];

const pad = (value: number) => String(value).padStart(2, '0');

const toDateTimeLocal = (date: Date, hour: number, minute = 0) => {
  const copy = new Date(date);
  copy.setHours(hour, minute, 0, 0);
  return `${copy.getFullYear()}-${pad(copy.getMonth() + 1)}-${pad(copy.getDate())}T${pad(copy.getHours())}:${pad(copy.getMinutes())}`;
};

const toDateOnly = (value: string) => value ? value.slice(0, 10) : '';

const normalizeDateTimeForApi = (value: string) => value.length === 16 ? `${value}:00` : value;

const defaultEnd = () => {
  const end = new Date();
  end.setDate(end.getDate() + 14);
  return toDateTimeLocal(end, 17, 0);
};

const defaultCampaignName = (year: number, round: FeedbackCampaignRound) => {
  const label = round === 'ANNUAL'
      ? 'Annual'
      : round === 'FIRST_HALF'
          ? 'H1'
          : round === 'SECOND_HALF'
              ? 'H2'
              : 'Special';
  return `${year} ${label} 360 Feedback Campaign`;
};

const formatDateTime = (value?: string | null) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.replace('T', ' ');
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric', month: 'short', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: true,
  }).format(date);
};

const windowsOverlap = (aStart: string, aEnd: string, bStart: string, bEnd: string) => {
  const aStartDate = new Date(aStart);
  const aEndDate = new Date(aEnd);
  const bStartDate = new Date(bStart);
  const bEndDate = new Date(bEnd);
  if ([aStartDate, aEndDate, bStartDate, bEndDate].some(date => Number.isNaN(date.getTime()))) return false;
  return aStartDate <= bEndDate && aEndDate >= bStartDate;
};

export default function CampaignSetupTab({ onCampaignCreated }: Props) {
  const [forms, setForms] = useState<FormOptionItem[]>([]);
  const [campaigns, setCampaigns] = useState<FeedbackCampaign[]>([]);
  const [loadingForms, setLoadingForms] = useState(true);
  const [loadingCampaigns, setLoadingCampaigns] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const currentYear = new Date().getFullYear();
  const [reviewYear, setReviewYear] = useState(currentYear);
  const [reviewRound, setReviewRound] = useState<FeedbackCampaignRound>('ANNUAL');
  const [name, setName] = useState(defaultCampaignName(currentYear, 'ANNUAL'));
  const [nameTouched, setNameTouched] = useState(false);
  const [startAt, setStartAt] = useState(toDateTimeLocal(new Date(), 9, 0));
  const [endAt, setEndAt] = useState(defaultEnd());
  const [formId, setFormId] = useState<number | ''>('');
  const [description, setDescription] = useState('');
  const [instructions, setInstructions] = useState('Please provide honest and constructive 360-degree feedback before the deadline.');
  const [errors, setErrors] = useState<FieldErrors>({});

  useEffect(() => {
    hrFeedbackApi.getActiveForms()
        .then(setForms)
        .catch(() => setForms([]))
        .finally(() => setLoadingForms(false));

    hrFeedbackApi.getAllCampaigns()
        .then(setCampaigns)
        .catch(() => setCampaigns([]))
        .finally(() => setLoadingCampaigns(false));
  }, []);

  useEffect(() => {
    if (!nameTouched) {
      setName(defaultCampaignName(reviewYear, reviewRound));
    }
  }, [reviewYear, reviewRound, nameTouched]);

  const duplicateCampaign = useMemo(() => {
    if (reviewRound === 'SPECIAL') return null;
    return campaigns.find(campaign =>
        campaign.reviewYear === reviewYear
        && campaign.reviewRound === reviewRound
        && blockingStatuses.includes(campaign.status),
    ) ?? null;
  }, [campaigns, reviewYear, reviewRound]);

  const overlappingOpenCampaign = useMemo(() => {
    if (!startAt || !endAt) return null;
    return campaigns.find(campaign =>
        openStatuses.includes(campaign.status)
        && windowsOverlap(startAt, endAt, campaign.startAt ?? `${campaign.startDate}T09:00:00`, campaign.endAt ?? `${campaign.endDate}T17:00:00`),
    ) ?? null;
  }, [campaigns, startAt, endAt]);

  const periodHint = useMemo(() => {
    if (reviewRound === 'ANNUAL') {
      return 'Use this when the company collects 360 feedback once for the whole year.';
    }
    if (reviewRound === 'FIRST_HALF') {
      return 'Use this when the company runs two yearly feedback cycles and this is the first one.';
    }
    if (reviewRound === 'SECOND_HALF') {
      return 'Use this when the company runs two yearly feedback cycles and this is the second one.';
    }
    return 'Use this only for exceptional campaigns that should not count as the normal annual/H1/H2 cycle.';
  }, [reviewRound]);

  const validate = () => {
    const e: FieldErrors = {};
    if (!name.trim()) e.name = 'Campaign name is required.';
    if (name.trim().length > 255) e.name = 'Campaign name cannot exceed 255 characters.';
    if (!reviewYear || reviewYear < 2000 || reviewYear > 2100) e.reviewYear = 'Please enter a valid review year.';
    if (!reviewRound) e.reviewRound = 'Please select a review round.';
    if (!startAt) e.startAt = 'Start date and time are required.';
    if (!endAt) e.endAt = 'End date and time are required.';
    if (startAt && endAt && new Date(startAt) >= new Date(endAt)) e.endAt = 'End date/time must be after start date/time.';
    if (startAt && endAt) {
      const startYear = new Date(startAt).getFullYear();
      const endYear = new Date(endAt).getFullYear();
      if (startYear !== reviewYear && endYear !== reviewYear) {
        e.startAt = 'Submission window should belong to the selected review year.';
      }
    }
    if (!formId) e.formId = 'Please select a feedback form.';
    if (duplicateCampaign) {
      e.reviewRound = `A ${roundLabels[reviewRound]} campaign already exists for ${reviewYear}: ${duplicateCampaign.name}.`;
    }
    if (overlappingOpenCampaign) {
      e.startAt = `This window overlaps open campaign: ${overlappingOpenCampaign.name}.`;
    }
    if (description.length > 2000) e.description = 'Description cannot exceed 2,000 characters.';
    if (instructions.length > 4000) e.instructions = 'Instructions cannot exceed 4,000 characters.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const refreshCampaigns = async () => {
    try {
      const data = await hrFeedbackApi.getAllCampaigns();
      setCampaigns(data);
    } catch {
      // Campaign refresh failure should not block the successful create message.
    }
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
        reviewYear,
        reviewRound,
        startAt: normalizeDateTimeForApi(startAt),
        endAt: normalizeDateTimeForApi(endAt),
        startDate: toDateOnly(startAt),
        endDate: toDateOnly(endAt),
        formId: formId as number,
        description: description.trim(),
        instructions: instructions.trim(),
      });
      setSuccess(`Campaign "${campaign.name}" created successfully. Continue with target selection when ready.`);
      onCampaignCreated(campaign);
      await refreshCampaigns();
      setNameTouched(false);
      setName(defaultCampaignName(reviewYear, reviewRound));
      setDescription('');
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
              <p>Create a review-period campaign before selecting target employees and evaluators.</p>
            </div>
          </div>
        </div>

        {error && <div className="hfd-alert hfd-alert-error"><i className="bi bi-exclamation-triangle" />{error}</div>}
        {success && <div className="hfd-alert hfd-alert-success"><i className="bi bi-check-circle" />{success}</div>}

        <div className="hfd-alert hfd-alert-info">
          <i className="bi bi-info-circle" />
          <span>
          For the client rule, use <strong>Annual</strong> when 360 feedback runs once per year. Use <strong>H1</strong> and <strong>H2</strong> only for years with two feedback rounds.
        </span>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="hfd-grid-3">
            <div className="hfd-field">
              <label className="hfd-label">Review Year <span>*</span></label>
              <input
                  id="campaign-review-year"
                  type="number"
                  min="2000"
                  max="2100"
                  className={`hfd-input ${errors.reviewYear ? 'error' : ''}`}
                  value={reviewYear}
                  onChange={e => setReviewYear(Number(e.target.value))}
              />
              {errors.reviewYear && <p className="hfd-error-msg">{errors.reviewYear}</p>}
            </div>

            <div className="hfd-field">
              <label className="hfd-label">Review Round <span>*</span></label>
              <select
                  id="campaign-review-round"
                  className={`hfd-select ${errors.reviewRound ? 'error' : ''}`}
                  value={reviewRound}
                  onChange={e => setReviewRound(e.target.value as FeedbackCampaignRound)}
              >
                {(Object.keys(roundLabels) as FeedbackCampaignRound[]).map(round => (
                    <option key={round} value={round}>{roundLabels[round]}</option>
                ))}
              </select>
              {errors.reviewRound && <p className="hfd-error-msg">{errors.reviewRound}</p>}
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
                    <option value="">— Select active form —</option>
                    {forms.map(f => (
                        <option key={f.id} value={f.id}>
                          {f.formName} (v{f.versionNumber})
                        </option>
                    ))}
                  </select>
              )}
              {forms.length === 0 && !loadingForms && (
                  <p className="hfd-error-msg">No active forms available. Create and activate a form first.</p>
              )}
              {errors.formId && <p className="hfd-error-msg">{errors.formId}</p>}
            </div>
          </div>

          <div className="hfd-field">
            <label className="hfd-label">Campaign Name <span>*</span></label>
            <input
                id="campaign-name"
                className={`hfd-input ${errors.name ? 'error' : ''}`}
                value={name}
                onChange={e => { setName(e.target.value); setNameTouched(true); }}
                placeholder="e.g. 2026 Annual 360 Feedback Campaign"
            />
            {errors.name && <p className="hfd-error-msg">{errors.name}</p>}
          </div>

          <div className="hfd-helper-card">
            <i className="bi bi-calendar2-check" />
            <span>{periodHint}</span>
          </div>

          <div className="hfd-grid-2">
            <div className="hfd-field">
              <label className="hfd-label">Submission Opens <span>*</span></label>
              <input
                  id="campaign-start-at"
                  type="datetime-local"
                  className={`hfd-input ${errors.startAt ? 'error' : ''}`}
                  value={startAt}
                  onChange={e => setStartAt(e.target.value)}
              />
              {errors.startAt && <p className="hfd-error-msg">{errors.startAt}</p>}
            </div>
            <div className="hfd-field">
              <label className="hfd-label">Submission Deadline <span>*</span></label>
              <input
                  id="campaign-end-at"
                  type="datetime-local"
                  className={`hfd-input ${errors.endAt ? 'error' : ''}`}
                  value={endAt}
                  onChange={e => setEndAt(e.target.value)}
              />
              {errors.endAt && <p className="hfd-error-msg">{errors.endAt}</p>}
            </div>
          </div>

          {duplicateCampaign && (
              <div className="hfd-alert hfd-alert-warning">
                <i className="bi bi-shield-exclamation" />
                <span>
              Existing {roundLabels[reviewRound]} campaign for {reviewYear}: <strong>{duplicateCampaign.name}</strong>. Use another round or create a Special campaign only if this is truly ad-hoc.
            </span>
              </div>
          )}

          {overlappingOpenCampaign && (
              <div className="hfd-alert hfd-alert-warning">
                <i className="bi bi-clock-history" />
                <span>
              This submission window overlaps <strong>{overlappingOpenCampaign.name}</strong> ({formatDateTime(overlappingOpenCampaign.startAt)} – {formatDateTime(overlappingOpenCampaign.endAt)}). Overlapping open campaigns are blocked to avoid duplicate evaluator tasks.
            </span>
              </div>
          )}

          <div className="hfd-grid-2">
            <div className="hfd-field">
              <label className="hfd-label">Purpose / Description</label>
              <textarea
                  id="campaign-description"
                  className={`hfd-textarea ${errors.description ? 'error' : ''}`}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Example: Annual leadership and collaboration feedback for all eligible employees."
                  rows={4}
              />
              {errors.description && <p className="hfd-error-msg">{errors.description}</p>}
            </div>
            <div className="hfd-field">
              <label className="hfd-label">Evaluator Instructions</label>
              <textarea
                  id="campaign-instructions"
                  className={`hfd-textarea ${errors.instructions ? 'error' : ''}`}
                  value={instructions}
                  onChange={e => setInstructions(e.target.value)}
                  placeholder="Message shown to evaluators."
                  rows={4}
              />
              {errors.instructions && <p className="hfd-error-msg">{errors.instructions}</p>}
            </div>
          </div>

          {!loadingCampaigns && campaigns.length > 0 && (
              <div className="hfd-mini-panel">
                <div className="hfd-mini-panel-title"><i className="bi bi-list-check" /> Recent campaign guardrails</div>
                <div className="hfd-mini-panel-body">
                  {campaigns.slice(0, 3).map(campaign => (
                      <div key={campaign.id} className="hfd-mini-row">
                        <span>{campaign.reviewYear ?? campaign.startDate?.slice(0, 4)} {campaign.reviewRound ?? 'ANNUAL'} · {campaign.name}</span>
                        <strong>{campaign.status}</strong>
                      </div>
                  ))}
                </div>
              </div>
          )}

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
