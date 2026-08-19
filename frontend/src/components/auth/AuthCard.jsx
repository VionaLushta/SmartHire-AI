import Card from '../ui/Card';
import { classNames } from '../../utils/classNames';

export default function AuthCard({ children, className = '' }) {
  return (
    <Card
      className={classNames(
        'relative overflow-hidden rounded-3xl border-slate-200/80 bg-white/90 shadow-[0_24px_80px_rgba(15,23,42,0.12)] backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/90',
        className,
      )}
    >
      {children}
    </Card>
  );
}
