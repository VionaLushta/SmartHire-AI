import Card from '../ui/Card';
import { classNames } from '../../utils/classNames';

export default function DashboardCard({ id, title, description, action, children, className = '' }) {
  return (
    <section id={id} className="scroll-mt-24">
      <Card className={classNames('p-6 sm:p-7', className)}>
        {(title || description || action) ? (
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              {title ? <h3 className="text-[24px] font-bold tracking-[-0.04em] text-slate-900">{title}</h3> : null}
              {description ? <p className="text-sm leading-6 text-slate-500">{description}</p> : null}
            </div>
            {action ? <div className="shrink-0">{action}</div> : null}
          </div>
        ) : null}
        {children}
      </Card>
    </section>
  );
}
