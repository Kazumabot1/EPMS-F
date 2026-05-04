import './employee-dashboard.css';

const summaryCards = [
  {
    title: 'My KPI Score',
    value: '91.6%',
    subtitle: 'of 100% total weight',
    icon: 'bi-bullseye',
    iconClass: 'bg-indigo-50 text-indigo-600',
    extra: '+2.3% vs last quarter',
  },
  {
    title: 'Appraisal Status',
    value: 'self submitted',
    subtitle: 'Annual Review 2024',
    icon: 'bi-clipboard-check',
    iconClass: 'bg-emerald-50 text-emerald-600',
    extra: '',
  },
  {
    title: 'Pending Feedback',
    value: '1',
    subtitle: 'To complete',
    icon: 'bi-chat-dots',
    iconClass: 'bg-amber-50 text-amber-600',
    extra: '',
  },
  {
    title: 'Next 1-on-1',
    value: 'None',
    subtitle: 'No schedule yet',
    icon: 'bi-calendar-check',
    iconClass: 'bg-sky-50 text-sky-600',
    extra: '',
  },
];

const EmployeeMyDashboard = () => {
  return (
    <div className="employee-dashboard">
      <section className="employee-dashboard-title">
        <h1>My Dashboard</h1>
        <p>Your performance overview and pending tasks</p>
      </section>

      <section className="employee-summary-grid">
        {summaryCards.map((card) => (
          <article key={card.title} className="employee-summary-card">
            <div className="employee-summary-head">
              <div>
                <p className="employee-summary-label">{card.title}</p>
                <p className="employee-summary-value">{card.value}</p>
                <p className="employee-summary-subtitle">{card.subtitle}</p>
                {card.extra && <p className="employee-summary-extra">{card.extra}</p>}
              </div>
              <span className={`employee-summary-icon ${card.iconClass}`}>
                <i className={`bi ${card.icon}`} />
              </span>
            </div>
          </article>
        ))}
      </section>

      <section className="employee-panel-grid">
        <article className="employee-panel-card employee-panel-main">
          <div className="employee-panel-head">
            <h2>My KPIs</h2>
            <button type="button">
              View All
            </button>
          </div>
          <div className="employee-kpi-box">
            <div className="employee-kpi-row">
              <p>Code Quality Score</p>
              <span>Active</span>
            </div>
            <p className="employee-kpi-muted">Weight: 25%</p>
            <div className="employee-kpi-progress">
              <div />
            </div>
            <p className="employee-kpi-muted">92 / 90 (102%)</p>
          </div>
        </article>

        <article className="employee-panel-card">
          <h2 className="employee-notification-title">Recent Notifications</h2>
          <ul className="employee-notification-list">
            <li>Your self-assessment for Annual Review 2024 is due soon.</li>
            <li>You have a pending feedback request from Jessica Park.</li>
            <li>No 1-on-1 meeting has been scheduled for this week.</li>
          </ul>
        </article>
      </section>
    </div>
  );
};

export default EmployeeMyDashboard;
