// ─── TrailHub Admin – Organizer Reports (restricted, no user data) ────────────
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  organizerFetchEventsByCategory,
  organizerFetchEventsPerMonth,
  organizerFetchRegistrationsPerEvent,
  organizerFetchDashboardStats,
  organizerFetchRegistrationTrends,
} from '../services/adminSupabase';

const CATEGORY_LABELS = {
  'trail-adventures': 'Trail Adventures',
  'rallyes':          'Rallyes',
  'adventure-trips':  'Adventure Trips',
  'skills-camps':     'Skills-Camps',
  'offroad-festivals':'Offroad Festivals',
};
const CATEGORY_COLORS = ['#f97316','#eab308','#22c55e','#3b82f6','#a855f7'];

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
              style={{ width: `${(d[valueKey] / max) * 100}%`, background: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

const MONTH_ABBR = ['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'];
function fmtMonth(yyyyMm) {
  if (!yyyyMm) return '';
  const [y, m] = yyyyMm.split('-');
  return `${MONTH_ABBR[parseInt(m, 10) - 1]} ${String(y).slice(2)}`;
}

function MonthChart({ data }) {
  const [tooltip, setTooltip] = useState(null);
  if (!data?.length) return <p className="text-stone-600 text-sm text-center py-8">Keine Monatsdaten verfügbar</p>;
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
        <div className="absolute z-10 px-2.5 py-1.5 rounded-lg bg-stone-800 border border-stone-700 text-xs text-stone-200 pointer-events-none shadow-lg"
          style={{ left: tooltip.x, top: tooltip.y - 38, transform: 'translateX(-50%)' }}>
          <span className="font-semibold">{tooltip.count}</span> Events · {fmtMonth(tooltip.month)}
        </div>
      )}
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ minWidth: 320 }}>
        {[0, 0.25, 0.5, 0.75, 1].map(f => {
          const yy = pad.t + ch * (1 - f);
          return (
            <g key={f}>
              <line x1={pad.l} x2={w - pad.r} y1={yy} y2={yy} stroke="#292524" strokeWidth="1"/>
              <text x={pad.l - 6} y={yy + 3} textAnchor="end" fill="#525252" fontSize="9">{Math.round(max * f)}</text>
            </g>
          );
        })}
        <path d={area} fill="#f9731615" />
        <polyline points={polyline} fill="none" stroke="#f97316" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {pts.map((p, i) => (
          <g key={i}
            onMouseEnter={() => setTooltip({ x: p.x, y: p.y, count: p.count, month: p.month })}
            onMouseLeave={() => setTooltip(null)}
            style={{ cursor: 'pointer' }}
          >
            <circle cx={p.x} cy={p.y} r="8" fill="transparent" />
            <circle cx={p.x} cy={p.y} r={tooltip?.month === p.month ? 5 : 4}
              fill={tooltip?.month === p.month ? '#fb923c' : '#f97316'} stroke="#1c1917" strokeWidth="2" />
            <text x={p.x} y={h - 4} textAnchor="middle" fill="#525252" fontSize="9">{fmtMonth(p.month)}</text>
            {p.count > 0 && (
              <text x={p.x} y={p.y - 10} textAnchor="middle" fill="#d4d4d4" fontSize="10" fontWeight="600">{p.count}</text>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
}

function RegTrendChart({ data, regLabel }) {
  const [tooltip, setTooltip] = useState(null);
  if (!data?.length) return null;
  const max = Math.max(...data.map(d => d.count), 1);
  const w = 600, h = 150, pad = { t: 16, b: 28, l: 32, r: 12 };
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
        <div className="absolute z-10 px-2.5 py-1.5 rounded-lg bg-stone-800 border border-stone-700 text-xs text-stone-200 pointer-events-none shadow-lg"
          style={{ left: tooltip.x, top: tooltip.y - 38, transform: 'translateX(-50%)' }}>
          <span className="font-semibold">{tooltip.count}</span> {regLabel} · {fmtMonth(tooltip.month)}
        </div>
      )}
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ minWidth: 300 }}>
        {[0, 0.5, 1].map(f => {
          const yy = pad.t + ch * (1 - f);
          return <g key={f}>
            <line x1={pad.l} x2={w - pad.r} y1={yy} y2={yy} stroke="#292524" strokeWidth="1"/>
            <text x={pad.l - 4} y={yy + 3} textAnchor="end" fill="#525252" fontSize="9">{Math.round(max * f)}</text>
          </g>;
        })}
        <path d={area} fill="#3b82f615" />
        <polyline points={polyline} fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"/>
        {pts.map((p, i) => (
          <g key={i}
            onMouseEnter={() => setTooltip({ x: p.x, y: p.y, count: p.count, month: p.month })}
            onMouseLeave={() => setTooltip(null)}
            style={{ cursor: 'pointer' }}>
            <circle cx={p.x} cy={p.y} r="8" fill="transparent"/>
            <circle cx={p.x} cy={p.y} r={tooltip?.month === p.month ? 5 : 4}
              fill={tooltip?.month === p.month ? '#60a5fa' : '#3b82f6'} stroke="#1c1917" strokeWidth="2"/>
            <text x={p.x} y={h - 4} textAnchor="middle" fill="#525252" fontSize="9">{fmtMonth(p.month)}</text>
            {p.count > 0 && <text x={p.x} y={p.y - 10} textAnchor="middle" fill="#d4d4d4" fontSize="10" fontWeight="600">{p.count}</text>}
          </g>
        ))}
      </svg>
    </div>
  );
}

