import { useEffect, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import AdminCard from '../../components/admin/AdminCard';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { useNotifications } from '../../context/NotificationContext';

const DEFAULT_SETTINGS = {
  companyName: 'SmartHire AI',
  supportEmail: 'support@smarthire.ai',
  timezone: 'UTC+00:00',
  requireTwoFactor: true,
  auditLogging: true,
};

const SETTINGS_STORAGE_KEY = 'smarthire.admin.settings';

export default function AdminSettingsPage() {
  const { success } = useNotifications();
  const [settings, setSettings] = useState({
    ...DEFAULT_SETTINGS,
  });

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (saved) setSettings((current) => ({ ...current, ...JSON.parse(saved) }));
    } catch {
      // Ignore unavailable or malformed browser storage and keep safe defaults.
    }
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setSettings((current) => ({ ...current, [name]: value }));
  };

  const handleToggle = (event) => {
    const { name, checked } = event.target;
    setSettings((current) => ({ ...current, [name]: checked }));
  };

  const handleSave = () => {
    try {
      window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
      success('Settings saved', 'These settings are saved locally for this browser preview.');
    } catch {
      success('Settings updated', 'The changes are active for this session.');
    }
  };

  const handleReset = () => {
    setSettings({ ...DEFAULT_SETTINGS });
    window.localStorage.removeItem(SETTINGS_STORAGE_KEY);
    success('Settings reset', 'The default preview settings are active again.');
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
              <input name="requireTwoFactor" type="checkbox" checked={settings.requireTwoFactor} onChange={handleToggle} className="h-4 w-4 rounded border-[rgba(15,23,42,0.12)] text-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/15" />
            </div>
            <div className="flex items-center justify-between rounded-[14px] border border-[rgba(15,23,42,0.08)] p-3">
              <span className="text-sm text-slate-700">Enable audit logging</span>
              <input name="auditLogging" type="checkbox" checked={settings.auditLogging} onChange={handleToggle} className="h-4 w-4 rounded border-[rgba(15,23,42,0.12)] text-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/15" />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-slate-500">Preview settings are stored only in this browser.</p>
        <div className="flex gap-3">
          <Button variant="secondary" type="button" onClick={handleReset}>Reset</Button>
          <Button variant="primary" type="button" onClick={handleSave}>Save changes</Button>
        </div>
      </div>
    </AdminCard>
  );
}
