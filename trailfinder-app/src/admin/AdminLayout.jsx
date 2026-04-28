// ─── TrailHub Admin – Main Layout (Sidebar + Header + Toast) ─────────────────
import { useState, useEffect, useRef, createContext, useContext } from 'react';
import { useTranslation } from 'react-i18next';
import { ToastContainer } from './hooks/useToast';
import { supabase } from '../services/supabaseClient';

// ─── Context ──────────────────────────────────────────────────────────────────
export const AdminContext = createContext(null);
export const useAdmin = () => useContext(AdminContext);

// ─── Nav item definitions ─────────────────────────────────────────────────────
const ALL_NAV_ITEMS = [
  {
    id: 'dashboard', path: '/admin', roles: ['super_admin', 'organizer'],
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    id: 'events', path: '/admin/events', roles: ['super_admin', 'organizer'],
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    id: 'organizers', path: '/admin/organizers', roles: ['super_admin'],
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
  },
  {
    id: 'users', path: '/admin/users', roles: ['super_admin'],
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
  },
  {
    id: 'past-events', path: '/admin/past-events', roles: ['super_admin'],
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
      </svg>
    ),
  },
  {
    id: 'csv-import', path: '/admin/csv-import', roles: ['super_admin'],
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
      </svg>
    ),
  },
  {
    id: 'reports', path: '/admin/reports', roles: ['super_admin', 'organizer'],
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    id: 'kontakt', path: '/admin/kontakt', roles: ['organizer'],
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    id: 'settings', path: '/admin/settings', roles: ['super_admin'],
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
];

const LANGUAGES = [
  { code: 'de', flagSrc: 'https://flagcdn.com/20x15/de.png', flagAlt: 'DE', label: 'Deutsch' },
  { code: 'en', flagSrc: 'https://flagcdn.com/20x15/gb.png', flagAlt: 'GB', label: 'English' },
  { code: 'fr', flagSrc: 'https://flagcdn.com/20x15/fr.png', flagAlt: 'FR', label: 'Français' },
];

