import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { appraisalTemplateService } from '../../services/appraisalService';
import { extractApiErrorMessage } from '../../services/apiError';
import type { AppraisalSectionRequest, AppraisalTemplateRequest } from '../../types/appraisal';
import AppraisalRatingDots from '../../components/appraisal/AppraisalRatingDots';
import './appraisal.css';

const makeCriteria = (criteriaText: string, sortOrder: number, description = '') => ({
  criteriaText,
  description,
  sortOrder,
  maxRating: 5,
  ratingRequired: true,
  active: true,
});

const defaultSections = (): AppraisalSectionRequest[] => [
  {
    sectionName: 'Job Knowledge / Technical Skills',
    description: '',
    sortOrder: 1,
    active: true,
    criteria: [
      makeCriteria('Process relevant knowledge of work.', 1, 'Demonstrates understanding of job-related processes'),
      makeCriteria('Knowledge / technical competence / skill in the area of specialization.', 2, 'Technical expertise in primary domain'),
    ],
  },
  {
    sectionName: 'Accountability',
    description: '',
    sortOrder: 2,
    active: true,
    criteria: [
      makeCriteria('Accomplish the Personal Business Objectives.', 1),
      makeCriteria('Committed to work.', 2),
      makeCriteria('Plans and organizes work effectively.', 3),
      makeCriteria('Proactive and takes initiative.', 4),
      makeCriteria('Has a sense of urgency in acting on work matters.', 5),
      makeCriteria('Willing to learn.', 6),
    ],
  },
  {
    sectionName: 'Problem Solving & Supervision',
    description: '',
    sortOrder: 3,
    active: true,
    criteria: [
      makeCriteria('Helps resolve staff problems related to work.', 1),
      makeCriteria('Handles problem situations effectively.', 2),
      makeCriteria('Is a positive role model for other staff.', 3),
      makeCriteria('Effectively supervises the work of subordinates.', 4),
    ],
  },
  {
    sectionName: 'Innovation',
    description: '',
    sortOrder: 4,
    active: true,
    criteria: [
      makeCriteria('Develops team members.', 1),
      makeCriteria('Shows originality and creativity in thinking.', 2),
      makeCriteria('Meets challenges with resourcefulness.', 3),
      makeCriteria('Generates suggestions for improving work.', 4),
      makeCriteria('Develops innovative approaches and ideas.', 5),
    ],
  },
  {
    sectionName: 'Team Work',
    description: '',
    sortOrder: 5,
    active: true,
    criteria: [
      makeCriteria('Able to work independently.', 1),
      makeCriteria('Willing to work with others in a team.', 2),
      makeCriteria('Share information and/or skills with colleague.', 3),
    ],
  },
  {
    sectionName: 'Quality Work',
    description: '',
    sortOrder: 6,
    active: true,
    criteria: [
      makeCriteria("Understands the company's norms.", 1),
      makeCriteria('Is accurate, thorough and careful with work performed.', 2),
      makeCriteria("Sustain the company's quality.", 3),
      makeCriteria('Seeks to continually improve processes and work methods.', 4),
    ],
  },
  {
    sectionName: 'Loyalty',
    description: '',
    sortOrder: 7,
    active: true,
    criteria: [
      makeCriteria('Able to work with minimum supervision.', 1),
      makeCriteria('Is trustworthy, responsible, and reliable.', 2),
      makeCriteria('Is willing to accept new responsibilities.', 3),
    ],
  },
  {
    sectionName: 'Attendance / Office Rules & Regulation Compliance',
    description: '',
    sortOrder: 8,
    active: true,
    criteria: [
      makeCriteria('Has good attendance.', 1),
      makeCriteria("Observation of office's rules and regulation.", 2),
      makeCriteria('Meets all compliance requirements without deductions.', 3),
    ],
  },
];

const emptyTemplate = (): AppraisalTemplateRequest => ({
  templateName: 'Performance Appraisal Form Template',
  description: '',
  formType: 'ANNUAL',
  targetAllDepartments: true,
  departmentIds: [],
  sections: defaultSections(),
});

