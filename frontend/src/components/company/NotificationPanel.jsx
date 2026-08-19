import NotificationList from '../dashboard/NotificationList';
import DashboardCard from '../dashboard/DashboardCard';

export default function NotificationPanel({
  notifications = [],
  readIds = [],
  onMarkRead,
  onMarkAllRead,
}) {
  return (
    <DashboardCard title="Notifications" description="Unread items stay local until future notification workflows are connected.">
      <NotificationList
        items={notifications}
        readIds={readIds}
        onMarkRead={onMarkRead}
        onMarkAllRead={onMarkAllRead}
      />
    </DashboardCard>
  );
}
