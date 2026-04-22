// ─── TrailHub Admin – Reports & Analytics ────────────────────────────────────
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { adminFetchDashboardStats, adminFetchEventsByCategory, adminFetchEventsPerMonth } from '../services/adminSupabase';
import { supabase } from '../../services/supabaseClient';

const CATEGORY_LABELS = {
  'trail-adventures': 'Trail Adventures',
  'rallyes':          'Rallyes',
  'adventure-trips':  'Adventure Trips',
  'skills-camps':     'Skills-Camps',
  'offroad-festivals':'Offroad Festivals',
};
const CATEGORY_COLORS = ['#f97316','#eab308','#22c55e','#3b82f6','#a855f7'];

// ─── Horizontal Bar Chart ─────────────────────────────────────────────────────
function HBarChart({ data, labelKey, valueKey }) {
  const max = Math.max(...data.map(d => d[valueKey]), 1);
  return (
    <div className="space-y-3">
      {data.map((d, i) => (
        <div key={i} className="space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-stone-400 truncate max-w-[200px]">{CATEGORY_LABELS[d[labelKey]] ?? d[labelKey]}</span>
            <span className="text-stone-300 font-medium ml-2">{d[valueKey]}</span>
          </div>
          <div className="h-2 bg-stone-800 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${(d[valueKey] / max) * 100}%`,
                background: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Line-style month chart ───────────────────────────────────────────────────
function MonthChart({ data }) {
  if (!data?.length) return <p className="text-stone-600 text-sm text-center py-8">{/* no data */}</p>;
  const max = Math.max(...data.map(d => d.count), 1);
  const w = 600, h = 160, pad = { t: 16, b: 28, l: 32, r: 16 };
  const cw = w - pad.l - pad.r, ch = h - pad.t - pad.b;
  const pts = data.map((d, i) => ({
    x: pad.l + (i / Math.max(data.length - 1, 1)) * cw,
    y: pad.t + ch - (d.count / max) * ch,
    ...d,
  }));
  const polyline = pts.map(p => `${p.x},${p.y}`).join(' ');
  const area = `M${pts[0].x},${pad.t + ch} ` + pts.map(p => `L${p.x},${p.y}`).join(' ') + ` L${pts[pts.length-1].x},${pad.t+ch} Z`;

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ minWidth: 320 }}>
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map(f => (
          <line key={f} x1={pad.l} x2={w - pad.r} y1={pad.t + ch * (1 - f)} y2={pad.t + ch * (1 - f)} stroke="#292524" strokeWidth="1"/>
        ))}
        {/* Area fill */}
        <path d={area} fill="#f9731620" />
        {/* Line */}
        <polyline points={polyline} fill="none" stroke="#f97316" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {/* Dots + labels */}
        {pts.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="4" fill="#f97316" stroke="#1c1917" strokeWidth="2" />
            <text x={p.x} y={h - 4} textAnchor="middle" fill="#737373" fontSize="9">
              {String(p.month ?? '').slice(5)}
            </text>
            {p.count > 0 && (
              <text x={p.x} y={p.y - 8} textAnchor="middle" fill="#d4d4d4" fontSize="10">{p.count}</text>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub }) {
  return (
    <div className="bg-stone-900 rounded-xl border border-stone-800 p-5">
      <p className="text-stone-500 text-sm">{label}</p>
      <p className="text-3xl font-bold text-stone-100 mt-1">{value ?? '–'}</p>
      {sub && <p className="text-stone-500 text-xs mt-1">{sub}</p>}
    </div>
  );
}

// ─── Top Users Table ──────────────────────────────────────────────────────────
async function fetchTopUsers() {
  const { data } = await supabase.from('users').select('id, name, avatar, registered_event_ids').limit(200);
  return (data ?? [])
    .filter(u => (u.registered_event_ids ?? []).length > 0)
    .sort((a, b) => (b.registered_event_ids?.length ?? 0) - (a.registered_event_ids?.length ?? 0))
    .slice(0, 10);
}

async function fetchTopOrganizers() {
  const [{ data: events }, { data: organizers }] = await Promise.all([
    supabase.from('events').select('organizer_id'),
    supabase.from('organizers').select('id, name, logo'),
  ]);
  const counts = {};
  (events ?? []).forEach(e => { if (e.organizer_id) counts[e.organizer_id] = (counts[e.organizer_id] || 0) + 1; });
  return (organizers ?? [])
    .map(o => ({ ...o, eventCount: counts[o.id] ?? 0 }))
    .sort((a, b) => b.eventCount - a.eventCount)
    .slice(0, 8);
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Reports({ onNavigate, toast }) {
  const { t } = useTranslation();
  const [stats, setStats] = useState(null);
  const [catData, setCatData] = useState([]);
  const [monthData, setMonthData] = useState([]);
  const [topUsers, setTopUsers] = useState([]);
  const [topOrganizers, setTopOrganizers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      adminFetchDashboardStats(),
      adminFetchEventsByCategory(),
      adminFetchEventsPerMonth(),
      fetchTopUsers(),
      fetchTopOrganizers(),
    ]).then(([s, c, m, tu, to]) => {
      setStats(s);
      setCatData(c.sort((a, b) => b.count - a.count));
      setMonthData(m.slice(-12));
      setTopUsers(tu);
      setTopOrganizers(to);
    }).catch(err => toast?.error(t('reports.errorLoad', { msg: err.message })))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"/>
    </div>
  );

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-stone-100">{t('reports.title')}</h1>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label={t('reports.totalEvents')} value={stats?.totalEvents} sub={t('reports.allCategories')} />
        <StatCard label={t('reports.upcomingEvents')} value={stats?.upcomingEvents} sub={t('reports.upcoming')} />
        <StatCard label={t('reports.registeredUsers')} value={stats?.totalUsers} sub={t('reports.activeAccounts')} />
        <StatCard label={t('reports.organizers')} value={stats?.totalOrganizers} sub={t('reports.activeOrganizers')} />
      </div>

      {/* Events per Month */}
      <div className="bg-stone-900 rounded-xl border border-stone-800 p-5">
        <h2 className="text-stone-200 font-semibold mb-4">{t('reports.eventsPerMonth')}</h2>
        <MonthChart data={monthData} />
      </div>

      {/* Category Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-stone-900 rounded-xl border border-stone-800 p-5">
          <h2 className="text-stone-200 font-semibold mb-4">{t('reports.eventsByCategory')}</h2>
          <HBarChart data={catData} labelKey="category" valueKey="count" />
        </div>

        {/* Top Organizers */}
        <div className="bg-stone-900 rounded-xl border border-stone-800 p-5">
          <h2 className="text-stone-200 font-semibold mb-4">{t('reports.topOrganizers')}</h2>
          {topOrganizers.length === 0
            ? <p className="text-stone-600 text-sm">{t('common.noData')}</p>
            : (
              <div className="space-y-2">
                {topOrganizers.map((o, i) => (
                  <div key={o.id} className="flex items-center gap-3">
                    <span className="w-5 text-stone-600 text-xs text-right">{i + 1}.</span>
                    {o.logo
                      ? <img src={o.logo} alt="" className="w-7 h-7 rounded-full object-cover border border-stone-700"/>
                      : <div className="w-7 h-7 rounded-full bg-stone-800 flex items-center justify-center text-stone-500 text-xs font-bold">{o.name?.[0]}</div>
                    }
                    <span className="flex-1 text-stone-300 text-sm truncate">{o.name}</span>
                    <span className="text-orange-400 text-sm font-medium">{o.eventCount}</span>
                  </div>
                ))}
              </div>
            )
          }
        </div>
      </div>

      {/* Top Users */}
      <div className="bg-stone-900 rounded-xl border border-stone-800 p-5">
        <h2 className="text-stone-200 font-semibold mb-4">{t('reports.topUsers')}</h2>
        {topUsers.length === 0
          ? <p className="text-stone-600 text-sm">{t('common.noData')}</p>
          : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-stone-800">
                  <tr>
                    {[t('reports.tableHash'), t('reports.tableAvatar'), t('reports.tableName'), t('reports.tableRegistrations')].map(h => (
                      <th key={h} className="px-3 py-2.5 text-left text-xs font-medium text-stone-500 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-800">
                  {topUsers.map((u, i) => (
                    <tr key={u.id} className="hover:bg-stone-800/40 transition-colors">
                      <td className="px-3 py-3 text-stone-500 text-sm">{i + 1}</td>
                      <td className="px-3 py-3">
                        {u.avatar
                          ? <img src={u.avatar} alt="" className="w-8 h-8 rounded-full object-cover border border-stone-700"/>
                          : <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center text-white text-xs font-bold">{u.name?.[0]?.toUpperCase() ?? '?'}</div>
                        }
                      </td>
                      <td className="px-3 py-3">
                        <button onClick={() => onNavigate(`/admin/users/${u.id}`)} className="text-stone-300 hover:text-orange-400 text-sm transition-colors">
                          {u.name ?? t('reports.unknown')}
                        </button>
                      </td>
                      <td className="px-3 py-3">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-500/15 text-orange-400 text-sm font-medium">
                          {(u.registered_event_ids ?? []).length} Events
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        }
      </div>
    </div>
  );
}