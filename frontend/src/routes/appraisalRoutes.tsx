import { Navigate, Route } from 'react-router-dom';

import AppraisalCreatePage from '../pages/appraisal/AppraisalCreatePage';
import AppraisalCreateRecordsPage from '../pages/appraisal/AppraisalCreateRecordsPage';
import AppraisalCyclesPage from '../pages/appraisal/AppraisalCyclesPage';
import AppraisalReviewQueuePage from '../pages/appraisal/AppraisalReviewQueuePage';
import AppraisalTemplateCreatePage from '../pages/appraisal/AppraisalTemplateCreatePage';
import AppraisalTemplateRecordsPage from '../pages/appraisal/AppraisalTemplateRecordsPage';

export const appraisalRoutes = (
  <>
    <Route path="/hr/appraisal" element={<Navigate to="/hr/appraisal/template-records" replace />} />
    <Route path="/hr/appraisal/template-create" element={<AppraisalTemplateCreatePage />} />
    <Route path="/hr/appraisal/template-records" element={<AppraisalTemplateRecordsPage />} />
    <Route path="/hr/appraisal/create" element={<AppraisalCreatePage />} />
    <Route path="/hr/appraisal/create-records" element={<AppraisalCreateRecordsPage />} />
    <Route path="/hr/appraisal/cycles" element={<AppraisalCyclesPage />} />
    <Route path="/hr/appraisal/review-check" element={<AppraisalReviewQueuePage mode="hr" />} />
  </>
);