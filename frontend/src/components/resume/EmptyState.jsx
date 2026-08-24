import { Inbox } from 'lucide-react';
import UiEmptyState from '../ui/EmptyState';

export default function EmptyState({
  title = 'Nothing here yet',
  description = 'No items available.',
  action,
}) {
  return (
    <UiEmptyState title={title} description={description} icon={Inbox} action={action} />
  );
}
