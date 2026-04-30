// ─── TrailHub Admin – Organizer Dashboard (restricted) ────────────────────────
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  organizerFetchDashboardStats,
  organizerFetchEventsByCategory,
  organizerFetchEventsPerMonth,
} from '../services/adminSupabase';

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

const MONTH_ABBR = ['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'];
function formatMonthLabel(yyyyMm) {
  const [year, month] = yyyyMm.split('-');
  return `${MONTH_ABBR[parseInt(month, 10) - 1]} ${String(year).slice(2)}`;
}

const BAR_AREA_H = 120;

function BarChart({ data, labelKey, valueKey, monthKey, color = '#f97316', onBarClick }) {
  const [hovered, setHovered] = useState(null);
  if (!data?.length) return <div className="h-40 flex items-center justify-center text-stone-600 text-sm">Keine Daten</div>;
  const max = Math.max(...data.map(d => d[valueKey]), 1);
  const barWidth = Math.max(10, Math.min(32, Math.floor(340 / data.length) - 6));

  return (
    <div className="overflow-x-auto">
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
            >
              <span className={`text-xs leading-none transition-colors ${isHovered ? 'text-orange-300 font-semibold' : 'text-stone-400'}`}>
                {item[valueKey]}
              </span>
              <div
                className="rounded-t transition-all duration-150"
                style={{
                  height: h, width: barWidth, background: color,
                  opacity: isHovered ? 1 : 0.75,
                  transform: isHovered ? 'scaleY(1.04)' : 'scaleY(1)',
                  transformOrigin: 'bottom',
                  boxShadow: isHovered ? `0 0 12px ${color}66` : 'none',
                }}
              />
            </div>
          );
        })}
      </div>
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
              fill="none" stroke={color}
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
          // eslint-disable-next-line react-hooks/immutability
          offset += pct;
          return slice;
        })}
        <circle cx={cx} cy={cy} r={radius - strokeWidth / 2} fill="transparent" style={{ cursor: 'pointer' }} onClick={() => onCategoryClick?.(null)} />
        <text x={cx} y={cy - 4} textAnchor="middle" fill="#d4d4d4" fontSize="18" fontWeight="bold" style={{ pointerEvents: 'none' }}>{total}</text>
        <text x={cx} y={cy + 14} textAnchor="middle" fill="#737373" fontSize="10" style={{ pointerEvents: 'none' }}>Events</text>
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

function ActivityFeed({ events, onNavigate }) {
  const catColors = {
    'trail-adventures': 'bg-orange-500', 'rallyes': 'bg-yellow-500',
    'adventure-trips': 'bg-green-500', 'skills-camps': 'bg-blue-500', 'offroad-festivals': 'bg-purple-500',
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
            e.status === 'past' ? 'bg-stone-700 text-stone-400' : 'bg-blue-500/15 text-blue-400'
          }`}>{e.status}</span>
        </button>
      ))}
      {events.length === 0 && <p className="text-stone-600 text-sm text-center py-4">Keine Events</p>}
    </div>
  );
}

export default function OrganizerDashboard({ onNavigate, toast, organizerId }) {
  const { t } = useTranslation();
  const [stats, setStats] = useState(null);
  const [catData, setCatData] = useState([]);
  const [monthData, setMonthData] = useState([]);
  const [undatedCount, setUndatedCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!organizerId) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    Promise.all([
      organizerFetchDashboardStats(organizerId),
      organizerFetchEventsByCategory(organizerId),
      organizerFetchEventsPerMonth(organizerId),
    ]).then(([s, c, m]) => {
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
    }).catch(err => toast?.error(t('common.error') + ': ' + err.message))
      .finally(() => setLoading(false));
  }, [organizerId]);

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
          <p className="text-stone-500 text-sm mt-1">{t('organizer.dashboardSubtitle')}</p>
        </div>
        <button
          onClick={() => onNavigate('/admin/events/new')}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-400 text-white text-sm font-medium transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/>
          </svg>
          {t('dashboard.createEvent')}
        </button>
      </div>

      {/* Metric Cards — no Users/Organizers cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
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
          label={t('dashboard.upcomingEvents')}
          value={stats?.upcomingEvents}
          color="purple"
          subtext={t('dashboard.upcomingEventsSubtext')}
          onClick={() => onNavigate('/admin/events')}
          icon={
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          }
        />
        <MetricCard
          label={t('organizer.totalRegistrations')}
          value={stats?.totalRegistrations}
          color="green"
          subtext={t('organizer.acrossAllEvents')}
          onClick={() => onNavigate('/admin/reports')}
          icon={
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/>
            </svg>
          }
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-stone-900 rounded-xl border border-stone-800 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-stone-200 font-semibold">{t('dashboard.eventsPerMonth')}</h2>
            {undatedCount > 0 && (
              <span className="text-xs text-stone-500 bg-stone-800 px-2 py-1 rounded-lg">
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
            onCategoryClick={(cat) => onNavigate(cat ? `/admin/events?category=${cat}` : '/admin/events')}
          />
        </div>
      </div>

      {/* Recent Events */}
      <div className="bg-stone-900 rounded-xl border border-stone-800 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-stone-200 font-semibold">{t('dashboard.recentEvents')}</h2>
          <button onClick={() => onNavigate('/admin/events')} className="text-orange-400 text-sm hover:text-orange-300">
            {t('common.allSeeAll')}
          </button>
        </div>
        <ActivityFeed events={stats?.recentEvents ?? []} onNavigate={onNavigate} />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[
          { label: t('dashboard.quickNewEvent'), sub: t('dashboard.quickNewEventSub'), icon: '📅', onClick: () => onNavigate('/admin/events/new'), color: 'hover:border-orange-500/50' },
          { label: t('dashboard.quickReports'), sub: t('organizer.reportsSubtitle'), icon: '📊', onClick: () => onNavigate('/admin/reports'), color: 'hover:border-green-500/50' },
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
