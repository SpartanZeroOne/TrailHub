// ─── TrailHub Admin – Reports & Analytics ────────────────────────────────────
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  adminFetchDashboardStats, adminFetchEventsByCategory, adminFetchEventsPerMonth,
  adminFetchTopEventsByRegistrations, adminFetchRegistrationsByUser,
  adminFetchRegistrationsByOrganizer, adminFetchRegistrationTrends,
  adminFetchEventRegistrationDetails,
} from '../services/adminSupabase';
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
const MONTH_ABBR = ['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'];
function fmtMonth(yyyyMm) {
  if (!yyyyMm) return '';
  const [y, m] = yyyyMm.split('-');
  return `${MONTH_ABBR[parseInt(m, 10) - 1]} ${String(y).slice(2)}`;
}

function MonthChart({ data }) {
  const [tooltip, setTooltip] = useState(null);
  if (!data?.length) return (
    <p className="text-stone-600 text-sm text-center py-8">Keine Monatsdaten verfügbar</p>
  );
  const max = Math.max(...data.map(d => d.count), 1);
  const w = 600, h = 170, pad = { t: 20, b: 32, l: 36, r: 16 };
  const cw = w - pad.l - pad.r, ch = h - pad.t - pad.b;
  const pts = data.map((d, i) => ({
    x: pad.l + (i / Math.max(data.length - 1, 1)) * cw,
    y: pad.t + ch - (d.count / max) * ch,
    ...d,
  }));
  const polyline = pts.map(p => `${p.x},${p.y}`).join(' ');
  const area = `M${pts[0].x},${pad.t + ch} ` + pts.map(p => `L${p.x},${p.y}`).join(' ') + ` L${pts[pts.length-1].x},${pad.t+ch} Z`;

  return (
    <div className="overflow-x-auto relative">
      {tooltip && (
        <div
          className="absolute z-10 px-2.5 py-1.5 rounded-lg bg-stone-800 border border-stone-700 text-xs text-stone-200 pointer-events-none shadow-lg"
          style={{ left: tooltip.x, top: tooltip.y - 38, transform: 'translateX(-50%)' }}
        >
          <span className="font-semibold">{tooltip.count}</span> Events · {fmtMonth(tooltip.month)}
        </div>
      )}
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ minWidth: 320 }}>
        {/* Y-axis grid + labels */}
        {[0, 0.25, 0.5, 0.75, 1].map(f => {
          const yy = pad.t + ch * (1 - f);
          return (
            <g key={f}>
              <line x1={pad.l} x2={w - pad.r} y1={yy} y2={yy} stroke="#292524" strokeWidth="1"/>
              <text x={pad.l - 6} y={yy + 3} textAnchor="end" fill="#525252" fontSize="9">
                {Math.round(max * f)}
              </text>
            </g>
          );
        })}
        {/* Area fill */}
        <path d={area} fill="#f9731615" />
        {/* Line */}
        <polyline points={polyline} fill="none" stroke="#f97316" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {/* Dots + x-axis labels */}
        {pts.map((p, i) => (
          <g key={i}
            onMouseEnter={() => setTooltip({ x: p.x, y: p.y, count: p.count, month: p.month })}
            onMouseLeave={() => setTooltip(null)}
            style={{ cursor: 'pointer' }}
          >
            <circle cx={p.x} cy={p.y} r="8" fill="transparent" />
            <circle cx={p.x} cy={p.y} r={tooltip?.month === p.month ? 5 : 4}
              fill={tooltip?.month === p.month ? '#fb923c' : '#f97316'}
              stroke="#1c1917" strokeWidth="2" />
            <text x={p.x} y={h - 4} textAnchor="middle" fill="#525252" fontSize="9">
              {fmtMonth(p.month)}
            </text>
            {p.count > 0 && (
              <text x={p.x} y={p.y - 10} textAnchor="middle" fill="#d4d4d4" fontSize="10" fontWeight="600">{p.count}</text>
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

// ─── Top Users ────────────────────────────────────────────────────────────────
async function fetchTopUsers() {
  const { data, error } = await supabase
    .from('users')
    .select('id, name, avatar, registered_event_ids, email')
    .limit(500);
  if (error) { console.warn('fetchTopUsers error:', error.message); return []; }
  return (data ?? [])
    .map(u => ({ ...u, regCount: Array.isArray(u.registered_event_ids) ? u.registered_event_ids.length : 0 }))
    .filter(u => u.regCount > 0)
    .sort((a, b) => b.regCount - a.regCount)
    .slice(0, 10);
}

// ─── Top Organizers ───────────────────────────────────────────────────────────
async function fetchTopOrganizers() {
  const [evRes, orgRes] = await Promise.all([
    supabase.from('events').select('organizer_id'),
    supabase.from('organizers').select('id, name, logo'),
  ]);
  if (evRes.error)  console.warn('fetchTopOrganizers events error:', evRes.error.message);
  if (orgRes.error) console.warn('fetchTopOrganizers orgs error:',   orgRes.error.message);
  const counts = {};
  (evRes.data ?? []).forEach(e => {
    if (e.organizer_id) counts[e.organizer_id] = (counts[e.organizer_id] || 0) + 1;
  });
  return (orgRes.data ?? [])
    .map(o => ({ ...o, eventCount: counts[o.id] ?? 0 }))
    .filter(o => o.eventCount > 0)
    .sort((a, b) => b.eventCount - a.eventCount)
    .slice(0, 10);
}

const CATEGORY_LABEL = {
  'trail-adventures': 'Trail Adventures', 'rallyes': 'Rallyes',
  'adventure-trips': 'Adventure Trips', 'skills-camps': 'Skills-Camps',
  'offroad-festivals': 'Offroad Festivals',
};

function exportCSV(rows, filename, headers, locale) {
  const lines = [
    headers.join(';'),
    ...rows.map(r => [
      r.userName, r.userEmail, r.eventName, r.organizerName,
      r.eventCategory ?? '',
      r.eventDate ? new Date(r.eventDate).toLocaleDateString(locale) : '',
      r.registeredAt ? new Date(r.registeredAt).toLocaleDateString(locale) : '',
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(';')),
  ];
  const blob = new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a'); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Reports({ onNavigate, toast }) {
  const { t, i18n } = useTranslation();
  const [stats, setStats] = useState(null);
  const [catData, setCatData] = useState([]);
  const [monthData, setMonthData] = useState([]);
  const [topUsers, setTopUsers] = useState([]);
  const [topOrganizers, setTopOrganizers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Registration tracking state
  const [topEvents,    setTopEvents]    = useState([]);
  const [regByOrg,     setRegByOrg]     = useState([]);
  const [regTrends,    setRegTrends]    = useState({ thisWeek: 0, thisMonth: 0 });

  // "Registrierungen nach User" – lazy loaded, filtered
  const [regRows,     setRegRows]     = useState([]);
  const [regCount,    setRegCount]    = useState(0);
  const [regPage,     setRegPage]     = useState(0);
  const [regLoading,  setRegLoading]  = useState(false);
  const [regFilters,  setRegFilters]  = useState({ eventId: '', organizerId: '', dateFrom: '', dateTo: '' });
  const [events,      setEvents]      = useState([]);
  const [organizers,  setOrganizers]  = useState([]);

  // Event detail modal (super-admin: see who registered)
  const [detailModal, setDetailModal] = useState(null); // { eventName, users[] }
  const [detailLoading, setDetailLoading] = useState(false);

  const openEventDetail = async (eventId) => {
    setDetailModal({ eventName: '…', users: [] });
    setDetailLoading(true);
    const result = await adminFetchEventRegistrationDetails(eventId);
    setDetailModal(result);
    setDetailLoading(false);
  };

  const PER_PAGE = 50;

  useEffect(() => {
    setLoading(true);
    Promise.allSettled([
      adminFetchDashboardStats(),
      adminFetchEventsByCategory(),
      adminFetchEventsPerMonth(),
      fetchTopUsers(),
      fetchTopOrganizers(),
      adminFetchTopEventsByRegistrations(10),
      adminFetchRegistrationsByOrganizer(),
      adminFetchRegistrationTrends(),
    ]).then(results => {
      const val = (i, fallback) => results[i].status === 'fulfilled' ? results[i].value : fallback;
      const s   = val(0, null);
      const c   = val(1, []);
      const m   = val(2, []);
      const tu  = val(3, []);
      const to  = val(4, []);
      const te  = val(5, []);
      const rbo = val(6, []);
      const rt  = val(7, { thisWeek: 0, thisMonth: 0, monthly: [] });
      if (s)  setStats(s);
      if (c.length) setCatData(c.sort((a, b) => b.count - a.count));
      const monthArr = Array.isArray(m) ? m : (m.chartData ?? []);
      setMonthData(monthArr.slice(-12));
      setTopUsers(tu);
      setTopOrganizers(to);
      setTopEvents(te);
      setRegByOrg(rbo);
      setRegTrends(rt);
      results.forEach((r, i) => {
        if (r.status === 'rejected') console.warn(`Reports fetch[${i}] failed:`, r.reason);
      });
    }).finally(() => setLoading(false));

    // Load filter dropdowns
    supabase.from('events').select('id, name').order('name').then(({ data }) => setEvents(data ?? []));
    supabase.from('organizers').select('id, name').order('name').then(({ data }) => setOrganizers(data ?? []));
  }, []);

  // Load reg-by-user when filters or page change
  useEffect(() => {
    setRegLoading(true);
    adminFetchRegistrationsByUser({
      eventId:    regFilters.eventId    || null,
      organizerId:regFilters.organizerId|| null,
      dateFrom:   regFilters.dateFrom   || null,
      dateTo:     regFilters.dateTo     || null,
      page: regPage, perPage: PER_PAGE,
    }).then(({ data, count }) => {
      setRegRows(data); setRegCount(count ?? 0);
    }).catch(err => { console.warn('regByUser fetch failed:', err); setRegRows([]); setRegCount(0); })
      .finally(() => setRegLoading(false));
  }, [regFilters, regPage]);

  const handleFilterChange = (key, val) => {
    setRegPage(0);
    setRegFilters(f => ({ ...f, [key]: val }));
  };

  const handleExportCSV = async () => {
    toast?.info(t('reports.exportCSV') + '…');
    const { data } = await adminFetchRegistrationsByUser({
      eventId:    regFilters.eventId    || null,
      organizerId:regFilters.organizerId|| null,
      dateFrom:   regFilters.dateFrom   || null,
      dateTo:     regFilters.dateTo     || null,
      page: 0, perPage: 5000,
    });
    const csvHeaders = ['User', 'E-Mail', 'Event', t('common.organizer'), t('reports.columnCategory'), t('reports.columnDate'), t('reports.columnRegisteredAt')];
    exportCSV(data, `registrations_${new Date().toISOString().slice(0,10)}.csv`, csvHeaders, i18n.language);
  };

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
                          {u.name || u.email || t('reports.unknown')}
                        </button>
                      </td>
                      <td className="px-3 py-3">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-orange-500/15 text-orange-400 text-sm font-medium">
                          {u.regCount} Events
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

      {/* ── Beliebteste Events (Plattform) ─────────────────────────────────── */}
      <div className="bg-stone-900 rounded-xl border border-stone-800 p-5">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-stone-200 font-semibold">{t('reports.topEventsByReg')}</h2>
          {regTrends.thisWeek > 0 && (
            <span className="text-xs text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full">
              {t('reports.thisWeek', { count: regTrends.thisWeek })}
            </span>
          )}
        </div>
        <p className="text-stone-600 text-xs mb-4">{t('reports.clickHint')}</p>
        {topEvents.length === 0
          ? <p className="text-stone-600 text-sm">{t('common.noData')}</p>
          : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-stone-800">
                  <tr>
                    {['#', 'Event', t('common.organizer'), t('reports.columnCategory'), t('reports.columnDate'), t('reports.registrations')].map(h => (
                      <th key={h} className="px-3 py-2.5 text-left text-xs font-medium text-stone-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-800">
                  {topEvents.map((e, i) => {
                    const maxReg = topEvents[0]?.registrations || 1;
                    return (
                      <tr key={e.id}
                        onClick={() => openEventDetail(e.id)}
                        className="hover:bg-stone-800/60 transition-colors cursor-pointer group">
                        <td className="px-3 py-3 text-stone-500 text-xs">{i + 1}</td>
                        <td className="px-3 py-3 max-w-[200px]">
                          <p className="text-stone-200 font-medium truncate group-hover:text-orange-400 transition-colors">{e.name}</p>
                        </td>
                        <td className="px-3 py-3 text-stone-400 text-xs whitespace-nowrap">{e.organizerName}</td>
                        <td className="px-3 py-3 text-stone-500 text-xs">{CATEGORY_LABEL[e.category] ?? e.category ?? '–'}</td>
                        <td className="px-3 py-3 text-stone-500 text-xs whitespace-nowrap">
                          {e.startDate ? new Date(e.startDate).toLocaleDateString(i18n.language, { day: '2-digit', month: 'short', year: '2-digit' }) : '–'}
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-stone-800 rounded-full overflow-hidden min-w-[60px]">
                              <div className="h-full rounded-full bg-orange-500 transition-all duration-500"
                                style={{ width: `${(e.registrations / maxReg) * 100}%` }} />
                            </div>
                            <span className="text-orange-400 font-semibold text-xs flex-shrink-0">{e.registrations}</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        }
      </div>

      {/* ── Anmeldungen nach Organizer ─────────────────────────────────────── */}
      <div className="bg-stone-900 rounded-xl border border-stone-800 p-5">
        <h2 className="text-stone-200 font-semibold mb-4">{t('reports.regByOrganizer')}</h2>
        {regByOrg.length === 0
          ? <p className="text-stone-600 text-sm">{t('common.noData')}</p>
          : (
            <div className="space-y-3">
              {regByOrg.map((o, i) => {
                const max = regByOrg[0]?.registrations || 1;
                return (
                  <div key={o.id ?? i} className="flex items-center gap-3">
                    {o.logo
                      ? <img src={o.logo} alt="" className="w-7 h-7 rounded-full object-cover border border-stone-700 flex-shrink-0"/>
                      : <div className="w-7 h-7 rounded-full bg-stone-800 flex items-center justify-center text-stone-400 text-xs font-bold flex-shrink-0">{o.name?.[0]}</div>
                    }
                    <span className="text-stone-300 text-sm w-40 flex-shrink-0 truncate">{o.name}</span>
                    <div className="flex-1 h-2 bg-stone-800 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-blue-500 transition-all duration-500"
                        style={{ width: `${(o.registrations / max) * 100}%` }}/>
                    </div>
                    <span className="text-blue-400 font-semibold text-sm flex-shrink-0 w-12 text-right">{o.registrations}</span>
                  </div>
                );
              })}
            </div>
          )
        }
      </div>

      {/* ── Registrierungen nach User ──────────────────────────────────────── */}
      <div className="bg-stone-900 rounded-xl border border-stone-800 p-5">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <h2 className="text-stone-200 font-semibold">{t('reports.regByUser')}</h2>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-400 text-sm hover:bg-emerald-500/25 transition-colors border border-emerald-500/20"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            {t('reports.exportCSV')}
          </button>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          <select
            value={regFilters.eventId}
            onChange={e => handleFilterChange('eventId', e.target.value)}
            className="bg-stone-800 border border-stone-700 text-stone-300 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-orange-500/50"
          >
            <option value="">{t('reports.allEvents')}</option>
            {events.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
          <select
            value={regFilters.organizerId}
            onChange={e => handleFilterChange('organizerId', e.target.value)}
            className="bg-stone-800 border border-stone-700 text-stone-300 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-orange-500/50"
          >
            <option value="">{t('reports.allOrganizers')}</option>
            {organizers.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
          <input
            type="date" value={regFilters.dateFrom}
            onChange={e => handleFilterChange('dateFrom', e.target.value)}
            className="bg-stone-800 border border-stone-700 text-stone-300 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-orange-500/50"
            placeholder="Von"
          />
          <input
            type="date" value={regFilters.dateTo}
            onChange={e => handleFilterChange('dateTo', e.target.value)}
            className="bg-stone-800 border border-stone-700 text-stone-300 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-orange-500/50"
            placeholder="Bis"
          />
        </div>

        {regLoading
          ? <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"/></div>
          : regRows.length === 0
            ? <p className="text-stone-600 text-sm py-4 text-center">{t('common.noData')}</p>
            : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b border-stone-800">
                      <tr>
                        {['User', 'E-Mail', 'Event', t('common.organizer'), t('reports.columnDate'), t('reports.columnRegisteredAt')].map(h => (
                          <th key={h} className="px-3 py-2.5 text-left text-xs font-medium text-stone-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-800">
                      {regRows.map(r => (
                        <tr key={r.id} className="hover:bg-stone-800/40 transition-colors">
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-2">
                              {r.userAvatar
                                ? <img src={r.userAvatar} alt="" className="w-7 h-7 rounded-full object-cover border border-stone-700"/>
                                : <div className="w-7 h-7 rounded-full bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center text-white text-xs font-bold">{r.userName?.[0]?.toUpperCase() ?? '?'}</div>
                              }
                              <button onClick={() => onNavigate(`/admin/users/${r.userId}`)}
                                className="text-stone-300 hover:text-orange-400 transition-colors font-medium">{r.userName}</button>
                            </div>
                          </td>
                          <td className="px-3 py-3 text-stone-500 text-xs max-w-[160px] truncate">{r.userEmail}</td>
                          <td className="px-3 py-3 text-stone-300 max-w-[180px]">
                            <button onClick={() => onNavigate(`/admin/events/${r.eventId}/edit`)}
                              className="truncate hover:text-orange-400 transition-colors block w-full text-left">{r.eventName}</button>
                          </td>
                          <td className="px-3 py-3 text-stone-500 text-xs whitespace-nowrap">{r.organizerName}</td>
                          <td className="px-3 py-3 text-stone-500 text-xs whitespace-nowrap">
                            {r.eventDate ? new Date(r.eventDate).toLocaleDateString(i18n.language, { day: '2-digit', month: 'short', year: '2-digit' }) : '–'}
                          </td>
                          <td className="px-3 py-3 text-stone-500 text-xs whitespace-nowrap">
                            {r.registeredAt ? new Date(r.registeredAt).toLocaleDateString(i18n.language, { day: '2-digit', month: 'short', year: '2-digit' }) : '–'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {regCount > PER_PAGE && (
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-stone-800">
                    <p className="text-stone-500 text-sm">
                      {regPage * PER_PAGE + 1}–{Math.min((regPage + 1) * PER_PAGE, regCount)} {t('common.of')} {regCount}
                    </p>
                    <div className="flex gap-2">
                      <button onClick={() => setRegPage(p => Math.max(0, p - 1))} disabled={regPage === 0}
                        className="px-3 py-1.5 rounded-lg bg-stone-800 text-stone-400 text-sm disabled:opacity-40 hover:bg-stone-700 transition-colors">
                        {t('common.back')}
                      </button>
                      <button onClick={() => setRegPage(p => p + 1)} disabled={(regPage + 1) * PER_PAGE >= regCount}
                        className="px-3 py-1.5 rounded-lg bg-stone-800 text-stone-400 text-sm disabled:opacity-40 hover:bg-stone-700 transition-colors">
                        {t('common.next')}
                      </button>
                    </div>
                  </div>
                )}
              </>
            )
        }
      </div>

      {/* ── Event Registration Detail Modal ────────────────────────────────── */}
      {detailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={() => setDetailModal(null)}>
          <div className="bg-stone-900 rounded-2xl border border-stone-700 w-full max-w-lg max-h-[80vh] flex flex-col shadow-2xl"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between p-5 border-b border-stone-800">
              <div>
                <h3 className="text-stone-100 font-semibold text-lg">{detailModal.eventName}</h3>
                <p className="text-stone-500 text-sm mt-0.5">
                  {detailLoading ? t('reports.loadingModal') : t('reports.usersRegistered', { count: detailModal.users.length })}
                </p>
              </div>
              <button onClick={() => setDetailModal(null)}
                className="text-stone-500 hover:text-stone-300 transition-colors p-1 -mt-1 -mr-1">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-2">
              {detailLoading
                ? <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"/></div>
                : detailModal.users.length === 0
                  ? <p className="text-stone-600 text-sm text-center py-8">{t('reports.noRegistrations')}</p>
                  : (
                    <table className="w-full text-sm">
                      <thead className="border-b border-stone-800">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs text-stone-500 font-medium uppercase tracking-wider">User</th>
                          <th className="px-3 py-2 text-left text-xs text-stone-500 font-medium uppercase tracking-wider">E-Mail</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-800/60">
                        {detailModal.users.map(u => (
                          <tr key={u.id} className="hover:bg-stone-800/40 transition-colors">
                            <td className="px-3 py-2.5">
                              <div className="flex items-center gap-2">
                                {u.avatar
                                  ? <img src={u.avatar} alt="" className="w-7 h-7 rounded-full object-cover border border-stone-700"/>
                                  : <div className="w-7 h-7 rounded-full bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center text-white text-xs font-bold">{u.name?.[0]?.toUpperCase() ?? '?'}</div>
                                }
                                <button onClick={() => { setDetailModal(null); onNavigate(`/admin/users/${u.id}`); }}
                                  className="text-stone-300 hover:text-orange-400 transition-colors font-medium">
                                  {u.name || '–'}
                                </button>
                              </div>
                            </td>
                            <td className="px-3 py-2.5 text-stone-500 text-xs">{u.email || '–'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )
              }
            </div>
          </div>
        </div>
      )}
    </div>
  );
}