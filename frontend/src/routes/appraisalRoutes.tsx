import { Route } from 'react-router-dom';
import AppraisalFormsListPage from '../pages/appraisal-forms/AppraisalFormsListPage';
import AppraisalFormDetailsPage from '../pages/appraisal-forms/AppraisalFormDetailsPage';
import CreateAppraisalFormPage from '../pages/appraisal-forms/CreateAppraisalFormPage';
import EditAppraisalFormPage from '../pages/appraisal-forms/EditAppraisalFormPage';

export const appraisalRoutes = (
  <>
    <Route path="/hr/appraisal-forms" element={<AppraisalFormsListPage />} />
    <Route path="/hr/appraisal-forms/create" element={<CreateAppraisalFormPage />} />
    <Route path="/hr/appraisal-forms/:id" element={<AppraisalFormDetailsPage />} />
    <Route path="/hr/appraisal-forms/:id/edit" element={<EditAppraisalFormPage />} />
  </>
);
