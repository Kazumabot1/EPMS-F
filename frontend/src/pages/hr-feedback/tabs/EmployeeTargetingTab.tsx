import { useEffect, useState } from 'react';
import { feedbackCampaignApi } from '../../../api/feedbackCampaignApi';
import type {
  FeedbackCampaign,
  FeedbackTargetEmployee,
  FeedbackDepartmentOption,
  FeedbackTeamOption,
  EvaluatorConfigInput,
} from '../../../types/feedbackCampaign';

interface Props {
  campaign: FeedbackCampaign | null;
  onTargetsSet: (ids: number[], config: EvaluatorConfigInput) => void;
}

const DEFAULT_CONFIG: EvaluatorConfigInput = {
  includeManager: true,
  includeTeamPeers: true,
  includeProjectPeers: false,
  includeCrossTeamPeers: false,
  peerCount: 3,
};

export default function TargetEvaluatorTab({ campaign, onTargetsSet }: Props) {
  const [employees, setEmployees] = useState<FeedbackTargetEmployee[]>([]);
  const [departments, setDepartments] = useState<FeedbackDepartmentOption[]>([]);
  const [teams, setTeams] = useState<FeedbackTeamOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [savingTargets, setSavingTargets] = useState(false);
  const [targetsSaved, setTargetsSaved] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState<number | ''>('');
  const [teamFilter, setTeamFilter] = useState<number | ''>('');

  // Selection
  const [selected, setSelected] = useState<Set<number>>(new Set());

  // Evaluator config
  const [config, setConfig] = useState<EvaluatorConfigInput>(DEFAULT_CONFIG);

  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    Promise.all([
      feedbackCampaignApi.getEmployees(),
      feedbackCampaignApi.getDepartments(),
      feedbackCampaignApi.getTeams(),
    ])
      .then(([emps, depts, t]) => {
        setEmployees(emps);
        setDepartments(depts);
        setTeams(t);
        // Pre-select employees already in campaign
        if (campaign?.targetEmployeeIds?.length) {
          setSelected(new Set(campaign.targetEmployeeIds));
        }
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [campaign?.id]);

  /* ── Filter employees ──────────────────────── */
  const filtered = employees.filter(emp => {
    const matchSearch = !search || emp.fullName.toLowerCase().includes(search.toLowerCase());
    const matchDept = !deptFilter || emp.currentDepartmentId === deptFilter;
    const matchTeam = !teamFilter || teams.find(t => t.id === teamFilter)?.memberEmployeeIds.includes(emp.id);
    return matchSearch && matchDept && matchTeam;
  });

  const toggleEmp = (id: number) =>
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const selectAll = () => setSelected(new Set(filtered.map(e => e.id)));
  const clearAll = () => setSelected(new Set());

  const initials = (name: string) =>
    name.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('');

  /* ── Save targets ─────────────────────────── */
  const handleSaveTargets = async () => {
    if (!campaign) return;
    if (selected.size === 0) { setSaveError('Select at least one target employee.'); return; }
    setSaveError('');
    setSavingTargets(true);
    try {
      await feedbackCampaignApi.assignTargets(campaign.id, { employeeIds: [...selected] });
      setTargetsSaved(true);
    } catch (e: any) {
      setSaveError(e.message);
    } finally {
      setSavingTargets(false);
    }
  };

  /* ── Validate evaluator config ─────────── */
  const configValid =
    (config.includeManager ||
      config.includeTeamPeers ||
      config.includeProjectPeers ||
      config.includeCrossTeamPeers) &&
    config.peerCount > 0;

  const handleContinue = () => {
    if (!configValid) { setSaveError('Select at least one evaluator source and a valid peer count.'); return; }
    if (selected.size === 0) { setSaveError('Select at least one target employee.'); return; }
    onTargetsSet([...selected], config);
  };

  const evalOptions = [
    { key: 'includeManager' as const, label: 'Direct Manager', desc: 'Assigns the reporting manager as evaluator' },
    { key: 'includeTeamPeers' as const, label: 'Team Peers', desc: 'Members of the same active team' },
    { key: 'includeProjectPeers' as const, label: 'Project Peers', desc: 'Peers from shared project assignments' },
    { key: 'includeCrossTeamPeers' as const, label: 'Cross-Team Peers', desc: 'Members of other active teams' },
  ];

  if (!campaign) {
    return (
      <div className="hfd-locked-overlay">
        <i className="bi bi-lock" />
        <h3>No Campaign Selected</h3>
        <p>Create a campaign in Tab 2 first to configure targets and evaluators.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="hfd-card-header">
        <div className="hfd-card-title">
          <i className="bi bi-people" />
          <div>
            <h2>Target & Evaluator Configuration</h2>
            <p>Campaign: <strong>{campaign.name}</strong></p>
          </div>
        </div>
        <span className={`hfd-status-badge ${campaign.status}`}>{campaign.status}</span>
      </div>

      {error && <div className="hfd-alert hfd-alert-error"><i className="bi bi-exclamation-triangle" />{error}</div>}
      {saveError && <div className="hfd-alert hfd-alert-error"><i className="bi bi-exclamation-triangle" />{saveError}</div>}

      {/* ── Section A: Target employees ─── */}
      <h3 style={{ margin: '0 0 12px', fontSize: '0.95rem', fontWeight: 700, color: '#374151' }}>
        <i className="bi bi-person-check" style={{ marginRight: 6, color: '#6366f1' }} />
        1. Select Target Employees
        <span className="hfd-selected-count" style={{ marginLeft: 10 }}>
          <i className="bi bi-check2" /> {selected.size} selected
        </span>
      </h3>

      <div className="hfd-filter-bar">
        <input className="hfd-input" placeholder="Search by name…" value={search} onChange={e => setSearch(e.target.value)} />
        <select className="hfd-select" value={deptFilter} onChange={e => setDeptFilter(e.target.value ? +e.target.value : '')}>
          <option value="">All Departments</option>
          {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <select className="hfd-select" value={teamFilter} onChange={e => setTeamFilter(e.target.value ? +e.target.value : '')}>
          <option value="">All Teams</option>
          {teams.map(t => <option key={t.id} value={t.id}>{t.teamName}</option>)}
        </select>
        <button className="hfd-btn hfd-btn-secondary hfd-btn-sm" onClick={selectAll}>Select All</button>
        <button className="hfd-btn hfd-btn-secondary hfd-btn-sm" onClick={clearAll}>Clear</button>
      </div>

      {loading ? (
        <div className="hfd-spinner"><i className="bi bi-arrow-repeat" /> Loading employees…</div>
      ) : (
        <div className="hfd-employee-list">
          {filtered.length === 0 ? (
            <p style={{ color: '#9ca3af', fontSize: '0.88rem' }}>No employees match the filters.</p>
          ) : filtered.map(emp => (
            <div
              key={emp.id}
              className={`hfd-employee-card ${selected.has(emp.id) ? 'selected' : ''}`}
              onClick={() => toggleEmp(emp.id)}
            >
              <div className="hfd-employee-avatar">{initials(emp.fullName)}</div>
              <div>
                <div className="hfd-employee-name">{emp.fullName}</div>
                <div className="hfd-employee-dept">{emp.currentDepartment ?? 'No dept'}</div>
              </div>
              {selected.has(emp.id) && <i className="bi bi-check-circle-fill" style={{ color: '#6366f1', marginLeft: 'auto' }} />}
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: 12 }}>
        <button
          className="hfd-btn hfd-btn-secondary hfd-btn-sm"
          onClick={handleSaveTargets}
          disabled={savingTargets || selected.size === 0}
        >
          {savingTargets ? <><i className="bi bi-arrow-repeat" /> Saving…</> : <><i className="bi bi-floppy" /> Save Targets</>}
        </button>
        {targetsSaved && <span style={{ marginLeft: 10, color: '#16a34a', fontSize: '0.85rem' }}><i className="bi bi-check-circle" /> Targets saved</span>}
      </div>

      <hr style={{ margin: '24px 0', borderColor: '#f1f5f9' }} />

      {/* ── Section B: Evaluator config ─── */}
      <h3 style={{ margin: '0 0 12px', fontSize: '0.95rem', fontWeight: 700, color: '#374151' }}>
        <i className="bi bi-person-lines-fill" style={{ marginRight: 6, color: '#6366f1' }} />
        2. Evaluator Configuration
      </h3>

      <div className="hfd-eval-grid">
        {evalOptions.map(opt => (
          <div
            key={opt.key}
            className={`hfd-eval-option ${config[opt.key] ? 'checked' : ''}`}
            onClick={() => setConfig(prev => ({ ...prev, [opt.key]: !prev[opt.key] }))}
          >
            <input
              type="checkbox"
              checked={config[opt.key] as boolean}
              onChange={() => {}}
              onClick={e => e.stopPropagation()}
            />
            <div className="hfd-eval-option-body">
              <strong>{opt.label}</strong>
              <span>{opt.desc}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="hfd-field" style={{ maxWidth: 240 }}>
        <label className="hfd-label">Peer Count (per target) <span>*</span></label>
        <input
          type="number"
          className="hfd-input"
          min={1}
          max={10}
          value={config.peerCount}
          onChange={e => setConfig(prev => ({ ...prev, peerCount: Math.max(1, +e.target.value) }))}
        />
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 8 }}>
        <button
          id="btn-continue-to-preview"
          className="hfd-btn hfd-btn-primary"
          onClick={handleContinue}
          disabled={selected.size === 0 || !configValid}
        >
          <i className="bi bi-arrow-right" /> Continue to Preview
        </button>
      </div>
    </div>
  );
}
