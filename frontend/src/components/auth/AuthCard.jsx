import Card from '../ui/Card';
import { classNames } from '../../utils/classNames';

export default function AuthCard({ children, className = '' }) {
  return (
    <Card
      className={classNames(
        'relative overflow-hidden rounded-[16px] border border-[rgba(15,23,42,0.08)] bg-white shadow-[0_14px_36px_rgba(15,23,42,0.08)]',
        className,
      )}
    >
      {children}
    </Card>
  );
}
