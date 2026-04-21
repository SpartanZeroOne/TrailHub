// ─── TrailHub Admin – Past Events Archive ──────────────────────────────────────
import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { adminFetchArchivedEvents, adminRenewEvent } from '../../services/adminSupabase';
import { CATEGORIES, ITEMS_PER_PAGE_OPTIONS } from '../../utils/adminConfig';

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

function SortIcon({ active, dir }) {
  if (!active) return <span className="text-stone-600 ml-1">↕</span>;
  return <span className="text-orange-400 ml-1">{dir === 'asc' ? '↑' : '↓'}</span>;
}

export default function PastEvents({ onNavigate, toast }) {
  const { t } = useTranslation();
  const [events, setEvents] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const [sortBy, setSortBy] = useState('end_date');
  const [sortDir, setSortDir] = useState('desc');
  const [filters, setFilters] = useState({ category: '', search: '' });
  const [renewingId, setRenewingId] = useState(null);
  const [confirmRenew, setConfirmRenew] = useState(null);
  const searchTimer = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, count } = await adminFetchArchivedEvents({
        page, perPage, sortBy, sortDir,
        category: filters.category || undefined,
        search: filters.search || undefined,
      });
      setEvents(data);
      setTotal(count);
    } catch (err) {
      toast?.error(t('events.errorLoad', { msg: err.message }));
    } finally {
      setLoading(false);
    }
  }, [page, perPage, sortBy, sortDir, filters]);

  useEffect(() => { load(); }, [load]);

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

  const handleRenew = async (event) => {
    setConfirmRenew(null);
    setRenewingId(event.id);
    try {
      const newEvent = await adminRenewEvent(event.id);
      toast?.success(t('archive.renewSuccess'));
      onNavigate(`/admin/events/${newEvent.id}/edit`);
    } catch (err) {
      toast?.error(t('archive.renewError', { msg: err.message }));
    } finally {
      setRenewingId(null);
    }
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
          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigate('/admin/events')}
              className="text-stone-500 hover:text-orange-400 transition-colors"
              title={t('common.back')}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
              </svg>
            </button>
            <h1 className="text-2xl font-bold text-stone-100">{t('archive.title')}</h1>
          </div>
          <p className="text-stone-500 text-sm mt-0.5 ml-8">{t('archive.subtitle', { count: total })}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-stone-900 rounded-xl border border-stone-800 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <input
            type="text"
            placeholder={t('events.searchPlaceholder')}
            onChange={e => handleSearchChange(e.target.value)}
            className="px-3 py-2 rounded-lg bg-stone-800 border border-stone-700 text-stone-200 text-sm placeholder:text-stone-600 focus:outline-none focus:border-orange-500/50"
          />
          <select
            value={filters.category}
            onChange={e => { setFilters(f => ({ ...f, category: e.target.value })); setPage(1); }}
            className="px-3 py-2 rounded-lg bg-stone-800 border border-stone-700 text-stone-300 text-sm focus:outline-none focus:border-orange-500/50"
          >
            <option value="">{t('events.allCategories')}</option>
            {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
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

      {/* Confirm Renew Dialog */}
      {confirmRenew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-stone-900 border border-stone-700 rounded-xl p-6 max-w-sm w-full mx-4 shadow-2xl">
            <h3 className="text-stone-100 font-semibold mb-2">{t('archive.renewConfirmTitle')}</h3>
            <p className="text-stone-400 text-sm mb-1">
              <span className="text-stone-200 font-medium">{confirmRenew.name}</span>
            </p>
            <p className="text-stone-500 text-sm mb-5">{t('archive.renewConfirmMsg')}</p>
            <div className="flex gap-3">
              <button
                onClick={() => handleRenew(confirmRenew)}
                className="flex-1 py-2 rounded-lg bg-orange-500 hover:bg-orange-400 text-white text-sm font-medium transition-colors"
              >
                {t('archive.renewBtn')}
              </button>
              <button
                onClick={() => setConfirmRenew(null)}
                className="flex-1 py-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 text-sm border border-stone-700 transition-colors"
              >
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
                  <th className="px-4 py-3 w-12 text-left text-xs font-medium text-stone-400 uppercase tracking-wider">{t('events.tableImage')}</th>
                  <Th label={t('events.tableName')} col="name" />
                  <Th label={t('events.tableCategory')} col="category" />
                  <Th label={t('events.tableDate')} col="start_date" />
                  <Th label={t('events.tableLocation')} col="location" />
                  <Th label={t('events.tableOrganizer')} />
                  <Th label={t('events.tablePrice')} col="price_value" />
                  <th className="px-4 py-3 text-left text-xs font-medium text-stone-400 uppercase tracking-wider whitespace-nowrap">{t('events.tableStatus')}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-stone-400 uppercase tracking-wider">{t('events.tableActions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800">
                {events.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-12 text-stone-600">
                      {t('archive.noEvents')}
                    </td>
                  </tr>
                ) : events.map(event => (
                  <tr key={event.id} className="hover:bg-stone-800/30 transition-colors opacity-80">
                    <td className="px-4 py-3">
                      {event.image ? (
                        <img src={event.image} alt="" className="w-10 h-10 rounded-lg object-cover bg-stone-800 grayscale opacity-70"/>
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-stone-800 flex items-center justify-center text-stone-600 text-xs">–</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-stone-400 text-sm font-medium max-w-[180px] truncate">{event.name}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium opacity-60 ${CATEGORY_COLORS[event.category] ?? 'bg-stone-700 text-stone-400'}`}>
                        {CATEGORY_LABELS[event.category] ?? event.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <p className="text-stone-500 text-sm">{event.start_date}</p>
                      {event.end_date && event.end_date !== event.start_date && (
                        <p className="text-stone-600 text-xs">{t('events.dateTo')} {event.end_date}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-stone-500 text-sm max-w-[140px] truncate">{event.location}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-stone-500 text-sm">{event.organizers?.name ?? '–'}</p>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-stone-500 text-sm">{event.price ?? (event.price_value ? `€${event.price_value}` : '–')}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-stone-700 text-stone-400 border border-stone-600">
                        {t('archive.statusPast')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => onNavigate(`/admin/events/${event.id}/edit`)}
                          className="p-1.5 rounded-lg text-stone-500 hover:text-orange-400 hover:bg-orange-500/10 transition-colors"
                          title={t('events.tooltipEdit')}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
                          </svg>
                        </button>
                        <button
                          onClick={() => setConfirmRenew(event)}
                          disabled={renewingId === event.id}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-stone-800 hover:bg-orange-500/15 text-stone-400 hover:text-orange-400 border border-stone-700 hover:border-orange-500/30 text-xs font-medium transition-colors disabled:opacity-40"
                          title={t('archive.renewHelper')}
                        >
                          {renewingId === event.id ? (
                            <span className="w-3.5 h-3.5 border-2 border-orange-400 border-t-transparent rounded-full animate-spin"/>
                          ) : (
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                            </svg>
                          )}
                          {t('archive.renewBtn')}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
