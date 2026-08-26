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
        <div className="space-y-4 rounded-[16px] border border-[rgba(15,23,42,0.08)] bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
          <h3 className="text-[24px] font-bold tracking-[-0.04em] text-slate-950">Brand & profile</h3>
          <div className="space-y-4">
            <Input label="Organization name" name="companyName" value={settings.companyName} onChange={handleChange} />
            <Input label="Support email" name="supportEmail" value={settings.supportEmail} onChange={handleChange} />
            <Input label="Timezone" name="timezone" value={settings.timezone} onChange={handleChange} />
          </div>
        </div>

        <div className="space-y-4 rounded-[16px] border border-[rgba(15,23,42,0.08)] bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
          <h3 className="text-[24px] font-bold tracking-[-0.04em] text-slate-950">Security</h3>
          <div className="rounded-[14px] border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-800">
            <div className="flex items-center gap-2 font-medium">
              <ShieldCheck className="h-4 w-4" />
              Security posture is healthy
            </div>
            <p className="mt-2">All admin policies and access controls are currently within the expected threshold.</p>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-[14px] border border-[rgba(15,23,42,0.08)] p-3">
              <span className="text-sm text-slate-700">Require two-factor authentication</span>
              <input type="checkbox" defaultChecked className="h-4 w-4 rounded border-[rgba(15,23,42,0.12)] text-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/15" />
            </div>
            <div className="flex items-center justify-between rounded-[14px] border border-[rgba(15,23,42,0.08)] p-3">
              <span className="text-sm text-slate-700">Enable audit logging</span>
              <input type="checkbox" defaultChecked className="h-4 w-4 rounded border-[rgba(15,23,42,0.12)] text-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/15" />
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
