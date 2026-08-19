import { TrendingUp } from 'lucide-react';
import AdminCard from '../../components/admin/AdminCard';
import StatisticsGrid from '../../components/admin/StatisticsGrid';

const stats = [
  { label: 'Total applications', value: '2,846', change: '+12.4%', direction: 'up' },
  { label: 'Offer rate', value: '34.8%', change: '+3.1%', direction: 'up' },
  { label: 'Avg. time to hire', value: '18d', change: '-2.4d', direction: 'down' },
  { label: 'Candidate satisfaction', value: '4.8/5', change: '+0.3', direction: 'up' },
];

export default function AdminAnalyticsPage() {
  return (
    <AdminCard title="Analytics overview" description="Track platform performance and recruitment outcomes.">
      <div className="space-y-6">
        <StatisticsGrid stats={stats} />
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-950">Recruitment trends</h3>
              <TrendingUp className="h-5 w-5 text-emerald-600" />
            </div>
            <div className="space-y-3">
              {[{ month: 'Jan', value: 40 }, { month: 'Feb', value: 58 }, { month: 'Mar', value: 72 }, { month: 'Apr', value: 65 }, { month: 'May', value: 84 }, { month: 'Jun', value: 92 }].map((item) => (
                <div key={item.month} className="space-y-1">
                  <div className="flex items-center justify-between text-sm text-slate-600">
                    <span>{item.month}</span>
                    <span>{item.value}%</span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-cyan-500" style={{ width: `${item.value}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-950">Hiring mix</h3>
            <div className="mt-5 space-y-3">
              {[
                { label: 'Full-stack', amount: '42%', color: 'bg-blue-500' },
                { label: 'Product', amount: '26%', color: 'bg-violet-500' },
                { label: 'Design', amount: '19%', color: 'bg-amber-500' },
                { label: 'Data', amount: '13%', color: 'bg-emerald-500' },
              ].map((item) => (
                <div key={item.label}>
                  <div className="mb-1 flex items-center justify-between text-sm text-slate-600">
                    <span>{item.label}</span>
                    <span>{item.amount}</span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                    <div className={`h-full rounded-full ${item.color}`} style={{ width: item.amount }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AdminCard>
  );
}
