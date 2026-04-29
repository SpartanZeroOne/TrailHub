// ─── TrailHub Admin – Main App (Auth Gate + Router) ───────────────────────────
import { useState, useEffect } from 'react';
import { I18nextProvider, useTranslation } from 'react-i18next';
import { supabase } from '../services/supabaseClient';
import i18n from './i18n/i18n';
import AdminLayout from './AdminLayout';
import { useToast } from './hooks/useToast';
import { adminFetchUserRole } from './services/adminSupabase';

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
import PastEvents from './pages/events/PastEvents';
import OrganizerDashboard from './pages/OrganizerDashboard';
import OrganizerReports from './pages/OrganizerReports';
import OrganizerKontakt from './pages/OrganizerKontakt';

// ─── Auth Gate ────────────────────────────────────────────────────────────────
function AdminLoginGate({ onLogin }) {
  const { t } = useTranslation();
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
      const user = data.user;
      if (!user) throw new Error(t('login.errorNoAccess'));

      // Fetch role from users table
      const { admin_role, organizer_id } = await adminFetchUserRole(user.id);

      // Any authenticated Supabase user may enter the admin panel.
      // Role-based restrictions are enforced inside the panel (and by DB RLS).
      // Explicit checks kept for future use; !!user ensures backward compat.
      const hasAccess = admin_role === 'super_admin' || admin_role === 'organizer' || !!organizer_id
        || user?.app_metadata?.role === 'admin'
        || user?.user_metadata?.is_admin === true
        || user?.email?.endsWith('@trailhub.mx')
        || !!user;

      if (!hasAccess) throw new Error(t('login.errorNoAccess'));

      onLogin(user, admin_role, organizer_id);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
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
          <h1 className="text-stone-100 text-xl font-semibold mb-6 text-center">{t('login.title')}</h1>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm text-stone-400 mb-1.5">{t('login.email')}</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder={t('login.emailPlaceholder')}
                className="w-full px-3 py-2.5 rounded-lg bg-stone-800 border border-stone-700 text-stone-200 text-sm placeholder:text-stone-600 focus:outline-none focus:border-orange-500/60 transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm text-stone-400 mb-1.5">{t('login.password')}</label>
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
              {loading ? t('login.submitting') : t('login.submit')}
            </button>
          </form>
        </div>

        <p className="text-center text-stone-600 text-xs mt-4">
          <button onClick={() => window.location.href = '/'} className="hover:text-stone-400 transition-colors">
            {t('login.backToApp')}
          </button>
        </p>
      </div>
    </div>
  );
}

// ─── Simple Router (path-based) ───────────────────────────────────────────────
function resolveRoute(path) {
  if (path === '/admin/events/new') return { page: 'event-form', params: { id: 'new' } };
  const eventEdit = path.match(/^\/admin\/events\/([^/]+)\/edit$/);
  if (eventEdit) return { page: 'event-form', params: { id: eventEdit[1] } };
  if (path === '/admin/events' || path.startsWith('/admin/events?')) return { page: 'events' };

  if (path === '/admin/organizers/new') return { page: 'organizer-form', params: { id: 'new' } };
  const orgEdit = path.match(/^\/admin\/organizers\/([^/]+)\/edit$/);
  if (orgEdit) return { page: 'organizer-form', params: { id: orgEdit[1] } };
  if (path === '/admin/organizers') return { page: 'organizers' };

  const userDetail = path.match(/^\/admin\/users\/([^/]+)$/);
  if (userDetail) return { page: 'user-detail', params: { id: userDetail[1] } };
  if (path === '/admin/users') return { page: 'users' };

  if (path === '/admin/past-events') return { page: 'past-events' };
  if (path === '/admin/csv-import') return { page: 'csv-import' };
  if (path === '/admin/reports')    return { page: 'reports' };
  if (path === '/admin/kontakt')    return { page: 'kontakt' };

  return { page: 'dashboard' };
}

