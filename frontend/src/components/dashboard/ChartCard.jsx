import DashboardCard from './DashboardCard';

export default function ChartCard({ id, title, description, children, action }) {
  return (
    <DashboardCard id={id} title={title} description={description} action={action} className="h-full">
      {children}
    </DashboardCard>
  );
}
