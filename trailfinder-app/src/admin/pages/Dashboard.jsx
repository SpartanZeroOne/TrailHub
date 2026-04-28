// ─── TrailHub Admin – Dashboard ───────────────────────────────────────────────
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { adminFetchDashboardStats, adminFetchEventsByCategory, adminFetchEventsPerMonth, adminFetchPastEvents, adminFetchRecentlyEditedEvents } from '../services/adminSupabase';
import { useAdmin } from '../AdminLayout';

const CATEGORY_LABELS = {
  'trail-adventures': 'Trail Adventures',
  'rallyes':          'Rallyes',
  'adventure-trips':  'Adventure Trips',
  'skills-camps':     'Skills-Camps',
  'offroad-festivals':'Offroad Festivals',
};

const CATEGORY_COLORS = {
  'trail-adventures': '#f97316',
  'rallyes':          '#eab308',
  'adventure-trips':  '#22c55e',
  'skills-camps':     '#3b82f6',
  'offroad-festivals':'#a855f7',
};

// ─── Month label formatter: "2026-08" → "Aug 26" ─────────────────────────────
const MONTH_ABBR = ['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'];
function formatMonthLabel(yyyyMm) {
  const [year, month] = yyyyMm.split('-');
  return `${MONTH_ABBR[parseInt(month, 10) - 1]} ${String(year).slice(2)}`;
}

// ─── Mini Bar Chart (SVG) ─────────────────────────────────────────────────────
const BAR_AREA_H = 120;