// ─── Language Selector ────────────────────────────────────────────────────────
function LanguageSelector() {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const current = LANGUAGES.find(l => l.code === i18n.language) ?? LANGUAGES[0];

  useEffect(() => {
    const handler = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-stone-800 border border-stone-700 text-stone-300 text-sm hover:border-orange-500/50 transition-colors"
      >
        <img src={current.flagSrc} alt={current.flagAlt} className="w-5 h-auto rounded-sm flex-shrink-0" />
        <span className="font-medium">{current.label}</span>
        <svg className={`w-3 h-3 text-stone-500 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-44 bg-stone-900 border border-stone-700 rounded-xl shadow-2xl overflow-hidden z-50">
          {LANGUAGES.map(lang => (
            <button
              key={lang.code}
              onClick={() => { i18n.changeLanguage(lang.code); setOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                lang.code === i18n.language
                  ? 'text-orange-400 bg-orange-500/10 font-medium'
                  : 'text-stone-300 hover:bg-stone-800'
              }`}
            >
              <img src={lang.flagSrc} alt={lang.flagAlt} className="w-5 h-auto rounded-sm flex-shrink-0" />
              <span>{lang.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Quick Search ─────────────────────────────────────────────────────────────
function QuickSearch({ onNavigate, navItems }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(o => !o);
        setTimeout(() => inputRef.current?.focus(), 50);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const items = navItems.filter(n =>
    !query || t(`nav.${n.id}`).toLowerCase().includes(query.toLowerCase())
  );

  if (!open) return (
    <button
      onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 50); }}
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-stone-800 border border-stone-700 text-stone-400 text-sm hover:border-orange-500/50 transition-colors"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
      </svg>
      <span>{t('search.placeholder')}</span>
      <kbd className="text-xs bg-stone-700 px-1.5 py-0.5 rounded">⌘K</kbd>
    </button>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 bg-black/50" onClick={() => setOpen(false)}>
      <div className="bg-stone-900 border border-stone-700 rounded-xl shadow-2xl w-full max-w-lg mx-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 px-4 py-3 border-b border-stone-700">
          <svg className="w-5 h-5 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
          <input
            ref={inputRef}
            className="flex-1 bg-transparent text-stone-200 outline-none text-sm placeholder:text-stone-500"
            placeholder={t('search.modal')}
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </div>
        <div className="py-2">
          {items.map(item => (
            <button
              key={item.id}
              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-stone-800 text-stone-300 text-sm"
              onClick={() => { onNavigate(item.path); setOpen(false); setQuery(''); }}
            >
              <span className="text-stone-500">{item.icon}</span>
              {t(`nav.${item.id}`)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Breadcrumbs ──────────────────────────────────────────────────────────────
function Breadcrumbs({ path, onNavigate }) {
  const { t } = useTranslation();
  const parts = path.replace(/^\/admin\/?/, '').split('/').filter(Boolean);
  const crumbs = [{ label: t('breadcrumb.root'), path: '/admin' }];
  let built = '/admin';
  parts.forEach(p => {
    built += '/' + p;
    crumbs.push({ label: p.charAt(0).toUpperCase() + p.slice(1).replace(/-/g, ' '), path: built });
  });

  return (
    <nav className="flex items-center gap-1 text-sm text-stone-500">
      {crumbs.map((c, i) => (
        <span key={c.path} className="flex items-center gap-1">
          {i > 0 && <span>/</span>}
          {i === crumbs.length - 1
            ? <span className="text-stone-300">{c.label}</span>
            : <button onClick={() => onNavigate(c.path)} className="hover:text-orange-400 transition-colors">{c.label}</button>
          }
        </span>
      ))}
    </nav>
  );
}

// ─── AdminLayout ──────────────────────────────────────────────────────────────
export default function AdminLayout({ children, currentPath, onNavigate, toasts, dismissToast, user, adminRole = 'super_admin', organizerId = null }) {
  const { t } = useTranslation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [organizerName, setOrganizerName] = useState('');

  useEffect(() => {
    if (!organizerId) return;
    supabase.from('organizers').select('name').eq('id', organizerId).single()
      .then(({ data }) => { if (data?.name) setOrganizerName(data.name); });
  }, [organizerId]);

  const navItems = ALL_NAV_ITEMS.filter(item => item.roles.includes(adminRole));

  const activeId = navItems.find(n => {
    if (n.path === '/admin') return currentPath === '/admin';
    return currentPath.startsWith(n.path);
  })?.id ?? 'dashboard';

  const roleLabel = adminRole === 'super_admin' ? t('nav.superAdmin') : t('nav.organizerAdmin');

  const contextValue = { adminRole, organizerId, isSuperAdmin: adminRole === 'super_admin', isOrganizer: adminRole === 'organizer' };

  return (
    <AdminContext.Provider value={contextValue}>
      <div className="flex h-screen bg-stone-950 text-stone-200 overflow-hidden">
        {/* Sidebar */}
        <aside className={`${sidebarOpen ? 'w-60' : 'w-16'} flex-shrink-0 flex flex-col bg-stone-900 border-r border-stone-800 transition-all duration-200`}>
          {/* Logo */}
          <div className="flex items-center gap-3 px-4 py-5 border-b border-stone-800">
            <img
              src="/icons/icon-192.png"
              alt="TrailHub"
              className="w-8 h-8 rounded-lg flex-shrink-0 object-cover"
            />
            {sidebarOpen && (
              <div>
                <div className="text-sm font-bold text-stone-100">TrailHub</div>
                <div className="text-xs text-orange-400 font-medium">Admin Panel</div>
              </div>
            )}
            <button
              onClick={() => setSidebarOpen(o => !o)}
              className="ml-auto text-stone-500 hover:text-stone-300"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={sidebarOpen ? "M11 19l-7-7 7-7m8 14l-7-7 7-7" : "M13 5l7 7-7 7M5 5l7 7-7 7"}/>
              </svg>
            </button>
          </div>

          {/* Nav */}
          <nav className="flex-1 py-4 overflow-y-auto">
            {navItems.map(item => {
              const isActive = item.id === activeId;
              const label = t(`nav.${item.id}`);
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.path)}
                  title={!sidebarOpen ? label : undefined}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors ${
                    isActive
                      ? 'text-orange-400 bg-orange-500/10 border-r-2 border-orange-500'
                      : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800'
                  }`}
                >
                  <span className="flex-shrink-0">{item.icon}</span>
                  {sidebarOpen && <span>{label}</span>}
                </button>
              );
            })}
          </nav>

          {/* User */}
          {sidebarOpen && user && (
            <div className="px-4 py-3 border-t border-stone-800">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-400 text-xs font-bold flex-shrink-0">
                  {(user.email?.[0] ?? 'A').toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="text-xs text-stone-300 truncate">{user.email}</div>
                  <div className={`text-xs font-medium ${adminRole === 'super_admin' ? 'text-orange-500' : 'text-blue-400'}`}>{roleLabel}</div>
                  {adminRole === 'organizer' && (
                    <div className="text-xs text-stone-500 truncate mt-0.5">
                      {organizerName || t('nav.noOrganizer')}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Back to App */}
          <div className="px-4 py-3 border-t border-stone-800">
            <button
              onClick={() => window.location.href = '/'}
              className={`w-full flex items-center gap-3 text-sm text-stone-500 hover:text-orange-400 transition-colors ${!sidebarOpen ? 'justify-center' : ''}`}
              title={!sidebarOpen ? t('nav.backToApp') : undefined}
            >
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
              </svg>
              {sidebarOpen && <span>{t('nav.backToApp')}</span>}
            </button>
          </div>
        </aside>

        {/* Main */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <header className="flex-shrink-0 flex items-center gap-4 px-6 py-3 bg-stone-900/50 border-b border-stone-800">
            <Breadcrumbs path={currentPath} onNavigate={onNavigate} />
            <div className="ml-auto flex items-center gap-3">
              <QuickSearch onNavigate={onNavigate} navItems={navItems} />
              <LanguageSelector />
            </div>
          </header>

          {/* Content */}
          <main className="flex-1 overflow-y-auto">
            {children}
          </main>
        </div>

        {/* Toast Container */}
        <ToastContainer toasts={toasts} dismiss={dismissToast} />
      </div>
    </AdminContext.Provider>
  );
}