function StatCard({ label, value, sub }) {
  return (
    <div className="bg-stone-900 rounded-xl border border-stone-800 p-5">
      <p className="text-stone-500 text-sm">{label}</p>
      <p className="text-3xl font-bold text-stone-100 mt-1">{value ?? '–'}</p>
      {sub && <p className="text-stone-500 text-xs mt-1">{sub}</p>}
    </div>
  );
}

export default function OrganizerReports({ onNavigate, toast, organizerId }) {
  const { t, i18n } = useTranslation();
  const [stats, setStats] = useState(null);
  const [catData, setCatData] = useState([]);
  const [monthData, setMonthData] = useState([]);
  const [eventRegs, setEventRegs] = useState([]);
  const [trends, setTrends] = useState({ thisWeek: 0, thisMonth: 0, monthly: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!organizerId) return;
    setLoading(true);
    Promise.allSettled([
      organizerFetchDashboardStats(organizerId),
      organizerFetchEventsByCategory(organizerId),
      organizerFetchEventsPerMonth(organizerId),
      organizerFetchRegistrationsPerEvent(organizerId),
      organizerFetchRegistrationTrends(organizerId),
    ]).then(results => {
      const val = (i, fallback) => results[i].status === 'fulfilled' ? results[i].value : fallback;
      const s  = val(0, null);
      const c  = val(1, []);
      const m  = val(2, []);
      const r  = val(3, []);
      const tr = val(4, { thisWeek: 0, thisMonth: 0, monthly: [] });
      if (s) setStats(s);
      if (c.length) setCatData(c.sort((a, b) => b.count - a.count));
      const monthArr = Array.isArray(m) ? m : (m.chartData ?? []);
      setMonthData(monthArr.slice(-12));
      setEventRegs(r);
      setTrends(tr);
      results.forEach((res, i) => {
        if (res.status === 'rejected') console.warn(`OrganizerReports fetch[${i}] failed:`, res.reason);
      });
    }).finally(() => setLoading(false));
  }, [organizerId]);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"/>
    </div>
  );

  const sortedByReg = [...eventRegs].sort((a, b) => b.registrations - a.registrations);
  const eventsWithMax = eventRegs.filter(e => e.maxParticipants > 0);

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-stone-100">{t('reports.title')}</h1>

      {/* Overview Cards — no user/organizer counts */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard label={t('reports.totalEvents')} value={stats?.totalEvents} sub={t('reports.allCategories')} />
        <StatCard label={t('reports.upcomingEvents')} value={stats?.upcomingEvents} sub={t('reports.upcoming')} />
        <StatCard
          label={t('organizer.totalRegistrations')}
          value={stats?.totalRegistrations}
          sub={
            trends.thisWeek > 0 || trends.thisMonth > 0
              ? `+${trends.thisWeek} diese Woche · +${trends.thisMonth} diesen Monat`
              : t('organizer.acrossAllEvents')
          }
        />
      </div>

      {/* Registration Trends chart (only if data exists) */}
      {trends.monthly.length > 0 && (
        <div className="bg-stone-900 rounded-xl border border-stone-800 p-5">
          <h2 className="text-stone-200 font-semibold mb-4">{t('organizer.regTrends')}</h2>
          <RegTrendChart data={trends.monthly.slice(-12)} regLabel={t('organizer.registrations')} />
        </div>
      )}

      {/* Events per Month */}
      <div className="bg-stone-900 rounded-xl border border-stone-800 p-5">
        <h2 className="text-stone-200 font-semibold mb-4">{t('reports.eventsPerMonth')}</h2>
        <MonthChart data={monthData} />
      </div>

      {/* Category Breakdown */}
      <div className="bg-stone-900 rounded-xl border border-stone-800 p-5">
        <h2 className="text-stone-200 font-semibold mb-4">{t('reports.eventsByCategory')}</h2>
        <HBarChart data={catData} labelKey="category" valueKey="count" />
      </div>

      {/* Anmeldungen pro Event */}
      <div className="bg-stone-900 rounded-xl border border-stone-800 p-5">
        <h2 className="text-stone-200 font-semibold mb-4">{t('organizer.registrationsPerEvent')}</h2>
        {eventRegs.length === 0
          ? <p className="text-stone-600 text-sm">{t('common.noData')}</p>
          : (
            <div className="space-y-2">
              {eventRegs.map(e => (
                <div key={e.id} className="flex items-center gap-3 py-2 border-b border-stone-800 last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-stone-300 text-sm truncate">{e.name}</p>
                    {e.startDate && <p className="text-stone-600 text-xs">{new Date(e.startDate).toLocaleDateString(i18n.language)}</p>}
                  </div>
                  <span className="text-orange-400 font-semibold text-sm flex-shrink-0">{e.registrations} {t('organizer.registrations')}</span>
                </div>
              ))}
            </div>
          )
        }
      </div>

      {/* Beliebteste Events */}
      <div className="bg-stone-900 rounded-xl border border-stone-800 p-5">
        <h2 className="text-stone-200 font-semibold mb-4">{t('organizer.mostPopularEvents')}</h2>
        {sortedByReg.length === 0
          ? <p className="text-stone-600 text-sm">{t('common.noData')}</p>
          : (
            <div className="space-y-2">
              {sortedByReg.slice(0, 10).map((e, i) => (
                <div key={e.id} className="flex items-center gap-3">
                  <span className="w-5 text-stone-600 text-xs text-right flex-shrink-0">{i + 1}.</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-stone-300 text-sm truncate">{e.name}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-500/15 text-orange-400 text-xs font-medium">
                      {e.registrations} {t('organizer.regShort')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )
        }
      </div>

      {/* Auslastung (capacity fill rate) */}
      {eventsWithMax.length > 0 && (
        <div className="bg-stone-900 rounded-xl border border-stone-800 p-5">
          <h2 className="text-stone-200 font-semibold mb-4">{t('organizer.capacityFill')}</h2>
          <div className="space-y-4">
            {eventsWithMax.map(e => {
              const pct = Math.min(100, Math.round((e.registrations / e.maxParticipants) * 100));
              const color = pct >= 90 ? '#ef4444' : pct >= 60 ? '#f97316' : '#22c55e';
              return (
                <div key={e.id} className="space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-stone-300 truncate max-w-[60%]">{e.name}</span>
                    <span className="text-stone-400 ml-2 flex-shrink-0">
                      {e.registrations}/{e.maxParticipants} ({pct}%)
                    </span>
                  </div>
                  <div className="h-2 bg-stone-800 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
