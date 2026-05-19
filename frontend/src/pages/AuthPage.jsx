import { CheckCircle2 } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { ROLES } from '../utils/constants.js';

const AuthPage = ({ mode }) => {
  const isRegister = mode === 'register';
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'Project Manager' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isRegister) await register(form);
      else await login({ email: form.email, password: form.password });
      navigate('/');
    } catch (err) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen bg-canvas lg:grid-cols-[1fr_480px]">
      <section className="hidden bg-ink p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div>
          <p className="text-lg font-bold">PM Tracker</p>
          <h1 className="mt-24 max-w-2xl text-5xl font-bold leading-tight">A clear delivery workspace for projects, tasks, owners, and BRAG health.</h1>
        </div>
        <div className="grid gap-4 text-sm text-slate-200">
          {['Track multiple project timelines', 'See status risk before meetings', 'Keep comments attached to task history'].map((item) => (
            <div key={item} className="flex items-center gap-3">
              <CheckCircle2 size={18} className="text-emerald-300" />
              {item}
            </div>
          ))}
        </div>
      </section>
      <main className="flex items-center justify-center p-6">
        <form className="panel w-full max-w-md p-6" onSubmit={submit}>
          <h2 className="text-2xl font-bold text-ink">{isRegister ? 'Create account' : 'Welcome back'}</h2>
          <p className="mt-2 text-sm text-slate-500">{isRegister ? 'Set up your project workspace.' : 'Log in to manage delivery status.'}</p>
          <div className="mt-6 space-y-4">
            {isRegister && (
              <label>
                <span className="label">Name</span>
                <input className="input mt-1" value={form.name} onChange={(event) => update('name', event.target.value)} required />
              </label>
            )}
            <label>
              <span className="label">Email</span>
              <input className="input mt-1" type="email" value={form.email} onChange={(event) => update('email', event.target.value)} required />
            </label>
            <label>
              <span className="label">Password</span>
              <input className="input mt-1" type="password" value={form.password} onChange={(event) => update('password', event.target.value)} required minLength={6} />
            </label>
            {isRegister && (
              <label>
                <span className="label">Role</span>
                <select className="input mt-1" value={form.role} onChange={(event) => update('role', event.target.value)}>
                  {ROLES.map((role) => <option key={role}>{role}</option>)}
                </select>
              </label>
            )}
            {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-700">{error}</p>}
            <button className="btn-primary w-full" disabled={loading}>{loading ? 'Please wait...' : isRegister ? 'Register' : 'Login'}</button>
          </div>
          <p className="mt-5 text-center text-sm text-slate-500">
            {isRegister ? 'Already have an account?' : 'New here?'}{' '}
            <Link className="font-semibold text-ink" to={isRegister ? '/login' : '/register'}>
              {isRegister ? 'Login' : 'Create account'}
            </Link>
          </p>
        </form>
      </main>
    </div>
  );
};

export default AuthPage;
