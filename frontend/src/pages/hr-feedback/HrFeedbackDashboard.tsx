import { useEffect, useMemo, useState } from 'react';
import './hr-feedback-dashboard.css';
import FormManagementTab from './tabs/FormManagementTab';
import CampaignSetupTab from './tabs/CampaignSetupTab';
import EmployeeTargetingTab from './tabs/EmployeeTargetingTab';
import AssignmentPreviewTab from './tabs/AssignmentPreviewTab';
import CampaignMonitoringTab from './tabs/CampaignActivationTab';
import AnalyticsTab from './tabs/AnalyticsTab';
import type { FeedbackCampaign, EvaluatorConfigInput, FeedbackAssignmentGenerationResponse } from '../../types/feedbackCampaign';

type TabId = 0 | 1 | 2 | 3 | 4 | 5;

interface TabDef {
  id: TabId;
  label: string;
  icon: string;
  shortLabel: string;
}

interface FeedbackWorkflowDraftState {
  campaignId: number | null;
  savedTargetIds: number[];
  draftTargetIds: number[];
  evalConfig: EvaluatorConfigInput;
}

const TABS: TabDef[] = [
  { id: 0, label: 'Form Management', shortLabel: 'Forms', icon: 'bi bi-ui-checks' },
  { id: 1, label: 'Campaign Setup', shortLabel: 'Campaigns', icon: 'bi bi-megaphone' },
  { id: 2, label: 'Target & Evaluators', shortLabel: 'Targets', icon: 'bi bi-people' },
  { id: 3, label: 'Assignment Preview', shortLabel: 'Preview', icon: 'bi bi-clipboard-check' },
  { id: 4, label: 'Monitoring', shortLabel: 'Monitor', icon: 'bi bi-graph-up-arrow' },
  { id: 5, label: 'Analytics', shortLabel: 'Analytics', icon: 'bi bi-bar-chart-line' },
];

const DEFAULT_EVAL_CONFIG: EvaluatorConfigInput = {
  includeManager: true,
  includeTeamPeers: true,
  includeDepartmentPeers: true,
  includeProjectPeers: false,
  includeCrossTeamPeers: false,
  includeSubordinates: true,
  includeSelf: false,
  peerCount: 3,
};

const WORKFLOW_STORAGE_KEY = 'epms.hrFeedback.workflowDraft.v1';

const normalizeIds = (ids: number[]) => [...new Set(ids)].sort((left, right) => left - right);

const sameIds = (left: number[], right: number[]) => {
  const a = normalizeIds(left);
  const b = normalizeIds(right);
  return a.length === b.length && a.every((value, index) => value === b[index]);
};

const readStoredWorkflow = (): FeedbackWorkflowDraftState => {
  if (typeof window === 'undefined') {
    return {
      campaignId: null,
      savedTargetIds: [],
      draftTargetIds: [],
      evalConfig: DEFAULT_EVAL_CONFIG,
    };
  }

  try {
    const raw = window.sessionStorage.getItem(WORKFLOW_STORAGE_KEY);
    if (!raw) throw new Error('No saved feedback workflow state.');
    const parsed = JSON.parse(raw) as Partial<FeedbackWorkflowDraftState>;
    return {
      campaignId: parsed.campaignId ?? null,
      savedTargetIds: Array.isArray(parsed.savedTargetIds) ? parsed.savedTargetIds : [],
      draftTargetIds: Array.isArray(parsed.draftTargetIds) ? parsed.draftTargetIds : [],
      evalConfig: { ...DEFAULT_EVAL_CONFIG, ...(parsed.evalConfig ?? {}) },
    };
  } catch {
    return {
      campaignId: null,
      savedTargetIds: [],
      draftTargetIds: [],
      evalConfig: DEFAULT_EVAL_CONFIG,
    };
  }
};

