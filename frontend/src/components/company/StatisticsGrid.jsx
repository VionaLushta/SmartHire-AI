import StatCard from '../dashboard/StatCard';

export default function StatisticsGrid({ items = [] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
      {items.map((item, index) => (
        <StatCard
          key={item.label}
          icon={item.icon}
          label={item.label}
          value={item.value}
          hint={item.hint}
          tone={item.tone}
          className={index === 0 || index === 3 ? 'xl:col-span-2' : 'xl:col-span-1'}
        />
      ))}
    </div>
  );
}
