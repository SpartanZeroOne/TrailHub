// ─── TrailHub Admin – Event List ──────────────────────────────────────────────
import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { adminFetchEvents, adminBulkUpdateEvents, adminBulkDeleteEvents, adminFetchArchivedEvents } from '../../services/adminSupabase';
import { CATEGORIES, STATUS_OPTIONS, ITEMS_PER_PAGE_OPTIONS } from '../../utils/adminConfig';

const CATEGORY_LABELS = {
  'trail-adventures': 'Trail Adv.',
  'rallyes':          'Rallye',
  'adventure-trips':  'Adventure',
  'skills-camps':     'Skills',
  'offroad-festivals':'Festival',
};

const CATEGORY_COLORS = {
  'trail-adventures': 'bg-orange-500/15 text-orange-400',
  'rallyes':          'bg-yellow-500/15 text-yellow-400',
  'adventure-trips':  'bg-green-500/15 text-green-400',
  'skills-camps':     'bg-blue-500/15 text-blue-400',
  'offroad-festivals':'bg-purple-500/15 text-purple-400',
};

function StatusBadge({ status }) {
  const map = {
    upcoming:  'bg-green-500/15 text-green-400 border border-green-500/20',
    past:      'bg-stone-700 text-stone-400 border border-stone-600',
    permanent: 'bg-blue-500/15 text-blue-400 border border-blue-500/20',
    sold_out:  'bg-orange-500/15 text-orange-400 border border-orange-500/30',
    cancelled: 'bg-red-500/15 text-red-400 border border-red-500/30',
  };
  const labels = {
    upcoming:  'upcoming',
    past:      'past',
    permanent: 'permanent',
    sold_out:  'sold out',
    cancelled: 'cancelled',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${map[status] ?? map.past}`}>
      {labels[status] ?? status}
    </span>
  );
}

function DifficultyStars({ level }) {
  if (!level) return <span className="text-stone-600 text-xs">–</span>;
  return (
    <span className="text-amber-400 text-xs">
      {'★'.repeat(level)}{'☆'.repeat(Math.max(0, 3 - level))}
    </span>
  );
}

function SortIcon({ active, dir }) {
  if (!active) return <span className="text-stone-600 ml-1">↕</span>;
  return <span className="text-orange-400 ml-1">{dir === 'asc' ? '↑' : '↓'}</span>;
}

export default function EventList({ onNavigate, toast, initialOrganizerId = '', organizerName = '' }) {
  const { t } = useTranslation();
  const [events, setEvents] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const [sortBy, setSortBy] = useState('start_date');
  const [sortDir, setSortDir] = useState('asc');
  const [filters, setFilters] = useState({ category: '', status: '', organizerId: initialOrganizerId, search: '' });
  const [selected, setSelected] = useState(new Set());
  const [bulkAction, setBulkAction] = useState('');
  const [bulkLoading, setBulkLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [recentPast, setRecentPast] = useState([]);
  const [pastTotal, setPastTotal] = useState(0);
  const searchTimer = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, count } = await adminFetchEvents({
        page, perPage, sortBy, sortDir,
        category: filters.category || undefined,
        status: filters.status || undefined,
        organizerId: filters.organizerId || undefined,
        search: filters.search || undefined,
        excludeStatuses: !filters.status ? ['past'] : [],
      });
      setEvents(data);
      setTotal(count);
      setSelected(new Set());
    } catch (err) {
      toast?.error(t('events.errorLoad', { msg: err.message }));
    } finally {
      setLoading(false);
    }
  }, [page, perPage, sortBy, sortDir, filters]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (filters.status) { setRecentPast([]); setPastTotal(0); return; }
    adminFetchArchivedEvents({ page: 1, perPage: 3, sortBy: 'end_date', sortDir: 'desc' })
      .then(({ data, count }) => { setRecentPast(data); setPastTotal(count); })
      .catch(() => {});
  }, [filters.status]);

  const handleSearchChange = (val) => {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setFilters(f => ({ ...f, search: val }));
      setPage(1);
    }, 300);
  };

  const handleSort = (col) => {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortDir('asc'); }
    setPage(1);
  };

  const handleFilterChange = (key, val) => {
    setFilters(f => ({ ...f, [key]: val }));
    setPage(1);
  };

  const toggleSelect = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === events.length) setSelected(new Set());
    else setSelected(new Set(events.map(e => e.id)));
  };

  const executeBulk = async () => {
    if (!bulkAction || selected.size === 0) return;
    setBulkLoading(true);
    setShowConfirm(false);
    try {
      const ids = Array.from(selected);
      if (bulkAction === 'delete') {
        await adminBulkDeleteEvents(ids);
        toast?.success(`${ids.length} Event(s) ${t('common.delete')}.`);
      } else if (bulkAction === 'activate') {
        await adminBulkUpdateEvents(ids, { status: 'upcoming' });
        toast?.success(`${ids.length} Event(s) → upcoming`);
      } else if (bulkAction === 'deactivate') {
        await adminBulkUpdateEvents(ids, { status: 'past' });
        toast?.success(`${ids.length} Event(s) → past`);
      } else if (bulkAction === 'sold_out') {
        await adminBulkUpdateEvents(ids, { status: 'sold_out' });
        toast?.success(`${ids.length} Event(s) → sold out`);
      } else if (bulkAction === 'cancelled') {
        await adminBulkUpdateEvents(ids, { status: 'cancelled' });
        toast?.success(`${ids.length} Event(s) → cancelled`);
      }
      setBulkAction('');
      load();
    } catch (err) {
      toast?.error(t('common.error') + ': ' + err.message);
    } finally {
      setBulkLoading(false);
    }
  };

  const exportCSV = () => {
    const rows = [
      ['ID', 'Name', 'Kategorie', 'Status', 'Start', 'Ende', 'Ort', 'Preis', 'Organizer'],
      ...events.map(e => [
        e.id, e.name, e.category, e.status,
        e.start_date, e.end_date ?? '', e.location, e.price_value ?? '',
        e.organizers?.name ?? e.organizer_id ?? '',
      ]),
    ];
    const csv = rows.map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'events_export.csv'; a.click();
    URL.revokeObjectURL(url);
    toast?.success('CSV exportiert!');
  };

  const totalPages = Math.max(1, Math.ceil(total / perPage));

  const Th = ({ label, col }) => (
    <th
      className="px-4 py-3 text-left text-xs font-medium text-stone-400 uppercase tracking-wider cursor-pointer select-none hover:text-stone-200 whitespace-nowrap"
      onClick={col ? () => handleSort(col) : undefined}
    >
      {label}{col && <SortIcon active={sortBy === col} dir={sortDir} />}
    </th>
  );

  return (
    <div className="p-6 space-y-5 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-stone-100">
            {organizerName ? `Events – ${organizerName}` : t('events.title')}
          </h1>
          <p className="text-stone-500 text-sm mt-0.5">{total} {t('events.subtitleTemplate')}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {initialOrganizerId && (
            <button
              onClick={() => onNavigate('/admin/organizers')}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 text-sm border border-stone-700 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
              Alle Events
            </button>
          )}
          <button onClick={exportCSV} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 text-sm border border-stone-700 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
            {t('events.csvExport')}
          </button>
          <button
            onClick={() => onNavigate('/admin/events/new')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-400 text-white text-sm font-medium transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
            {t('events.newEvent')}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-stone-900 rounded-xl border border-stone-800 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <input
            type="text"
            placeholder={t('events.searchPlaceholder')}
            defaultValue={filters.search}
            onChange={e => handleSearchChange(e.target.value)}
            className="px-3 py-2 rounded-lg bg-stone-800 border border-stone-700 text-stone-200 text-sm placeholder:text-stone-600 focus:outline-none focus:border-orange-500/50"
          />
          <select
            value={filters.category}
            onChange={e => handleFilterChange('category', e.target.value)}
            className="px-3 py-2 rounded-lg bg-stone-800 border border-stone-700 text-stone-300 text-sm focus:outline-none focus:border-orange-500/50"
          >
            <option value="">{t('events.allCategories')}</option>
            {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
          <select
            value={filters.status}
            onChange={e => handleFilterChange('status', e.target.value)}
            className="px-3 py-2 rounded-lg bg-stone-800 border border-stone-700 text-stone-300 text-sm focus:outline-none focus:border-orange-500/50"
          >
            <option value="">{t('events.allStatus')}</option>
            {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <select
            value={perPage}
            onChange={e => { setPerPage(Number(e.target.value)); setPage(1); }}
            className="px-3 py-2 rounded-lg bg-stone-800 border border-stone-700 text-stone-300 text-sm focus:outline-none focus:border-orange-500/50"
          >
            {ITEMS_PER_PAGE_OPTIONS.map(n => <option key={n} value={n}>{n} {t('events.perPage')}</option>)}
          </select>
        </div>
      </div>

      {/* Bulk Actions */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
          <span className="text-orange-400 text-sm font-medium">{selected.size} {t('common.selected')}</span>
          <select
            value={bulkAction}
            onChange={e => setBulkAction(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-stone-800 border border-stone-700 text-stone-300 text-sm focus:outline-none"
          >
            <option value="">{t('common.selectAction')}</option>
            <option value="activate">{t('events.bulkActivate')}</option>
            <option value="deactivate">{t('events.bulkDeactivate')}</option>
            <option value="sold_out">{t('events.bulkSoldOut')}</option>
            <option value="cancelled">{t('events.bulkCancelled')}</option>
            <option value="delete">{t('events.bulkDelete')}</option>
          </select>
          <button
            onClick={() => { if (bulkAction) setShowConfirm(true); }}
            disabled={!bulkAction || bulkLoading}
            className="px-3 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-400 text-white text-sm font-medium disabled:opacity-40 transition-colors"
          >
            {t('common.execute')}
          </button>
          <button onClick={() => setSelected(new Set())} className="text-stone-500 hover:text-stone-300 text-sm ml-auto">
            {t('common.deselectAll')}
          </button>
        </div>
      )}

      {/* Confirm Dialog */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-stone-900 border border-stone-700 rounded-xl p-6 max-w-sm w-full mx-4 shadow-2xl">
            <h3 className="text-stone-100 font-semibold mb-2">{t('events.confirmTitle')}</h3>
            <p className="text-stone-400 text-sm mb-5">
              {bulkAction === 'delete'
                ? t('events.confirmDelete', { count: selected.size })
                : bulkAction === 'sold_out'
                ? t('events.confirmSoldOut', { count: selected.size })
                : bulkAction === 'cancelled'
                ? t('events.confirmCancelled', { count: selected.size })
                : `${selected.size} Event(s) → ${bulkAction === 'activate' ? 'upcoming' : 'past'}`}
            </p>
            <div className="flex gap-3">
              <button onClick={executeBulk} className="flex-1 py-2 rounded-lg bg-orange-500 hover:bg-orange-400 text-white text-sm font-medium transition-colors">
                {t('common.confirm')}
              </button>
              <button onClick={() => setShowConfirm(false)} className="flex-1 py-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 text-sm border border-stone-700 transition-colors">
                {t('common.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-stone-900 rounded-xl border border-stone-800 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"/>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-stone-950/50 border-b border-stone-800">
                <tr>
                  <th className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={events.length > 0 && selected.size === events.length}
                      onChange={toggleSelectAll}
                      className="rounded border-stone-600 bg-stone-800 accent-orange-500"
                    />
                  </th>
                  <th className="px-4 py-3 w-12 text-left text-xs font-medium text-stone-400 uppercase tracking-wider">{t('events.tableImage')}</th>
                  <Th label={t('events.tableName')} col="name" />
                  <Th label={t('events.tableCategory')} col="category" />
                  <Th label={t('events.tableDate')} col="start_date" />
                  <Th label={t('events.tableLocation')} col="location" />
                  <Th label={t('events.tableOrganizer')} />
                  <Th label={t('events.tablePrice')} col="price_value" />
                  <Th label={t('events.tableDifficulty')} />
                  <Th label={t('events.tableStatus')} col="status" />
                  <th className="px-4 py-3 text-left text-xs font-medium text-stone-400 uppercase tracking-wider">{t('events.tableActions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800">
                {events.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="text-center py-12 text-stone-600">
                      {t('events.noEventsFound')}
                    </td>
                  </tr>
                ) : events.map(event => (
                  <tr
                    key={event.id}
                    className={`hover:bg-stone-800/40 transition-colors ${selected.has(event.id) ? 'bg-orange-500/5' : ''}`}
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selected.has(event.id)}
                        onChange={() => toggleSelect(event.id)}
                        className="rounded border-stone-600 bg-stone-800 accent-orange-500"
                      />
                    </td>
                    <td className="px-4 py-3">
                      {event.image ? (
                        <img src={event.image} alt="" className="w-10 h-10 rounded-lg object-cover bg-stone-800"/>
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-stone-800 flex items-center justify-center text-stone-600 text-xs">–</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div>
                          <p className="text-stone-200 text-sm font-medium max-w-[180px] truncate">{event.name}</p>
                          <div className="flex gap-1 mt-0.5">
                            {event.is_new && <span className="text-xs bg-orange-500/20 text-orange-400 px-1.5 rounded">NEU</span>}
                            {event.is_featured && <span className="text-xs bg-yellow-500/20 text-yellow-400 px-1.5 rounded">★</span>}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${CATEGORY_COLORS[event.category] ?? 'bg-stone-700 text-stone-400'}`}>
                        {CATEGORY_LABELS[event.category] ?? event.category}
                      </span>
                      {event.subcategory && (
                        <p className="text-xs text-stone-500 mt-0.5">{event.subcategory}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <p className="text-stone-300 text-sm">{event.start_date}</p>
                      {event.end_date && event.end_date !== event.start_date && (
                        <p className="text-stone-500 text-xs">{t('events.dateTo')} {event.end_date}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-stone-300 text-sm max-w-[140px] truncate">{event.location}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-stone-400 text-sm">{event.organizers?.name ?? event.organizer_id ?? '–'}</p>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-stone-300 text-sm">{event.price ?? (event.price_value ? `€${event.price_value}` : '–')}</span>
                    </td>
                    <td className="px-4 py-3">
                      <DifficultyStars level={event.difficulty} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={event.status} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => onNavigate(`/admin/events/${event.id}/edit`)}
                          className="p-1.5 rounded-lg text-stone-400 hover:text-orange-400 hover:bg-orange-500/10 transition-colors"
                          title={t('events.tooltipEdit')}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
                        </button>
                        <button
                          onClick={() => {
                            setSelected(new Set([event.id]));
                            setBulkAction('delete');
                            setShowConfirm(true);
                          }}
                          className="p-1.5 rounded-lg text-stone-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          title={t('events.tooltipDelete')}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Recent Past footer – only when no status filter */}
        {!loading && !filters.status && recentPast.length > 0 && (
          <div className="border-t border-stone-800">
            <div className="flex items-center justify-between px-4 py-2.5 bg-stone-950/40">
              <span className="text-xs font-medium text-stone-500 uppercase tracking-wider">{t('archive.recentPast')}</span>
              <button
                onClick={() => onNavigate('/admin/past-events')}
                className="text-xs text-stone-500 hover:text-orange-400 transition-colors"
              >
                {pastTotal > 3
                  ? t('archive.moreInArchive', { count: pastTotal - 3 })
                  : t('archive.viewArchive')}
              </button>
            </div>
            {recentPast.map(event => (
              <div key={event.id} className="flex items-center gap-3 px-4 py-2.5 opacity-50 hover:opacity-70 hover:bg-stone-800/30 transition-all border-t border-stone-800/50">
                {event.image
                  ? <img src={event.image} alt="" className="w-8 h-8 rounded-md object-cover bg-stone-800 grayscale flex-shrink-0"/>
                  : <div className="w-8 h-8 rounded-md bg-stone-800 flex-shrink-0"/>}
                <div className="flex-1 min-w-0">
                  <span className="text-stone-400 text-sm truncate block">{event.name}</span>
                  <span className="text-stone-600 text-xs">{event.end_date ?? event.start_date}</span>
                </div>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-stone-700 text-stone-500 flex-shrink-0">past</span>
                <button
                  onClick={() => onNavigate(`/admin/events/${event.id}/edit`)}
                  className="p-1 rounded text-stone-600 hover:text-stone-400 transition-colors flex-shrink-0"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
                  </svg>
                </button>
              </div>
            ))}
            <div className="px-4 py-2.5 border-t border-stone-800/50">
              <button
                onClick={() => onNavigate('/admin/past-events')}
                className="text-xs text-stone-500 hover:text-orange-400 transition-colors"
              >
                {t('archive.viewArchive')}
              </button>
            </div>
          </div>
        )}

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-stone-800">
            <p className="text-stone-500 text-sm">
              {(page - 1) * perPage + 1}–{Math.min(page * perPage, total)} {t('common.of')} {total}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 rounded-lg bg-stone-800 border border-stone-700 text-stone-400 text-sm disabled:opacity-40 hover:bg-stone-700 transition-colors"
              >{t('common.back')}</button>
              <span className="text-stone-400 text-sm px-2">{page} / {totalPages}</span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 rounded-lg bg-stone-800 border border-stone-700 text-stone-400 text-sm disabled:opacity-40 hover:bg-stone-700 transition-colors"
              >{t('common.next')}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}