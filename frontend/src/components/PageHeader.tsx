import type { ReactNode } from 'react';

type PageHeaderProps = {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
};

const PageHeader = ({ title, subtitle, actions }: PageHeaderProps) => (
  <div className="mb-6 flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">
    <div>
      <h1 className="text-2xl font-bold text-slate-800">{title}</h1>
      {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
    </div>
    {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
  </div>
);

export default PageHeader;
