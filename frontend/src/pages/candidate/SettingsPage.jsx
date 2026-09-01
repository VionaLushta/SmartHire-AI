import { useState } from 'react';
import { authService } from '../../services/authService';
import Button from '../../components/ui/Button';
import PasswordInput from '../../components/auth/PasswordInput';

export default function SettingsPage() {
  const [values, setValues] = useState({ current_password: '', password: '', confirm_password: '' });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const update = (name) => (event) => setValues((current) => ({ ...current, [name]: event.target.value }));
  async function submit(event) {
    event.preventDefault();
    setMessage('');
    setError('');
    if (values.password !== values.confirm_password) { setError('Passwords do not match.'); return; }
    try { await authService.changePassword(values); setValues({ current_password: '', password: '', confirm_password: '' }); setMessage('Password updated successfully.'); }
    catch (err) { setError(err?.response?.data?.detail || 'Unable to update password.'); }
  }
  return <div className="mx-auto max-w-2xl space-y-6 pb-10"><section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm"><p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">Candidate Portal</p><h1 className="mt-2 text-3xl font-semibold text-slate-950">Account Settings</h1></section><form onSubmit={submit} className="space-y-5 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm"><h2 className="text-xl font-semibold text-slate-950">Change password</h2><PasswordInput label="Current password" name="current_password" value={values.current_password} onChange={update('current_password')} /><PasswordInput label="New password" name="password" value={values.password} onChange={update('password')} /><PasswordInput label="Confirm new password" name="confirm_password" value={values.confirm_password} onChange={update('confirm_password')} />{message ? <p className="text-sm text-emerald-700">{message}</p> : null}{error ? <p className="text-sm text-rose-700">{error}</p> : null}<Button type="submit" variant="primary">Update password</Button></form></div>;
}