export default function HrFeedbackDashboard() {
  const storedWorkflow = useMemo(readStoredWorkflow, []);
  const [activeTab, setActiveTab] = useState<TabId>(0);

  const [campaign, setCampaign] = useState<FeedbackCampaign | null>(null);
  const [savedTargetIds, setSavedTargetIds] = useState<number[]>(storedWorkflow.savedTargetIds);
  const [draftTargetIds, setDraftTargetIds] = useState<number[]>(storedWorkflow.draftTargetIds.length ? storedWorkflow.draftTargetIds : storedWorkflow.savedTargetIds);
  const [evalConfig, setEvalConfig] = useState<EvaluatorConfigInput>(storedWorkflow.evalConfig);
  const [assignmentResult, setAssignmentResult] = useState<FeedbackAssignmentGenerationResponse | null>(null);
  const [workflowNotice, setWorkflowNotice] = useState('');

  const targetsDirty = !sameIds(savedTargetIds, draftTargetIds);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const payload: FeedbackWorkflowDraftState = {
      campaignId: campaign?.id ?? storedWorkflow.campaignId ?? null,
      savedTargetIds,
      draftTargetIds,
      evalConfig,
    };
    window.sessionStorage.setItem(WORKFLOW_STORAGE_KEY, JSON.stringify(payload));
  }, [campaign?.id, draftTargetIds, evalConfig, savedTargetIds, storedWorkflow.campaignId]);

  const applyCampaignSelection = (selectedCampaign: FeedbackCampaign) => {
    const ids = selectedCampaign.targetEmployeeIds ?? [];
    setCampaign(selectedCampaign);
    setSavedTargetIds(ids);
    setDraftTargetIds(ids);
    setAssignmentResult(null);
    setWorkflowNotice('');
  };

  const hasProgress = (id: TabId): boolean => {
    if (id === 1) return campaign !== null;
    if (id === 2) return savedTargetIds.length > 0;
    if (id === 3) return assignmentResult !== null;
    if (id === 4) return campaign !== null;
    if (id === 5) return campaign?.status === 'CLOSED';
    return false;
  };

  const tabClass = (id: TabId) => {
    if (activeTab === id) return 'hfd-step active';
    if (hasProgress(id)) return 'hfd-step done';
    return 'hfd-step';
  };

  const goToTab = (id: TabId) => {
    if (targetsDirty && id >= 3) {
      setWorkflowNotice('You have unsaved target changes. Save Targets in Tab 3 before going to Preview, Monitoring, or Analytics so the saved campaign and preview stay consistent.');
      setActiveTab(2);
      return;
    }
    setWorkflowNotice('');
    setActiveTab(id);
  };

  const moveTab = (delta: -1 | 1) => {
    const next = Math.min(TABS.length - 1, Math.max(0, activeTab + delta)) as TabId;
    goToTab(next);
  };

  return (
      <div className="hfd-shell">
        <div className="hfd-header">
          <h1>
            <i className="bi bi-arrow-repeat" />
            360-Degree Feedback
          </h1>
          <p>HR Management Console — open any module directly. Campaign, target, and evaluator configuration now stay synchronized across tabs.</p>
        </div>

        <div className="hfd-steps hfd-tabs-nav" role="tablist" aria-label="360 feedback modules">
          {TABS.map(tab => (
              <button
                  key={tab.id}
                  type="button"
                  className={tabClass(tab.id)}
                  onClick={() => goToTab(tab.id)}
                  title={tab.label}
                  role="tab"
                  aria-selected={activeTab === tab.id}
              >
                <div className="hfd-step-bubble">
                  {hasProgress(tab.id) && activeTab !== tab.id
                      ? <i className="bi bi-check-lg" />
                      : <i className={tab.icon} />}
                </div>
                <span className="hfd-step-label">{tab.shortLabel}</span>
              </button>
          ))}
        </div>

        <div className="hfd-card">
          {workflowNotice && (
              <div className="hfd-alert hfd-alert-warning">
                <i className="bi bi-exclamation-triangle" />
                {workflowNotice}
              </div>
          )}

          {activeTab === 0 && (
              <FormManagementTab onFormCreated={() => {}} />
          )}

          {activeTab === 1 && (
              <CampaignSetupTab
                  onCampaignCreated={(createdCampaign) => {
                    applyCampaignSelection(createdCampaign);
                  }}
              />
          )}

          {activeTab === 2 && (
              <EmployeeTargetingTab
                  campaign={campaign}
                  targetIds={draftTargetIds}
                  savedTargetIds={savedTargetIds}
                  evalConfig={evalConfig}
                  onCampaignSelected={applyCampaignSelection}
                  onTargetsDraftChange={(ids) => {
                    setDraftTargetIds(ids);
                    setAssignmentResult(null);
                  }}
                  onEvalConfigChange={(cfg) => {
                    setEvalConfig(cfg);
                    setAssignmentResult(null);
                  }}
                  onTargetsSaved={(ids, cfg, updatedCampaign) => {
                    setSavedTargetIds(ids);
                    setDraftTargetIds(ids);
                    setEvalConfig(cfg);
                    setCampaign(updatedCampaign);
                    setAssignmentResult(null);
                    setWorkflowNotice('');
                  }}
                  onTargetsSet={(ids, cfg) => {
                    setSavedTargetIds(ids);
                    setDraftTargetIds(ids);
                    setEvalConfig(cfg);
                    setAssignmentResult(null);
                    setWorkflowNotice('');
                    setActiveTab(3);
                  }}
              />
          )}

          {activeTab === 3 && (
              <AssignmentPreviewTab
                  campaign={campaign}
                  targetIds={savedTargetIds}
                  evalConfig={evalConfig}
                  onCampaignSelected={applyCampaignSelection}
                  onAssignmentsGenerated={(res) => {
                    setAssignmentResult(res);
                  }}
              />
          )}

          {activeTab === 4 && (
              <CampaignMonitoringTab activeCampaign={campaign} />
          )}

          {activeTab === 5 && (
              <AnalyticsTab />
          )}

          <div className="hfd-nav-footer">
            <button
                className="hfd-btn hfd-btn-secondary"
                onClick={() => moveTab(-1)}
                disabled={activeTab === 0}
            >
              <i className="bi bi-arrow-left" /> Previous Tab
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem', color: '#9ca3af' }}>
              <i className={TABS[activeTab].icon} />
              {TABS[activeTab].label}
            </div>

            <button
                className="hfd-btn hfd-btn-primary"
                onClick={() => moveTab(1)}
                disabled={activeTab === TABS.length - 1}
            >
              Next Tab <i className="bi bi-arrow-right" />
            </button>
          </div>
        </div>
      </div>
  );
}
