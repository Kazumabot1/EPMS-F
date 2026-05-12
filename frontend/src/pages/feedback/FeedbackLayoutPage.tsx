/*
import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import FeedbackCampaignsPage from './FeedbackCampaignsPage';
import FeedbackRequestsPage from './FeedbackRequestsPage';
import FeedbackResponsesPage from './FeedbackResponsesPage';
import FeedbackAnalyticsPage from './FeedbackAnalyticsPage';
import FeedbackFormsPage from './FeedbackFormsPage';
import FeedbackAuditPage from './FeedbackAuditPage';
import '../hr/performance-kpi/kpi-ui.css';
import './feedback-layout.css';

const tabs = [
  { to: '/hr/feedback/campaigns', label: 'Campaigns' },
  { to: '/hr/feedback/forms', label: 'Forms' },
  { to: '/hr/feedback/requests', label: 'Requests' },
  { to: '/hr/feedback/responses', label: 'Responses' },
  { to: '/hr/feedback/analytics', label: 'Analytics' },
  { to: '/hr/feedback/audit', label: 'Audit' },
];

const FeedbackTabs = () => (
  <div className="feedback-module-tabs">
    {tabs.map((tab) => (
      <NavLink
        key={tab.to}
        to={tab.to}
        className={({ isActive }) => `feedback-module-tab ${isActive ? 'active' : ''}`}
      >
        {tab.label}
      </NavLink>
    ))}
  </div>
);

const FeedbackLayoutPage = () => (
  <div className="feedback-page">
    <section className="feedback-hero">
      <span className="feedback-hero-badge">360 Feedback</span>
      <div className="feedback-hero-copy">
        <h1>360 Feedback Workspace</h1>
        <p>
          Build forms, launch campaigns, assign reviewers, and monitor results from one place.
          The module is now organized as practical sub-tabs instead of a generic overview page.
        </p>
      </div>
      <FeedbackTabs />
    </section>

    <Routes>
      <Route path="/" element={<Navigate to="/hr/feedback/campaigns" replace />} />
      <Route path="/campaigns" element={<FeedbackCampaignsPage />} />
      <Route path="/forms" element={<FeedbackFormsPage />} />
      <Route path="/requests" element={<FeedbackRequestsPage />} />
      <Route path="/responses" element={<FeedbackResponsesPage />} />
      <Route path="/analytics" element={<FeedbackAnalyticsPage />} />
      <Route path="/audit" element={<FeedbackAuditPage />} />
    </Routes>
  </div>
);

export default FeedbackLayoutPage;
 */






/*

import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import FeedbackCampaignsPage from './FeedbackCampaignsPage';
import FeedbackRequestsPage from './FeedbackRequestsPage';
import FeedbackResponsesPage from './FeedbackResponsesPage';
import FeedbackAnalyticsPage from './FeedbackAnalyticsPage';
import FeedbackFormsPage from './FeedbackFormsPage';
import FeedbackAuditPage from './FeedbackAuditPage';
import '../hr/performance-kpi/kpi-ui.css';
import './feedback-layout.css';

const tabs = [
  { to: '/feedback/campaigns', label: 'Campaigns' },
  { to: '/feedback/forms', label: 'Forms' },
  { to: '/feedback/requests', label: 'Requests' },
  { to: '/feedback/responses', label: 'Responses' },
  { to: '/feedback/analytics', label: 'Analytics' },
  { to: '/feedback/audit', label: 'Audit' },
];

const FeedbackTabs = () => (
  <div className="feedback-module-tabs">
    {tabs.map((tab) => (
      <NavLink
        key={tab.to}
        to={tab.to}
        className={({ isActive }) => `feedback-module-tab ${isActive ? 'active' : ''}`}
      >
        {tab.label}
      </NavLink>
    ))}
  </div>
);
 */






import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import FeedbackCampaignsPage from './FeedbackCampaignsPage';
import FeedbackRequestsPage from './FeedbackRequestsPage';
import FeedbackResponsesPage from './FeedbackResponsesPage';
import FeedbackAnalyticsPage from './FeedbackAnalyticsPage';
import FeedbackFormsPage from './FeedbackFormsPage';
import FeedbackAuditPage from './FeedbackAuditPage';
import '../hr/performance-kpi/kpi-ui.css';
import './feedback-layout.css';

const tabs = [
  { to: '/feedback/campaigns', label: 'Campaigns' },
  { to: '/feedback/forms', label: 'Forms' },
  { to: '/feedback/requests', label: 'Requests' },
  { to: '/feedback/responses', label: 'Responses' },
  { to: '/feedback/analytics', label: 'Analytics' },
  { to: '/feedback/audit', label: 'Audit' },
];

const FeedbackTabs = () => (
  <div className="feedback-module-tabs">
    {tabs.map((tab) => (
      <NavLink
        key={tab.to}
        to={tab.to}
        className={({ isActive }) => `feedback-module-tab ${isActive ? 'active' : ''}`}
      >
        {tab.label}
      </NavLink>
    ))}
  </div>
);

const FeedbackLayoutPage = () => (
  <div className="feedback-page">
    <section className="feedback-hero">
      <span className="feedback-hero-badge">360 Feedback</span>
      <div className="feedback-hero-copy">
        <h1>360 Feedback Workspace</h1>
        <p>
          Build forms, launch campaigns, assign reviewers, and monitor results from one place.
          The module is now organized as practical sub-tabs instead of a generic overview page.
        </p>
      </div>
      <FeedbackTabs />
    </section>

    <Routes>
      <Route index element={<Navigate to="campaigns" replace />} />
      <Route path="campaigns" element={<FeedbackCampaignsPage />} />
      <Route path="forms" element={<FeedbackFormsPage />} />
      <Route path="requests" element={<FeedbackRequestsPage />} />
      <Route path="responses" element={<FeedbackResponsesPage />} />
      <Route path="analytics" element={<FeedbackAnalyticsPage />} />
      <Route path="audit" element={<FeedbackAuditPage />} />
    </Routes>
  </div>
);

export default FeedbackLayoutPage;