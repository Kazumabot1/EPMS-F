import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import LoadingSpinner from '../../components/LoadingSpinner';
import PageHeader from '../../components/PageHeader';
import SectionCard from '../../components/SectionCard';
import ScoreSummary from '../../components/ScoreSummary';
import { appraisalFormApi } from '../../api/appraisalFormApi';
import type { AppraisalForm } from '../../types/appraisal';
import { calculateScoreSummary } from '../../utils/appraisal';

const AppraisalFormDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [record, setRecord] = useState<AppraisalForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await appraisalFormApi.getById(id);
        setRecord(data);
      } catch {
        setError('Unable to load appraisal details.');
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [id]);

  const score = useMemo(() => calculateScoreSummary(record?.sections ?? []), [record?.sections]);

  if (loading) return <LoadingSpinner label="Loading appraisal details..." />;
  if (error) return <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>;
  if (!record) return null;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Appraisal Details"
        subtitle={`${record.meta.employeeName} (${record.meta.employeeId})`}
        actions={
          <>
            <button
              type="button"
              onClick={() => navigate('/hr/appraisal-forms')}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-100"
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => navigate(`/hr/appraisal-forms/${record.id}/edit`)}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
            >
              <i className="bi bi-pencil mr-1" />
              Edit
            </button>
          </>
        }
      />

      <SectionCard title="Employee Information" icon="bi-person">
        <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
          <p><span className="font-semibold">Employee Name:</span> {record.meta.employeeName}</p>
          <p><span className="font-semibold">Employee ID:</span> {record.meta.employeeId}</p>
          <p><span className="font-semibold">Current Position:</span> {record.meta.currentPosition}</p>
          <p><span className="font-semibold">Department:</span> {record.meta.department}</p>
          <p><span className="font-semibold">Assessment Date:</span> {record.meta.assessmentDate}</p>
          <p><span className="font-semibold">Effective Date:</span> {record.meta.effectiveDate}</p>
        </div>
      </SectionCard>

      {record.sections.map((section) => (
        <SectionCard key={section.id} title={section.title} icon="bi-list-check">
          <div className="space-y-2">
            {section.questions.map((question) => (
              <div key={question.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-2 text-sm">
                <span>
                  #{question.itemNo} {question.text || '-'}
                </span>
                <span className="rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white">
                  {question.rating ?? '-'}
                </span>
              </div>
            ))}
          </div>
        </SectionCard>
      ))}

      <ScoreSummary value={score} />

      <SectionCard title="Remarks & Signatures" icon="bi-chat-square-text">
        <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
          <p className="md:col-span-2"><span className="font-semibold">Other Remarks:</span> {record.remarks.otherRemarks || '-'}</p>
          <p className="md:col-span-2"><span className="font-semibold">Appraiser Comment:</span> {record.remarks.appraiserComment || '-'}</p>
          <p><span className="font-semibold">Appraisee Signature:</span> {record.remarks.appraiseeSignature || '-'}</p>
          <p><span className="font-semibold">Appraisee Date:</span> {record.remarks.appraiseeSignedDate || '-'}</p>
          <p><span className="font-semibold">Appraiser Signature:</span> {record.remarks.appraiserSignature || '-'}</p>
          <p><span className="font-semibold">Appraiser Date:</span> {record.remarks.appraiserSignedDate || '-'}</p>
          <p><span className="font-semibold">Review By:</span> {record.remarks.reviewedBy || '-'}</p>
          <p><span className="font-semibold">HR Signature:</span> {record.remarks.hrSignature || '-'}</p>
          <p><span className="font-semibold">HR Date:</span> {record.remarks.hrSignedDate || '-'}</p>
          <p><span className="font-semibold">HR Designation:</span> {record.remarks.hrDesignation || '-'}</p>
        </div>
      </SectionCard>
    </div>
  );
};

export default AppraisalFormDetailsPage;
