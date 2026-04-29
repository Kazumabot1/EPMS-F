import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import HrEmployeeAccountImport from './pages/employee/HrEmployeeAccountImport';
import Home from './components/Home';
import Login from './components/Login';
import Register from './components/Register';
import Permissions from './components/Permissions';
import UserRoles from './components/UserRoles';
import RolePermissions from './components/RolePermissions';
import PipUpdates from './components/PipUpdates';
import NotificationTemplates from './components/NotificationTemplates';
import OneOnOneMeetings from './components/OneOnOneMeetings';
import OneOnOneActionItems from './components/OneOnOneActionItems';
import ProtectedRoute from './routes/ProtectedRoute';
import CreateEmployeeAccount from './pages/employee/CreateEmployeeAccount';
import EmployeeLayout from './components/layout/EmployeeLayout';
import HRLayout from './components/layout/HRLayout';

import EmployeeDashboard from './pages/employee/EmployeeDashboard';
import EmployeeManagement from './pages/employee/EmployeeManagement';
import TeamManagement from './pages/team/TeamManagement';
import TeamCreate from './pages/team/TeamCreate';
import DepartmentManagement from './pages/department/DepartmentManagement';

import PositionCreate from './pages/position/Create';
import PositionTable from './pages/position/Table';
import PositionLevelCreate from './pages/position-level/Create';

import KpiUnitPage from './pages/hr/performance-kpi/unit/KpiUnitPage';
import KpiCategoryPage from './pages/hr/performance-kpi/category/KpiCategoryPage';
import KpiItemPage from './pages/hr/performance-kpi/item/KpiItemPage';
import KpiFormPage from './pages/hr/performance-kpi/form/KpiFormPage';
import ProfilePage from './pages/hr/ProfilePage';
import ForceChangePasswordPage from './pages/auth/ForceChangePasswordPage';
import CreateCampaignPage from './pages/feedback-campaign/CreateCampaignPage';
import FeedbackWorkspaceLayout from './pages/feedback-evaluator/FeedbackWorkspaceLayout';
import MyTasksPage from './pages/feedback-evaluator/MyTasksPage';
import FeedbackFormPage from './pages/feedback-evaluator/FeedbackFormPage';
import EmployeeResultPage from './pages/feedback-analytics/EmployeeResultPage';
import ManagerSummaryPage from './pages/feedback-analytics/ManagerSummaryPage';
import FeedbackAnalyticsPage from './pages/feedback/FeedbackAnalyticsPage';
import HrFeedbackDashboard from './pages/hr-feedback/HrFeedbackDashboard';
import FeedbackFormsPage from './pages/feedback/FeedbackFormsPage';
import FeedbackCampaignsPage from './pages/feedback/FeedbackCampaignsPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/change-password" element={<ForceChangePasswordPage />} />
          <Route element={<FeedbackWorkspaceLayout />}>
            <Route path="/feedback/my-tasks" element={<MyTasksPage />} />
            <Route path="/feedback/assignments/:assignmentId" element={<FeedbackFormPage />} />
            <Route path="/feedback/my-result" element={<EmployeeResultPage />} />
            <Route path="/feedback/team-summary" element={<ManagerSummaryPage />} />
          </Route>
          <Route element={<EmployeeLayout />}>
            <Route path="/employee/dashboard" element={<EmployeeDashboard />} />
          </Route>


          <Route element={<HRLayout />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Home />} />
            <Route path="/hr/profile" element={<ProfilePage />} />

            <Route path="/hr/employee" element={<EmployeeManagement />} />
            <Route path="/hr/employee/workforce" element={<EmployeeDashboard />} />
            <Route path="/hr/employee/create" element={<CreateEmployeeAccount />} />
            <Route path="/hr/employee/import" element={<HrEmployeeAccountImport />} />
            <Route path="/hr/team" element={<TeamManagement />} />
            <Route path="/hr/team/create" element={<TeamCreate />} />
            <Route path="/hr/department" element={<DepartmentManagement />} />

            <Route path="/permissions" element={<Permissions />} />
            <Route path="/user-roles" element={<UserRoles />} />
            <Route path="/role-permissions" element={<RolePermissions />} />

            <Route path="/pip-updates" element={<PipUpdates />} />
            <Route path="/notifications" element={<NotificationTemplates />} />
            <Route path="/one-on-one-meetings" element={<OneOnOneMeetings />} />
            <Route path="/one-on-one-action-items" element={<OneOnOneActionItems />} />

            <Route path="/hr/position/create" element={<PositionCreate />} />
            <Route path="/hr/position-level/create" element={<PositionLevelCreate />} />
            <Route path="/hr/position/table" element={<PositionTable />} />

            <Route path="/hr/performance-kpi/unit" element={<KpiUnitPage />} />
            <Route path="/hr/performance-kpi/category" element={<KpiCategoryPage />} />
            <Route path="/hr/performance-kpi/item" element={<KpiItemPage />} />
            <Route path="/hr/performance-kpi/form" element={<KpiFormPage />} />

            {/* 360 Feedback — HR Dashboard (new wizard) */}
            <Route path="/hr/feedback/dashboard" element={<HrFeedbackDashboard />} />
            {/* Keep old routes for backward compatibility */}
            <Route path="/hr/feedback/campaigns/setup" element={<CreateCampaignPage />} />
            <Route path="/hr/feedback/analytics" element={<FeedbackAnalyticsPage />} />
            <Route path="/hr/feedback/forms" element={<FeedbackFormsPage />} />
            <Route path="/hr/feedback/campaigns" element={<FeedbackCampaignsPage />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
