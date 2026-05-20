import { ClipboardList, FolderKanban, LayoutDashboard, LogOut, Menu, Siren, Users, X } from 'lucide-react';
import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/projects', label: 'Projects', icon: FolderKanban },
  { to: '/tasks', label: 'Tasks', icon: ClipboardList },
  { to: '/updates', label: 'Updates', icon: Siren },
  { to: '/users', label: 'Users', icon: Users, adminOnly: true }
];

const AppLayout = () => {
  const [open, setOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const sidebar = (
    <aside className="flex h-full w-72 flex-col border-r border-slate-200 bg-white">
      <div className="flex h-16 items-center justify-between px-5">
        <div>
          <p className="text-lg font-bold text-ink">PM Tracker</p>
          <p className="text-xs text-slate-500">Projects, tasks, BRAG</p>
        </div>
        <button className="rounded-md p-2 md:hidden" onClick={() => setOpen(false)} aria-label="Close menu">
          <X size={20} />
        </button>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems
          .filter((item) => !item.adminOnly || user?.role === 'Admin')
          .map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-semibold transition ${
                  isActive ? 'bg-ink text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-ink'
                }`
              }
            >
              <item.icon size={18} />
              {item.label}
            </NavLink>
          ))}
      </nav>
      <div className="border-t border-slate-200 p-4">
        <p className="text-sm font-semibold text-ink">{user?.name}</p>
        <p className="text-xs text-slate-500">{user?.role}</p>
        <button className="mt-4 flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100" onClick={handleLogout}>
          <LogOut size={17} />
          Logout
        </button>
      </div>
    </aside>
  );

  return (
    <div className="min-h-screen bg-canvas">
      <div className="hidden md:fixed md:inset-y-0 md:left-0 md:block">{sidebar}</div>
      {open && <div className="fixed inset-0 z-40 bg-ink/30 md:hidden" onClick={() => setOpen(false)} />}
      <div className={`fixed inset-y-0 left-0 z-50 transition md:hidden ${open ? 'translate-x-0' : '-translate-x-full'}`}>{sidebar}</div>
      <div className="md:pl-72">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur md:px-8">
          <button className="rounded-md p-2 md:hidden" onClick={() => setOpen(true)} aria-label="Open menu">
            <Menu size={22} />
          </button>
          <div>
            <p className="text-sm font-semibold text-ink">Workspace</p>
            <p className="text-xs text-slate-500">Keep delivery moving with clear status signals.</p>
          </div>
          <div className="hidden rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 sm:block">{user?.email}</div>
        </header>
        <main className="p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
