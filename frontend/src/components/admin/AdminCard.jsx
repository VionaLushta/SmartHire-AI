import Card from '../ui/Card';
import { classNames } from '../../utils/classNames';

export default function AdminCard({ title, description, action, className = '', children }) {
  return (
    <Card className={classNames('p-5 sm:p-6', className)}>
      {(title || description || action) && (
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            {title && <h3 className="text-[24px] font-bold tracking-[-0.04em] text-slate-900">{title}</h3>}
            {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      {children}
    </Card>
  );
}