function BarChart({ data, labelKey, valueKey, monthKey, color = '#f97316', onBarClick }) {
  const [hovered, setHovered] = useState(null);
  if (!data?.length) return <div className="h-40 flex items-center justify-center text-stone-600 text-sm">Keine Daten</div>;
  const max = Math.max(...data.map(d => d[valueKey]), 1);
  const barWidth = Math.max(10, Math.min(32, Math.floor(340 / data.length) - 6));

  return (
    <div className="overflow-x-auto">
      {/* bars + count numbers — fixed height so all bars share same baseline */}
      <div className="flex items-end gap-1 min-w-max px-2" style={{ height: BAR_AREA_H + 20 }}>
        {data.map((item, i) => {
          const h = Math.max(4, Math.round((item[valueKey] / max) * BAR_AREA_H));
          const isHovered = hovered === i;
          return (
            <div
              key={i}
              className="flex flex-col items-center gap-1 cursor-pointer group"
              style={{ width: barWidth + 8 }}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => onBarClick?.(item[monthKey ?? 'month'])}
              title={`${item[labelKey]} anklicken um Events zu filtern`}
            >
              <span className={`text-xs leading-none transition-colors ${isHovered ? 'text-orange-300 font-semibold' : 'text-stone-400'}`}>
                {item[valueKey]}
              </span>
              <div
                className="rounded-t transition-all duration-150"
                style={{
                  height: h,
                  width: barWidth,
                  background: color,
                  opacity: isHovered ? 1 : 0.75,
                  transform: isHovered ? 'scaleY(1.04)' : 'scaleY(1)',
                  transformOrigin: 'bottom',
                  boxShadow: isHovered ? `0 0 12px ${color}66` : 'none',
                  outline: isHovered ? `2px solid ${color}44` : 'none',
                  outlineOffset: '2px',
                }}
              />
            </div>
          );
        })}
      </div>
      {/* month labels — separate row so they're never clipped */}
      <div className="flex gap-1 min-w-max px-2 mt-1">
        {data.map((item, i) => (
          <div
            key={i}
            className={`text-[10px] text-center leading-none transition-colors cursor-pointer ${hovered === i ? 'text-orange-300' : 'text-stone-500'}`}
            style={{ width: barWidth + 8 }}
            onClick={() => onBarClick?.(item[monthKey ?? 'month'])}
          >
            {item[labelKey]}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Donut Chart (SVG) ────────────────────────────────────────────────────────
function DonutChart({ data, onCategoryClick }) {
  const [hovered, setHovered] = useState(null);
  if (!data?.length) return <div className="h-40 flex items-center justify-center text-stone-600 text-sm">Keine Daten</div>;
  const total = data.reduce((s, d) => s + d.count, 0);
  let offset = 0;
  const radius = 60, cx = 80, cy = 70, strokeWidth = 22;
  const circ = 2 * Math.PI * radius;

  return (
    <div className="flex items-center gap-4 flex-wrap">
      <svg width="160" height="140" viewBox="0 0 160 140" style={{ cursor: 'pointer' }}>
        {data.map((d) => {
          const pct = d.count / total;
          const dash = pct * circ;
          const gap = circ - dash;
          const color = CATEGORY_COLORS[d.category] ?? '#888';
          const isHovered = hovered === d.category;
          const slice = (
            <circle
              key={d.category}
              cx={cx} cy={cy} r={radius}
              fill="none"
              stroke={color}
              strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
              strokeDasharray={`${dash} ${gap}`}
              strokeDashoffset={-offset * circ}
              opacity={hovered && !isHovered ? 0.45 : 1}
              style={{ transition: 'all 0.2s', cursor: 'pointer' }}
              onMouseEnter={() => setHovered(d.category)}
              onMouseLeave={() => setHovered(null)}
              onClick={() => onCategoryClick?.(d.category)}
            />
          );
          offset += pct;
          return slice;
        })}
        {/* Centre hit area — click navigates to all events */}
        <circle
          cx={cx} cy={cy} r={radius - strokeWidth / 2}
          fill="transparent"
          style={{ cursor: 'pointer' }}
          onClick={() => onCategoryClick?.(null)}
        />
        <text x={cx} y={cy - 4} textAnchor="middle" fill="#d4d4d4" fontSize="18" fontWeight="bold"
          style={{ pointerEvents: 'none' }}>{total}</text>
        <text x={cx} y={cy + 14} textAnchor="middle" fill="#737373" fontSize="10"
          style={{ pointerEvents: 'none' }}>Events</text>
      </svg>
      <div className="flex flex-col gap-1.5">
        {data.map(d => (
          <button
            key={d.category}
            className="flex items-center gap-2 rounded px-1 -mx-1 transition-opacity hover:opacity-100 text-left"
            style={{ opacity: hovered && hovered !== d.category ? 0.45 : 1 }}
            onMouseEnter={() => setHovered(d.category)}
            onMouseLeave={() => setHovered(null)}
            onClick={() => onCategoryClick?.(d.category)}
            title={`Filter: ${CATEGORY_LABELS[d.category] ?? d.category}`}
          >
            <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: CATEGORY_COLORS[d.category] ?? '#888' }} />
            <span className="text-xs text-stone-400">{CATEGORY_LABELS[d.category] ?? d.category}</span>
            <span className="text-xs text-stone-300 ml-1 font-medium">{d.count}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Metric Card ──────────────────────────────────────────────────────────────
function MetricCard({ label, value, icon, color = 'orange', subtext, onClick }) {
  const colors = {
    orange: 'from-orange-500/20 to-amber-600/10 border-orange-500/20',
    blue:   'from-blue-500/20 to-cyan-600/10 border-blue-500/20',
    green:  'from-green-500/20 to-emerald-600/10 border-green-500/20',
    purple: 'from-purple-500/20 to-violet-600/10 border-purple-500/20',
  };
  const iconColors = { orange: 'text-orange-400', blue: 'text-blue-400', green: 'text-green-400', purple: 'text-purple-400' };

  return (
    <button
      onClick={onClick}
      className={`text-left w-full rounded-xl border bg-gradient-to-br p-5 transition-all hover:scale-[1.02] ${colors[color]}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-stone-400 text-sm">{label}</p>
          <p className="text-3xl font-bold text-stone-100 mt-1">{value ?? '–'}</p>
          {subtext && <p className="text-xs text-stone-500 mt-1">{subtext}</p>}
        </div>
        <div className={`${iconColors[color]} opacity-70`}>{icon}</div>
      </div>
    </button>
  );
}

// ─── Activity Feed ────────────────────────────────────────────────────────────
function ActivityFeed({ events, onNavigate }) {
  const { t } = useTranslation();
  const catColors = {
    'trail-adventures': 'bg-orange-500',
    'rallyes': 'bg-yellow-500',
    'adventure-trips': 'bg-green-500',
    'skills-camps': 'bg-blue-500',
    'offroad-festivals': 'bg-purple-500',
  };

  return (
    <div className="space-y-2">
      {events.map(e => (
        <button
          key={e.id}
          onClick={() => onNavigate(`/admin/events/${e.id}/edit`)}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-stone-800 transition-colors text-left group"
        >
          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${catColors[e.category] ?? 'bg-stone-500'}`} />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-stone-300 truncate group-hover:text-stone-100 transition-colors">{e.name}</p>
            <p className="text-xs text-stone-500">{CATEGORY_LABELS[e.category] ?? e.category}</p>
          </div>
          <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${
            e.status === 'upcoming' ? 'bg-green-500/15 text-green-400' :
            e.status === 'past' ? 'bg-stone-700 text-stone-400' :
            'bg-blue-500/15 text-blue-400'
          }`}>{e.status}</span>
        </button>
      ))}
      {events.length === 0 && (
        <p className="text-stone-600 text-sm text-center py-4">{t('dashboard.noActivity')}</p>
      )}
    </div>
  );
}

// ─── Past Events Feed ─────────────────────────────────────────────────────────
function PastEventsFeed({ events, onNavigate }) {
  const { t, i18n } = useTranslation();
  const catColors = {
    'trail-adventures': 'bg-orange-500',
    'rallyes': 'bg-yellow-500',
    'adventure-trips': 'bg-green-500',
    'skills-camps': 'bg-blue-500',
    'offroad-festivals': 'bg-purple-500',
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '–';
    return new Date(dateStr).toLocaleDateString(i18n.language, { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <div className="space-y-2">
      {events.map(e => (
        <button
          key={e.id}
          onClick={() => onNavigate(`/admin/events/${e.id}/edit`)}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-stone-800 transition-colors text-left group"
        >
          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${catColors[e.category] ?? 'bg-stone-500'}`} />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-stone-300 truncate group-hover:text-stone-100 transition-colors">{e.name}</p>
            <p className="text-xs text-stone-500">{CATEGORY_LABELS[e.category] ?? e.category}</p>
          </div>
          <span className="text-xs text-stone-500 flex-shrink-0">{formatDate(e.end_date ?? e.start_date)}</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-stone-700 text-stone-400 flex-shrink-0">past</span>
        </button>
      ))}
      {events.length === 0 && (
        <p className="text-stone-600 text-sm text-center py-4">{t('dashboard.noPastEvents')}</p>
      )}
    </div>
  );
}

// ─── Recently Edited Feed ─────────────────────────────────────────────────────
function RecentlyEditedFeed({ events, onNavigate }) {
  const { i18n } = useTranslation();
  const catColors = {
    'trail-adventures': 'bg-orange-500',
    'rallyes':          'bg-yellow-500',
    'adventure-trips':  'bg-green-500',
    'skills-camps':     'bg-blue-500',
    'offroad-festivals':'bg-purple-500',
  };

  const formatRelative = (iso) => {
    if (!iso) return '–';
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1)  return 'Gerade eben';
    if (mins < 60) return `vor ${mins} Min.`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24)  return `vor ${hrs} Std.`;
    return new Date(iso).toLocaleDateString(i18n.language, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  if (!events.length) {
    return <p className="text-stone-600 text-sm text-center py-4">Keine bearbeiteten Events</p>;
  }

  return (
    <div className="space-y-2">
      {events.map(e => (
        <button
          key={e.id}
          onClick={() => onNavigate(`/admin/events/${e.id}/edit`)}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-stone-800 transition-colors text-left group"
        >
          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${catColors[e.category] ?? 'bg-stone-500'}`} />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-stone-300 truncate group-hover:text-stone-100 transition-colors">{e.name}</p>
            <p className="text-xs text-stone-500">{CATEGORY_LABELS[e.category] ?? e.category}</p>
          </div>
          <span className="text-xs text-stone-500 flex-shrink-0 whitespace-nowrap">{formatRelative(e.updated_at)}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${
            e.status === 'upcoming'  ? 'bg-green-500/15 text-green-400' :
            e.status === 'ongoing'   ? 'bg-blue-500/15 text-blue-400'  :
            e.status === 'past'      ? 'bg-stone-700 text-stone-400'   :
            'bg-blue-500/15 text-blue-400'
          }`}>{e.status}</span>
        </button>
      ))}
    </div>
  );
}

// ─── Dashboard Page ───────────────────────────────────────────────────────────
export default function Dashboard({ onNavigate, toast }) {
  const { t } = useTranslation();
  const adminCtx = useAdmin();
  const isSuperAdmin = !adminCtx || adminCtx.isSuperAdmin !== false;
  const [stats, setStats] = useState(null);
  const [catData, setCatData] = useState([]);
  const [monthData, setMonthData] = useState([]);
  const [undatedCount, setUndatedCount] = useState(0);
  const [pastEvents, setPastEvents] = useState([]);
  const [recentlyEdited, setRecentlyEdited] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      adminFetchDashboardStats(),
      adminFetchEventsByCategory(),
      adminFetchEventsPerMonth(),
      adminFetchPastEvents(10),
      adminFetchRecentlyEditedEvents(10),
    ]).then(([s, c, m, p, e]) => {
      setStats(s);
      setCatData(c);
      const { chartData, undatedCount: uc } = m;
      const nowMonth = new Date().toISOString().slice(0, 7);
      const filtered = chartData
        .filter(d => d.month >= nowMonth)
        .slice(0, 12)
        .map(d => ({ ...d, label: formatMonthLabel(d.month) }));
      setMonthData(filtered);
      setUndatedCount(uc ?? 0);
      setPastEvents(p);
      setRecentlyEdited(e);
    }).catch(err => {
      toast?.error(t('common.error') + ': ' + err.message);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"/>
          <p className="text-stone-400 text-sm">{t('dashboard.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-100">{t('dashboard.title')}</h1>
          <p className="text-stone-500 text-sm mt-1">{t('dashboard.subtitle')}</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => onNavigate('/admin/events/new')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-400 text-white text-sm font-medium transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/>
            </svg>
            {t('dashboard.createEvent')}
          </button>
          {isSuperAdmin && (
            <button
              onClick={() => onNavigate('/admin/csv-import')}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 text-sm font-medium border border-stone-700 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
              </svg>
              {t('dashboard.csvImport')}
            </button>
          )}
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          label={t('dashboard.totalEvents')}
          value={stats?.totalEvents}
          color="orange"
          subtext={`${stats?.upcomingEvents ?? 0} ${t('dashboard.upcomingSubtext')}`}
          onClick={() => onNavigate('/admin/events')}
          icon={
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
            </svg>
          }
        />
        <MetricCard
          label={t('dashboard.activeUsers')}
          value={stats?.totalUsers}
          color="blue"
          subtext={t('dashboard.registeredUsers')}
          onClick={() => onNavigate('/admin/users')}
          icon={
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/>
            </svg>
          }
        />
        <MetricCard
          label={t('dashboard.organizerLabel')}
          value={stats?.totalOrganizers}
          color="green"
          subtext={t('dashboard.activeOrganizers')}
          onClick={() => onNavigate('/admin/organizers')}
          icon={
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/>
            </svg>
          }
        />
        <MetricCard
          label={t('dashboard.upcomingEvents')}
          value={stats?.upcomingEvents}
          color="purple"
          subtext={t('dashboard.upcomingEventsSubtext')}
          onClick={() => onNavigate('/admin/events?status=upcoming')}
          icon={
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          }
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-stone-900 rounded-xl border border-stone-800 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-stone-200 font-semibold">{t('dashboard.eventsPerMonth')}</h2>
            {undatedCount > 0 && (
              <span className="text-xs text-stone-500 bg-stone-800 px-2 py-1 rounded-lg" title="Events ohne festes Datum (Auf Anfrage)">
                + {undatedCount} Auf Anfrage
              </span>
            )}
          </div>
          <BarChart
            data={monthData}
            labelKey="label"
            valueKey="count"
            monthKey="month"
            color="#f97316"
            onBarClick={(month) => onNavigate(`/admin/events?month=${month}`)}
          />
        </div>
        <div className="bg-stone-900 rounded-xl border border-stone-800 p-5">
          <h2 className="text-stone-200 font-semibold mb-4">{t('dashboard.eventsByCategory')}</h2>
          <DonutChart
            data={catData}
            onCategoryClick={(cat) =>
              onNavigate(cat ? `/admin/events?category=${cat}` : '/admin/events')
            }
          />
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-stone-900 rounded-xl border border-stone-800 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-stone-200 font-semibold">{t('dashboard.recentEvents')}</h2>
          <button onClick={() => onNavigate('/admin/events')} className="text-orange-400 text-sm hover:text-orange-300">
            {t('common.allSeeAll')}
          </button>
        </div>
        <ActivityFeed events={stats?.recentEvents ?? []} onNavigate={onNavigate} />
      </div>

      {/* Recently Edited */}
      <div className="bg-stone-900 rounded-xl border border-stone-800 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-stone-200 font-semibold">Zuletzt bearbeitete Events</h2>
          <button onClick={() => onNavigate('/admin/events')} className="text-orange-400 text-sm hover:text-orange-300">
            Alle ansehen →
          </button>
        </div>
        <RecentlyEditedFeed events={recentlyEdited} onNavigate={onNavigate} />
      </div>

      {/* Past Events */}
      <div className="bg-stone-900 rounded-xl border border-stone-800 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-stone-200 font-semibold">{t('dashboard.pastEvents')}</h2>
          <button onClick={() => onNavigate('/admin/events?status=past')} className="text-orange-400 text-sm hover:text-orange-300">
            {t('common.allSeeAll')}
          </button>
        </div>
        <PastEventsFeed events={pastEvents} onNavigate={onNavigate} />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: t('dashboard.quickNewEvent'), sub: t('dashboard.quickNewEventSub'), icon: '📅', onClick: () => onNavigate('/admin/events/new'), color: 'hover:border-orange-500/50' },
          { label: t('dashboard.quickCsvImport'), sub: t('dashboard.quickCsvImportSub'), icon: '📂', onClick: () => onNavigate('/admin/csv-import'), color: 'hover:border-blue-500/50' },
          { label: t('dashboard.quickReports'), sub: t('dashboard.quickReportsSub'), icon: '📊', onClick: () => onNavigate('/admin/reports'), color: 'hover:border-green-500/50' },
        ].map(a => (
          <button
            key={a.label}
            onClick={a.onClick}
            className={`text-left p-4 rounded-xl bg-stone-900 border border-stone-800 ${a.color} hover:bg-stone-800/50 transition-all`}
          >
            <div className="text-2xl mb-2">{a.icon}</div>
            <div className="text-stone-200 font-medium text-sm">{a.label}</div>
            <div className="text-stone-500 text-xs">{a.sub}</div>
          </button>
        ))}
      </div>
    </div>
  );
}