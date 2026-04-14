// ─── TrailHub Admin – Main App (Auth Gate + Router) ───────────────────────────
import { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import AdminLayout from './AdminLayout';
import { useToast } from './hooks/useToast';

// Pages
import Dashboard from './pages/Dashboard';
import EventList from './pages/events/EventList';
import EventForm from './pages/events/EventForm';
import OrganizerList from './pages/organizers/OrganizerList';
import OrganizerForm from './pages/organizers/OrganizerForm';
import UserList from './pages/users/UserList';
import UserDetail from './pages/users/UserDetail';
import CSVImport from './pages/CSVImport';
import Reports from './pages/Reports';
import Settings from './pages/Settings';

// ─── Auth Gate ────────────────────────────────────────────────────────────────
function AdminLoginGate({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const { data, error: authErr } = await supabase.auth.signInWithPassword({ email, password });
      if (authErr) throw authErr;
      // Check admin flag in user metadata or user profile
      const user = data.user;
      const isAdmin = user?.app_metadata?.role === 'admin' ||
                      user?.user_metadata?.is_admin === true ||
                      user?.email?.endsWith('@trailhub.de') ||
                      // For dev: allow any authenticated user (remove in production)
                      !!user;
      if (!isAdmin) throw new Error('Kein Admin-Zugang für dieses Konto.');
      onLogin(user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center gap-3 justify-center mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z"/>
            </svg>
          </div>
          <div>
            <p className="text-stone-100 font-bold text-lg leading-tight">TrailHub</p>
            <p className="text-orange-400 text-xs font-medium leading-tight">Admin Panel</p>
          </div>
        </div>

        <div className="bg-stone-900 rounded-2xl border border-stone-800 p-8 shadow-2xl">
          <h1 className="text-stone-100 text-xl font-semibold mb-6 text-center">Admin-Anmeldung</h1>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm text-stone-400 mb-1.5">E-Mail</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="admin@trailhub.de"
                className="w-full px-3 py-2.5 rounded-lg bg-stone-800 border border-stone-700 text-stone-200 text-sm placeholder:text-stone-600 focus:outline-none focus:border-orange-500/60 transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm text-stone-400 mb-1.5">Passwort</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="••••••••"
                className="w-full px-3 py-2.5 rounded-lg bg-stone-800 border border-stone-700 text-stone-200 text-sm placeholder:text-stone-600 focus:outline-none focus:border-orange-500/60 transition-colors"
              />
            </div>
            {error && (
              <div className="px-3 py-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-orange-500 hover:bg-orange-400 text-white text-sm font-medium disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              {loading && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>}
              {loading ? 'Anmelden…' : 'Anmelden'}
            </button>
          </form>
        </div>

        <p className="text-center text-stone-600 text-xs mt-4">
          <button onClick={() => window.location.href = '/'} className="hover:text-stone-400 transition-colors">
            ← Zurück zur TrailHub App
          </button>
        </p>
      </div>
    </div>
  );
}

// ─── Simple Router (path-based) ───────────────────────────────────────────────
function resolveRoute(path) {
  // /admin/events/new
  if (path === '/admin/events/new') return { page: 'event-form', params: { id: 'new' } };
  // /admin/events/:id/edit
  const eventEdit = path.match(/^\/admin\/events\/([^/]+)\/edit$/);
  if (eventEdit) return { page: 'event-form', params: { id: eventEdit[1] } };
  // /admin/events
  if (path === '/admin/events' || path.startsWith('/admin/events?')) return { page: 'events' };

  // /admin/organizers/new
  if (path === '/admin/organizers/new') return { page: 'organizer-form', params: { id: 'new' } };
  // /admin/organizers/:id/edit
  const orgEdit = path.match(/^\/admin\/organizers\/([^/]+)\/edit$/);
  if (orgEdit) return { page: 'organizer-form', params: { id: orgEdit[1] } };
  // /admin/organizers
  if (path === '/admin/organizers') return { page: 'organizers' };

  // /admin/users/:id
  const userDetail = path.match(/^\/admin\/users\/([^/]+)$/);
  if (userDetail) return { page: 'user-detail', params: { id: userDetail[1] } };
  // /admin/users
  if (path === '/admin/users') return { page: 'users' };

  if (path === '/admin/csv-import') return { page: 'csv-import' };
  if (path === '/admin/reports')   return { page: 'reports' };
  if (path === '/admin/settings')  return { page: 'settings' };

  // default = dashboard
  return { page: 'dashboard' };
}

// ─── AdminApp ─────────────────────────────────────────────────────────────────
export default function AdminApp() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const { toasts, success, error, info, warning, undoToast, dismiss } = useToast();

  const toastAPI = { success, error, info, warning, undoToast };

  // Check existing session
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Handle browser back/forward
  useEffect(() => {
    const handler = () => setCurrentPath(window.location.pathname);
    window.addEventListener('popstate', handler);
    return () => window.removeEventListener('popstate', handler);
  }, []);

  const navigate = (path) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
  };

  // Auto-logout timer (30 min)
  useEffect(() => {
    if (!user) return;
    let timer;
    const reset = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        supabase.auth.signOut();
        info('Session abgelaufen. Bitte erneut anmelden.');
      }, 30 * 60 * 1000);
    };
    reset();
    window.addEventListener('mousemove', reset);
    window.addEventListener('keydown', reset);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('mousemove', reset);
      window.removeEventListener('keydown', reset);
    };
  }, [user]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-stone-950 flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"/>
      </div>
    );
  }

  if (!user) {
    return <AdminLoginGate onLogin={setUser} />;
  }

  const route = resolveRoute(currentPath);

  const renderPage = () => {
    const props = { onNavigate: navigate, toast: toastAPI };
    switch (route.page) {
      case 'dashboard':      return <Dashboard {...props} />;
      case 'events':         return <EventList {...props} />;
      case 'event-form':     return <EventForm {...props} eventId={route.params?.id} />;
      case 'organizers':     return <OrganizerList {...props} />;
      case 'organizer-form': return <OrganizerForm {...props} organizerId={route.params?.id} />;
      case 'users':          return <UserList {...props} />;
      case 'user-detail':    return <UserDetail {...props} userId={route.params?.id} />;
      case 'csv-import':     return <CSVImport {...props} />;
      case 'reports':        return <Reports {...props} />;
      case 'settings':       return <Settings {...props} />;
      default:               return <Dashboard {...props} />;
    }
  };

  return (
    <AdminLayout
      currentPath={currentPath}
      onNavigate={navigate}
      toasts={toasts}
      dismissToast={dismiss}
      user={user}
    >
      {renderPage()}
    </AdminLayout>
  );
}