const scoreRanges = [
  { range: '86-100', label: 'Outstanding', description: 'Performance exceptional and far exceeds expectations.' },
  { range: '71-85', label: 'Exceeds Requirements', description: 'Performance is consistent and clearly meets essential requirements.' },
  { range: '60-70', label: 'Meet Requirement', description: 'Performance is satisfactory and meets requirements of the job.' },
  { range: '40-59', label: 'Need Improvement', description: 'Performance is inconsistent. Supervision and training are needed.' },
  { range: '00-39', label: 'Unsatisfactory', description: 'Performance does not meet the minimum requirement of the job.' },
];
const AppraisalTemplateCreatePage = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState<AppraisalTemplateRequest>(() => emptyTemplate());
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const totalCriteria = useMemo(
    () => form.sections.reduce((sum, section) => sum + section.criteria.length, 0),
    [form.sections],
  );

  const updateSection = (sectionIndex: number, patch: Partial<AppraisalSectionRequest>) => {
    setForm((previous) => ({
      ...previous,
      sections: previous.sections.map((section, index) => (
        index === sectionIndex ? { ...section, ...patch } : section
      )),
    }));
  };

  const updateCriterion = (
    sectionIndex: number,
    criteriaIndex: number,
    patch: Partial<AppraisalSectionRequest['criteria'][number]>,
  ) => {
    setForm((previous) => ({
      ...previous,
      sections: previous.sections.map((section, index) => {
        if (index !== sectionIndex) return section;
        return {
          ...section,
          criteria: section.criteria.map((criteria, innerIndex) => (
            innerIndex === criteriaIndex ? { ...criteria, ...patch } : criteria
          )),
        };
      }),
    }));
  };

  const addSection = () => {
    setForm((previous) => ({
      ...previous,
      sections: [
        ...previous.sections,
        {
          sectionName: 'New Section',
          description: '',
          sortOrder: previous.sections.length + 1,
          active: true,
          criteria: [makeCriteria('New criteria', 1)],
        },
      ],
    }));
  };

  const removeSection = (sectionIndex: number) => {
    setForm((previous) => ({
      ...previous,
      sections: previous.sections.filter((_, index) => index !== sectionIndex),
    }));
  };

  const addCriteria = (sectionIndex: number) => {
    setForm((previous) => ({
      ...previous,
      sections: previous.sections.map((section, index) => {
        if (index !== sectionIndex) return section;
        return {
          ...section,
          criteria: [...section.criteria, makeCriteria('New criteria', section.criteria.length + 1)],
        };
      }),
    }));
  };

  const removeCriteria = (sectionIndex: number, criteriaIndex: number) => {
    setForm((previous) => ({
      ...previous,
      sections: previous.sections.map((section, index) => {
        if (index !== sectionIndex) return section;
        return {
          ...section,
          criteria: section.criteria.filter((_, innerIndex) => innerIndex !== criteriaIndex),
        };
      }),
    }));
  };

  const validate = () => {
    if (!form.templateName.trim()) return 'Form template name is required.';
    if (form.sections.length === 0 || totalCriteria === 0) return 'At least one section and one criteria are required.';
    return '';
  };

  const submit = async () => {
    const validationMessage = validate();
    if (validationMessage) {
      setMessage(validationMessage);
      return;
    }

    setLoading(true);
    setMessage('');
    try {
      const normalizedSections = form.sections.map((section, sectionIndex) => ({
        ...section,
        sortOrder: sectionIndex + 1,
        active: true,
        criteria: section.criteria.map((criteria, criteriaIndex) => ({
          ...criteria,
          sortOrder: criteriaIndex + 1,
          maxRating: criteria.maxRating || 5,
          ratingRequired: true,
          active: true,
        })),
      }));

      const created = await appraisalTemplateService.create({
        templateName: form.templateName.trim(),
        description: form.description,
        formType: 'ANNUAL',
        targetAllDepartments: true,
        departmentIds: [],
        sections: normalizedSections,
      });

      navigate('/hr/appraisal/template-records', {
        state: {
          message: `Form template "${created.templateName}" created successfully.`,
          templateId: created.id,
        },
      });
    } catch (error) {
      setMessage(extractApiErrorMessage(error, 'Form template create failed.'));
    } finally {
      setLoading(false);
    }
  };

  let globalNo = 0;

  return (
    <div className="appraisal-page appraisal-template-page">
      <div className="appraisal-page-header">
        <div>
          <h1>Form Template Create</h1>
          <p>Create reusable blank appraisal form templates. Created templates appear under Template Form Records and can be selected when creating Appraisal records.</p>
        </div>
        <button className="appraisal-button secondary" type="button" onClick={() => setForm(emptyTemplate())}>
          Reset Form
        </button>
      </div>

      {message && <div className="appraisal-card appraisal-message-card">{message}</div>}

      <div className="appraisal-card appraisal-form-sheet">
        <div className="appraisal-template-banner center">
          <h2>Performance Evaluation Form</h2>
          <p>ACE Data Systems Ltd.</p>
        </div>

        <div className="appraisal-form-block">
          <h3>Template Setup</h3>
          <div className="appraisal-inline-grid two">
            <label className="appraisal-field">
              <span>Template Name</span>
              <input value={form.templateName} onChange={(e) => setForm({ ...form, templateName: e.target.value })} />
            </label>
            <label className="appraisal-field">
              <span>Description</span>
              <input value={form.description ?? ''} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </label>
          </div>
          <p className="appraisal-muted">
            This template only stores form structure: sections, criteria, rating scale, and score guide. Employee information and appraisal period dates are filled from Appraisal Create / PM review flow.
          </p>
        </div>

        <div className="appraisal-form-block">
          <div className="appraisal-form-block-header">
            <div>
              <h3>Evaluations</h3>
              <p className="appraisal-muted">HR can edit sections and criteria. Rating circles are visible but disabled here.</p>
            </div>
            <button className="appraisal-button secondary" type="button" onClick={addSection}>Add Section</button>
          </div>

          {form.sections.map((section, sectionIndex) => {
            return (
              <div className="appraisal-section-card" key={`${section.sectionName}-${sectionIndex}`}>
                <div className="appraisal-section-header">
                  <div className="appraisal-section-title-wrap">
                    <input
                      className="appraisal-section-title-input"
                      value={section.sectionName}
                      onChange={(event) => updateSection(sectionIndex, { sectionName: event.target.value })}
                    />
                    <small>{section.criteria.length} criteria</small>
                  </div>
                  <div className="appraisal-button-row compact">
                    <button className="appraisal-button ghost" type="button" onClick={() => addCriteria(sectionIndex)}>Add Row</button>
                    <button className="appraisal-button danger" type="button" onClick={() => removeSection(sectionIndex)}>Delete Section</button>
                  </div>
                </div>

                <div className="appraisal-template-table-wrap">
                  <table className="appraisal-template-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Criteria</th>
                        <th>Description</th>
                        <th>Rating 1-5</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {section.criteria.map((criteria, criteriaIndex) => {
                        globalNo += 1;
                        return (
                          <tr key={`${criteria.criteriaText}-${criteriaIndex}`}>
                            <td className="appraisal-center-cell">{globalNo}</td>
                            <td>
                              <input
                                value={criteria.criteriaText}
                                onChange={(event) => updateCriterion(sectionIndex, criteriaIndex, { criteriaText: event.target.value })}
                                placeholder="Enter criteria..."
                              />
                            </td>
                            <td>
                              <input
                                value={criteria.description ?? ''}
                                onChange={(event) => updateCriterion(sectionIndex, criteriaIndex, { description: event.target.value })}
                                placeholder="Description..."
                              />
                            </td>
                            <td>
                              <AppraisalRatingDots value={null} max={criteria.maxRating || 5} disabled />
                            </td>
                            <td className="appraisal-center-cell">
                              <button className="appraisal-button danger tiny" type="button" onClick={() => removeCriteria(sectionIndex, criteriaIndex)}>X</button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>

        <div className="appraisal-summary-grid">
          <div className="appraisal-summary-card">
            <strong>Total Criteria</strong>
            <span>{totalCriteria}</span>
          </div>
          <div className="appraisal-summary-card">
            <strong>Score Formula</strong>
            <span>Total points / (answered criteria x 5) x 100</span>
          </div>
        </div>

        <div className="appraisal-template-table-wrap score-band-wrap">
          <table className="appraisal-template-table score-band-table">
            <thead>
              <tr>
                <th>Score</th>
                <th>Rating</th>
                <th>Explanation</th>
              </tr>
            </thead>
            <tbody>
              {scoreRanges.map((score) => (
                <tr key={score.range}>
                  <td>{score.range}</td>
                  <td><span className="appraisal-status gray">{score.label}</span></td>
                  <td>{score.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="appraisal-signature-grid">
          <div>Signature of Appraisee & Date</div>
          <div>Signature of Appraiser & Date</div>
          <div>HR Signature / Date / Designation</div>
        </div>

        <div className="appraisal-button-row final-actions">
          <button className="appraisal-button secondary" type="button" onClick={() => setForm(emptyTemplate())}>Cancel</button>
          <button className="appraisal-button primary" type="button" disabled={loading} onClick={submit}>
            Create Form Template
          </button>
        </div>
      </div>
    </div>
  );
};

export default AppraisalTemplateCreatePage;
