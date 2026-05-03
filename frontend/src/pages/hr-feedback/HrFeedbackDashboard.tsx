import { useState } from 'react';
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

export default function HrFeedbackDashboard() {
  const [activeTab, setActiveTab] = useState<TabId>(0);

  // Shared convenience state only. Tabs are no longer locked by this state.
  const [campaign, setCampaign] = useState<FeedbackCampaign | null>(null);
  const [targetIds, setTargetIds] = useState<number[]>([]);
  const [evalConfig, setEvalConfig] = useState<EvaluatorConfigInput>(DEFAULT_EVAL_CONFIG);
  const [assignmentResult, setAssignmentResult] = useState<FeedbackAssignmentGenerationResponse | null>(null);

  const hasProgress = (id: TabId): boolean => {
    if (id === 1) return campaign !== null;
    if (id === 2) return targetIds.length > 0;
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

  const moveTab = (delta: -1 | 1) => {
    setActiveTab(prev => Math.min(TABS.length - 1, Math.max(0, prev + delta)) as TabId);
  };

  return (
      <div className="hfd-shell">
        <div className="hfd-header">
          <h1>
            <i className="bi bi-arrow-repeat" />
            360-Degree Feedback
          </h1>
          <p>HR Management Console — open any module directly. Each tab loads or asks for the campaign/form it needs.</p>
        </div>

        <div className="hfd-steps hfd-tabs-nav" role="tablist" aria-label="360 feedback modules">
          {TABS.map(tab => (
              <button
                  key={tab.id}
                  type="button"
                  className={tabClass(tab.id)}
                  onClick={() => setActiveTab(tab.id)}
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
          {activeTab === 0 && (
              <FormManagementTab onFormCreated={() => {}} />
          )}

          {activeTab === 1 && (
              <CampaignSetupTab
                  onCampaignCreated={(createdCampaign) => {
                    setCampaign(createdCampaign);
                  }}
              />
          )}

          {activeTab === 2 && (
              <EmployeeTargetingTab
                  campaign={campaign}
                  onTargetsSet={(ids, cfg) => {
                    setTargetIds(ids);
                    setEvalConfig(cfg);
                  }}
              />
          )}

          {activeTab === 3 && (
              <AssignmentPreviewTab
                  campaign={campaign}
                  targetIds={targetIds}
                  evalConfig={evalConfig}
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
