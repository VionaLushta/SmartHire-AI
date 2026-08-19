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
import { authService } from '../../services/authService';
import { unwrapItems } from '../../utils/dashboard';

const mockUsers = [
  { user_id: '1', first_name: 'Alice', last_name: 'Morgan', email: 'alice@smarthire.ai', role_name: 'Admin', status: 'active' },
  { user_id: '2', first_name: 'Noah', last_name: 'Price', email: 'noah@smarthire.ai', role_name: 'Candidate', status: 'active' },
  { user_id: '3', first_name: 'Emma', last_name: 'Brooks', email: 'emma@northstar.io', role_name: 'Company', status: 'pending' },
  { user_id: '4', first_name: 'Daniel', last_name: 'Khan', email: 'daniel@brightpilot.com', role_name: 'Candidate', status: 'suspended' },
];

export default function AdminUsersPage() {
  const { user } = useSelector((state) => state.auth);
  const [items, setItems] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUsers() {
      setLoading(true);
      try {
        const data = await authService.me().catch(() => null);
        if (data) {
          setItems(mockUsers);
        } else {
          setItems(mockUsers);
        }
      } finally {
        setLoading(false);
      }
    }
    loadUsers();
  }, [user]);

  const filteredUsers = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return items;
    return items.filter((person) => {
      const full = `${person.first_name} ${person.last_name} ${person.email} ${person.role_name}`.toLowerCase();
      return full.includes(term);
    });
  }, [items, query]);

  if (loading) return <LoadingState title="Loading users..." />;

  return (
    <AdminCard title="Users management" description="Search and manage platform accounts.">
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
          <Button variant="secondary" type="button">Filter</Button>
          <Button variant="primary" type="button">Add user</Button>
        </div>
      </div>

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
                      <Button size="sm" variant="secondary" type="button">View</Button>
                      <Button size="sm" variant="ghost" type="button"><Shield className="h-4 w-4" /></Button>
                      <Button size="sm" variant="ghost" type="button"><Trash2 className="h-4 w-4" /></Button>
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
    </AdminCard>
  );
}
