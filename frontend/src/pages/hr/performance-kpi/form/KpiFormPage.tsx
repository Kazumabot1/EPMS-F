import { useEffect, useMemo, useState } from 'react';
import { kpiTemplateService } from '../../../../services/kpiTemplateService';
import type { KpiTemplateResponse } from '../../../../types/kpiTemplate';
import '../kpi-ui.css';

const formatDate = (value: string | null) => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
};

const KpiFormPage = () => {
  const [templates, setTemplates] = useState<KpiTemplateResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');

  const loadTemplates = async () => {
    try {
      setLoading(true);
      setError('');
      setTemplates(await kpiTemplateService.getAllTemplates());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load KPI forms.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadTemplates();
  }, []);

  const filteredTemplates = useMemo(
    () => templates.filter((template) => template.title.toLowerCase().includes(query.trim().toLowerCase())),
    [query, templates],
  );

  const handleDelete = async (id: number, title: string) => {
    if (!window.confirm(`Delete KPI form "${title}"?`)) {
      return;
    }
    try {
      await kpiTemplateService.deleteTemplate(id);
      await loadTemplates();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Failed to delete KPI form.');
    }
  };

  return (
    <div className="kpi-page">
      <div className="kpi-hero">
        <div className="kpi-hero-top">
          <div>
            <h1>Performance KPI - Forms</h1>
            <p>Manage KPI form templates for performance evaluations.</p>
          </div>
          <button type="button" className="kpi-btn-primary">
            <i className="bi bi-plus-circle mr-2" />
            Add Form
          </button>
        </div>
      </div>

      <div className="kpi-surface">
        <div className="kpi-toolbar">
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search forms..."
            className="kpi-input max-w-sm"
          />
          <button type="button" onClick={() => void loadTemplates()} className="kpi-btn-ghost">
            <i className="bi bi-arrow-clockwise mr-1" />
            Refresh
          </button>
        </div>

        {loading && <p className="kpi-state info">Loading KPI forms...</p>}
        {error && <p className="kpi-state error">{error}</p>}
        {!loading && !error && filteredTemplates.length === 0 && (
          <p className="kpi-state info">No KPI forms found.</p>
        )}

        {!loading && !error && filteredTemplates.length > 0 && (
          <div className="kpi-table-wrap">
            <table className="kpi-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Title</th>
                  <th>Period</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTemplates.map((template) => (
                  <tr key={template.id}>
                    <td>{template.id}</td>
                    <td>{template.title}</td>
                    <td>
                      {formatDate(template.startDate)} - {formatDate(template.endDate)}
                    </td>
                    <td>
                      <span className={`kpi-status ${template.status.toLowerCase()}`}>
                        {template.status}
                      </span>
                    </td>
                    <td>
                      <div className="kpi-row-actions">
                        <button type="button" className="kpi-icon-btn">
                          <i className="bi bi-eye" />
                        </button>
                        <button type="button" className="kpi-icon-btn">
                          <i className="bi bi-pencil-square" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDelete(template.id, template.title)}
                          className="kpi-icon-btn danger"
                        >
                          <i className="bi bi-trash" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default KpiFormPage;