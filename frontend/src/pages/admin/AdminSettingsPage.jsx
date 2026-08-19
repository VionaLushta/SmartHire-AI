import { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import AdminCard from '../../components/admin/AdminCard';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState({
    companyName: 'SmartHire AI',
    supportEmail: 'support@smarthire.ai',
    timezone: 'UTC+00:00',
  });

  const handleChange = (event) => {
    const { name, value } = event.target;
    setSettings((current) => ({ ...current, [name]: value }));
  };

  return (
    <AdminCard title="Platform settings" description="Configure high-level organization and operational settings.">
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-950">Brand & profile</h3>
          <div className="space-y-4">
            <label className="block text-sm font-medium text-slate-700">
              Company name
              <Input className="mt-2" name="companyName" value={settings.companyName} onChange={handleChange} />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Support email
              <Input className="mt-2" name="supportEmail" value={settings.supportEmail} onChange={handleChange} />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Timezone
              <Input className="mt-2" name="timezone" value={settings.timezone} onChange={handleChange} />
            </label>
          </div>
        </div>

        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-950">Security</h3>
          <div className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">
            <div className="flex items-center gap-2 font-medium"><ShieldCheck className="h-4 w-4" /> Security posture is healthy</div>
            <p className="mt-2">All admin policies and access controls are currently within the expected threshold.</p>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-xl border border-slate-200 p-3">
              <span className="text-sm text-slate-700">Require two-factor authentication</span>
              <input type="checkbox" defaultChecked className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
            </div>
            <div className="flex items-center justify-between rounded-xl border border-slate-200 p-3">
              <span className="text-sm text-slate-700">Enable audit logging</span>
              <input type="checkbox" defaultChecked className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 flex justify-end gap-3">
        <Button variant="secondary" type="button">Reset</Button>
        <Button variant="primary" type="button">Save changes</Button>
      </div>
    </AdminCard>
  );
}