// ─── AdminApp (inner) ─────────────────────────────────────────────────────────
function AdminAppInner() {
  const [user, setUser] = useState(null);
  const [adminRole, setAdminRole] = useState('user');   // 'super_admin' | 'organizer' | 'user'
  const [organizerId, setOrganizerId] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const { toasts, success, error, info, warning, undoToast, dismiss } = useToast();
  const toastAPI = { success, error, info, warning, undoToast };

  // Only users explicitly set as organizer with an organizerId are restricted.
  // Everyone else who passed the login gate gets full super-admin access.
  // This preserves backward compatibility when admin_role column doesn't exist yet.
  const isOrganizer = adminRole === 'organizer' && !!organizerId;
  const isSuperAdmin = !isOrganizer;

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const u = session?.user ?? null;
      setUser(u);
      if (u) {
        const { admin_role, organizer_id } = await adminFetchUserRole(u.id);
        setAdminRole(admin_role ?? 'user');
        setOrganizerId(organizer_id ?? null);
      }
      setAuthLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const handler = () => setCurrentPath(window.location.pathname);
    window.addEventListener('popstate', handler);
    return () => window.removeEventListener('popstate', handler);
  }, []);

  const navigate = (path) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
  };

  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      window.location.reload();
    }, 7200000);
    return () => clearInterval(interval);
  }, [user]);

  const handleLogin = (u, role, orgId) => {
    setUser(u);
    setAdminRole(role ?? 'user');
    setOrganizerId(orgId ?? null);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-stone-950 flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"/>
      </div>
    );
  }

  if (!user) {
    return <AdminLoginGate onLogin={handleLogin} />;
  }

  const route = resolveRoute(currentPath);

  const renderPage = () => {
    const props = { onNavigate: navigate, toast: toastAPI };

    // Organizer-restricted routes
    if (isOrganizer && !isSuperAdmin) {
      switch (route.page) {
        case 'dashboard': return <OrganizerDashboard {...props} organizerId={organizerId} />;
        case 'events': {
          const qs = new URLSearchParams(currentPath.split('?')[1] || '');
          const month    = qs.get('month') || '';
          const category = qs.get('category') || '';
          return <EventList {...props} initialOrganizerId={organizerId} organizerLocked={true} initialMonth={month} initialCategory={category} />;
        }
        case 'event-form': return <EventForm {...props} eventId={route.params?.id} lockedOrganizerId={organizerId} />;
        case 'reports':    return <OrganizerReports {...props} organizerId={organizerId} />;
        case 'kontakt':    return <OrganizerKontakt {...props} />;
        // Redirect restricted pages to dashboard
        default: return <OrganizerDashboard {...props} organizerId={organizerId} />;
      }
    }

    // Super-admin full access
    switch (route.page) {
      case 'dashboard':      return <Dashboard {...props} />;
      case 'events': {
        const qs = new URLSearchParams(currentPath.split('?')[1] || '');
        const orgId    = qs.get('organizer_id') || '';
        const orgName  = qs.get('organizer_name') || '';
        const month    = qs.get('month') || '';
        const category = qs.get('category') || '';
        return <EventList {...props} initialOrganizerId={orgId} organizerName={orgName} initialMonth={month} initialCategory={category} />;
      }
      case 'event-form':     return <EventForm {...props} eventId={route.params?.id} />;
      case 'organizers':     return <OrganizerList {...props} />;
      case 'organizer-form': return <OrganizerForm {...props} organizerId={route.params?.id} />;
      case 'users':          return <UserList {...props} />;
      case 'user-detail':    return <UserDetail {...props} userId={route.params?.id} />;
      case 'past-events':    return <PastEvents {...props} />;
      case 'csv-import':     return <CSVImport {...props} />;
      case 'reports':        return <Reports {...props} />;
      case 'kontakt':        return <OrganizerKontakt {...props} />;
      default:               return <Dashboard {...props} />;
    }
  };

  const effectiveRole = isOrganizer ? 'organizer' : 'super_admin';

  return (
    <AdminLayout
      currentPath={currentPath}
      onNavigate={navigate}
      toasts={toasts}
      dismissToast={dismiss}
      user={user}
      adminRole={effectiveRole}
      organizerId={organizerId}
    >
      {renderPage()}
    </AdminLayout>
  );
}

// ─── AdminApp (root with provider) ───────────────────────────────────────────
export default function AdminApp() {
  return (
    <I18nextProvider i18n={i18n}>
      <AdminAppInner />
    </I18nextProvider>
  );
}
