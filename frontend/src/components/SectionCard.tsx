import type { ReactNode } from 'react';

type SectionCardProps = {
  title: string;
  icon?: string;
  children: ReactNode;
  actions?: ReactNode;
};

const SectionCard = ({ title, icon, children, actions }: SectionCardProps) => (
  <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
    <header className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
      <h2 className="flex items-center gap-2 text-base font-semibold text-slate-800">
        {icon ? <i className={`bi ${icon} text-slate-500`} aria-hidden="true" /> : null}
        {title}
      </h2>
      {actions}
    </header>
    <div className="p-4">{children}</div>
  </section>
);

export default SectionCard;
