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

interface StepDef {
  id: TabId;
  label: string;
  icon: string;
  shortLabel: string;
}

const STEPS: StepDef[] = [
  { id: 0, label: 'Form Management', shortLabel: 'Forms', icon: 'bi bi-ui-checks' },
  { id: 1, label: 'Campaign Setup', shortLabel: 'Campaign', icon: 'bi bi-megaphone' },
  { id: 2, label: 'Target & Evaluators', shortLabel: 'Targets', icon: 'bi bi-people' },
  { id: 3, label: 'Assignment Preview', shortLabel: 'Preview', icon: 'bi bi-clipboard-check' },
  { id: 4, label: 'Monitoring', shortLabel: 'Monitor', icon: 'bi bi-graph-up-arrow' },
  { id: 5, label: 'Analytics', shortLabel: 'Analytics', icon: 'bi bi-bar-chart-line' },
];

const DEFAULT_EVAL_CONFIG: EvaluatorConfigInput = {
  includeManager: true,
  includeTeamPeers: true,
  includeProjectPeers: false,
  includeCrossTeamPeers: false,
  peerCount: 3,
};

export default function HrFeedbackDashboard() {
  const [activeTab, setActiveTab] = useState<TabId>(0);

  // Flow state shared across tabs
  const [campaign, setCampaign] = useState<FeedbackCampaign | null>(null);
  const [targetIds, setTargetIds] = useState<number[]>([]);
  const [evalConfig, setEvalConfig] = useState<EvaluatorConfigInput>(DEFAULT_EVAL_CONFIG);
  const [assignmentResult, setAssignmentResult] = useState<FeedbackAssignmentGenerationResponse | null>(null);

  /** Which steps are "done" (green) */
  const isDone = (id: TabId): boolean => {
    if (id === 0) return true; // forms tab always accessible
    if (id === 1) return campaign !== null;
    if (id === 2) return targetIds.length > 0;
    if (id === 3) return assignmentResult !== null;
    if (id === 4) return campaign !== null;
    if (id === 5) return campaign?.status === 'CLOSED';
    return false;
  };

  /** Steps are accessible if the previous required step is done */
  const isLocked = (id: TabId): boolean => {
    if (id === 0) return false;
    if (id === 1) return false; // always accessible – can create a campaign any time
    if (id === 2) return campaign === null;
    if (id === 3) return targetIds.length === 0;
    if (id === 4) return campaign === null;
    if (id === 5) return false; // visible but shows "no closed campaigns" if none
    return false;
  };

  const navigate = (id: TabId) => {
    if (!isLocked(id)) setActiveTab(id);
  };

  const stepClass = (id: TabId) => {
    if (activeTab === id) return 'hfd-step active';
    if (isDone(id)) return 'hfd-step done';
    if (isLocked(id)) return 'hfd-step locked';
    return 'hfd-step';
  };

  return (
    <div className="hfd-shell">
      {/* Page header */}
      <div className="hfd-header">
        <h1>
          <i className="bi bi-arrow-repeat" />
          360-Degree Feedback
        </h1>
        <p>HR Management Console — follow the steps below to create forms, launch campaigns, and view analytics</p>
      </div>

      {/* Step wizard nav */}
      <div className="hfd-steps">
        {STEPS.map(step => (
          <div
            key={step.id}
            className={stepClass(step.id)}
            onClick={() => navigate(step.id)}
            title={isLocked(step.id) ? 'Complete previous steps first' : step.label}
          >
            <div className="hfd-step-bubble">
              {isDone(step.id) && activeTab !== step.id
                ? <i className="bi bi-check-lg" />
                : step.id + 1}
            </div>
            <span className="hfd-step-label">{step.shortLabel}</span>
          </div>
        ))}
      </div>

      {/* Tab content */}
      <div className="hfd-card">
        {activeTab === 0 && (
          <FormManagementTab onFormCreated={() => {}} />
        )}

        {activeTab === 1 && (
          <CampaignSetupTab
            onCampaignCreated={(c) => {
              setCampaign(c);
              // Auto-advance to next step
              setTimeout(() => setActiveTab(2), 800);
            }}
          />
        )}

        {activeTab === 2 && (
          <EmployeeTargetingTab
            campaign={campaign}
            onTargetsSet={(ids, cfg) => {
              setTargetIds(ids);
              setEvalConfig(cfg);
              setActiveTab(3);
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

        {/* Bottom navigation */}
        <div className="hfd-nav-footer">
          <button
            className="hfd-btn hfd-btn-secondary"
            onClick={() => setActiveTab(prev => Math.max(0, prev - 1) as TabId)}
            disabled={activeTab === 0}
          >
            <i className="bi bi-arrow-left" /> Previous
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem', color: '#9ca3af' }}>
            <i className={`bi ${STEPS[activeTab].icon}`} />
            Step {activeTab + 1} of {STEPS.length} — {STEPS[activeTab].label}
          </div>

          <div className="hfd-nav-footer-right">
            {activeTab < STEPS.length - 1 && (
              <button
                className="hfd-btn hfd-btn-primary"
                onClick={() => {
                  const next = (activeTab + 1) as TabId;
                  if (!isLocked(next)) setActiveTab(next);
                }}
                disabled={isLocked((activeTab + 1) as TabId)}
              >
                Next <i className="bi bi-arrow-right" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
