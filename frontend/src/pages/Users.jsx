import { Save, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import EmptyState from '../components/EmptyState.jsx';
import { userService } from '../services/userService.js';
import { ROLES } from '../utils/constants.js';

const Users = () => {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');

  const loadUsers = async () => {
    try {
      const response = await userService.list();
      setUsers(response.data.users);
    } catch (err) {
      setError(err.message || 'Could not load users');
    }
  };

  useEffect(() => { loadUsers(); }, []);

  const updateRole = async (targetUser, role) => {
    await userService.update(targetUser._id, { ...targetUser, role });
    await loadUsers();
  };

  const deleteUser = async (id) => {
    if (!window.confirm('Delete this user?')) return;
    await userService.remove(id);
    await loadUsers();
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-ink">Users</h1>
        <p className="text-sm text-slate-500">Admin area for role management.</p>
      </div>
      {error && <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {users.length === 0 ? <EmptyState title="No users found" description="Registered users will appear here." /> : (
        <div className="panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-normal text-slate-500">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((item) => (
                  <tr key={item._id}>
                    <td className="px-4 py-3 font-semibold text-ink">{item.name}</td>
                    <td className="px-4 py-3 text-slate-600">{item.email}</td>
                    <td className="px-4 py-3">
                      <select className="input max-w-56" value={item.role} onChange={(event) => updateRole(item, event.target.value)}>
                        {ROLES.map((role) => <option key={role}>{role}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{new Date(item.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Save size={16} className="text-slate-400" />
                        <button className="rounded-md border border-slate-200 p-2 text-red-600 hover:bg-red-50" onClick={() => deleteUser(item._id)} aria-label="Delete user">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;
