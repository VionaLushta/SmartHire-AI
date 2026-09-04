import { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { Search, Shield, Trash2 } from 'lucide-react';
import AdminCard from '../../components/admin/AdminCard';
import RoleBadge from '../../components/admin/RoleBadge';
import StatusBadge from '../../components/admin/StatusBadge';
import LoadingState from '../../components/jobs/LoadingState';
import EmptyState from '../../components/admin/EmptyState';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Modal from '../../components/ui/Modal';
import { useNotifications } from '../../context/NotificationContext';

const mockUsers = [
  { user_id: '1', first_name: 'Alice', last_name: 'Morgan', email: 'alice@smarthire.ai', role_name: 'Admin', status: 'active' },
  { user_id: '2', first_name: 'Noah', last_name: 'Price', email: 'noah@smarthire.ai', role_name: 'Candidate', status: 'active' },
  { user_id: '3', first_name: 'Emma', last_name: 'Brooks', email: 'emma@northstar.io', role_name: 'Company', status: 'pending' },
  { user_id: '4', first_name: 'Daniel', last_name: 'Khan', email: 'daniel@brightpilot.com', role_name: 'Candidate', status: 'suspended' },
];

export default function AdminUsersPage() {
  const { user } = useSelector((state) => state.auth);
  const { info, success, warning } = useNotifications();
  const [items, setItems] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [filterOpen, setFilterOpen] = useState(false);
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [activeUser, setActiveUser] = useState(null);

  useEffect(() => {
    setItems(mockUsers);
    setLoading(false);
  }, []);

  const filteredUsers = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return items;
    return items.filter((person) => {
      const full = `${person.first_name} ${person.last_name} ${person.email} ${person.role_name}`.toLowerCase();
      const roleMatches = roleFilter === 'all' || person.role_name.toLowerCase() === roleFilter;
      const statusMatches = statusFilter === 'all' || person.status.toLowerCase() === statusFilter;
      return full.includes(term) && roleMatches && statusMatches;
    });
  }, [items, query, roleFilter, statusFilter]);

  const toggleStatus = (person) => {
    setItems((current) => current.map((item) => item.user_id === person.user_id
      ? { ...item, status: item.status === 'active' ? 'suspended' : 'active' }
      : item));
    success('Demo user updated', `${person.first_name} is now ${person.status === 'active' ? 'suspended' : 'active'}.`);
  };

  const removeUser = (person) => {
    if (String(person.user_id) === String(user?.user_id)) {
      warning('Action unavailable', 'The current admin cannot be removed from this preview.');
      return;
    }
    setItems((current) => current.filter((item) => item.user_id !== person.user_id));
    success('Demo user removed', 'The user was removed from this local preview only.');
  };

  if (loading) return <LoadingState title="Loading users..." />;

  return (
    <AdminCard title="Users management" description="Search and manage platform accounts.">
      <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        <strong>Demo data:</strong> these users are local preview records. Changes are not sent to or saved in the production database.
      </div>
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="relative w-full md:max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            className="pl-9"
            aria-label="Search users"
            placeholder="Search users"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" type="button" onClick={() => setFilterOpen((current) => !current)}>Filter</Button>
          <Button variant="primary" type="button" onClick={() => info('Demo users only', 'Adding real users requires a backend user-management endpoint.')}>Add user</Button>
        </div>
      </div>

      {filterOpen ? (
        <div className="mb-5 grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2">
          <label className="text-sm font-medium text-slate-700">Role
            <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)} className="mt-2 h-11 w-full rounded-[14px] border border-slate-200 bg-white px-3 text-sm">
              <option value="all">All roles</option><option value="admin">Admin</option><option value="candidate">Candidate</option><option value="company">Company</option>
            </select>
          </label>
          <label className="text-sm font-medium text-slate-700">Status
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="mt-2 h-11 w-full rounded-[14px] border border-slate-200 bg-white px-3 text-sm">
              <option value="all">All statuses</option><option value="active">Active</option><option value="pending">Pending</option><option value="suspended">Suspended</option>
            </select>
          </label>
        </div>
      ) : null}

      {filteredUsers.length ? (
        <div className="overflow-hidden rounded-2xl border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-left">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">User</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Role</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Status</th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {filteredUsers.map((person) => (
                <tr key={person.user_id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-slate-900">{person.first_name} {person.last_name}</p>
                      <p className="text-sm text-slate-500">{person.email}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3"><RoleBadge role={person.role_name} /></td>
                  <td className="px-4 py-3"><StatusBadge status={person.status} /></td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Button size="sm" variant="secondary" type="button" onClick={() => setActiveUser(person)}>View</Button>
                      <Button size="sm" variant="ghost" type="button" aria-label={`${person.status === 'active' ? 'Suspend' : 'Activate'} ${person.email}`} onClick={() => toggleStatus(person)}><Shield className="h-4 w-4" /></Button>
                      <Button size="sm" variant="ghost" type="button" aria-label={`Remove ${person.email}`} onClick={() => removeUser(person)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState title="No users match your search" description="Try another filter or add a new user." />
      )}
      <Modal open={Boolean(activeUser)} title="Demo user details" onClose={() => setActiveUser(null)}>
        {activeUser ? <div className="space-y-3 text-sm"><p><strong>Name:</strong> {activeUser.first_name} {activeUser.last_name}</p><p><strong>Email:</strong> {activeUser.email}</p><p><strong>Role:</strong> {activeUser.role_name}</p><p><strong>Status:</strong> {activeUser.status}</p><p className="pt-2 text-slate-500">This is a local demo record and is not connected to production user management.</p></div> : null}
      </Modal>
    </AdminCard>
  );
}
