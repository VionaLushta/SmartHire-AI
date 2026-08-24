import { Inbox } from 'lucide-react';
import UiEmptyState from '../ui/EmptyState';

export default function EmptyState({
  title = 'No records found',
  description = 'There are no rows to display yet.',
  action,
}) {
  return (
    <UiEmptyState title={title} description={description} icon={Inbox} action={action} />
  );
}
