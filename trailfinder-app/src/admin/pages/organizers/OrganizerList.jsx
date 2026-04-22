// ─── TrailHub Admin – Organizer List ──────────────────────────────────────────
import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { adminFetchOrganizers, adminDeleteOrganizer, adminCountEventsByOrganizer } from '../../services/adminSupabase';
import { ITEMS_PER_PAGE_OPTIONS } from '../../utils/adminConfig';

export default function OrganizerList({ onNavigate, toast }) {
  const { t } = useTranslation();
  const [organizers, setOrganizers] = useState([]);
  const [eventCounts, setEventCounts] = useState({});
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showConfirm, setShowConfirm] = useState(null); // id to delete
  const [perPage, setPerPage] = useState(25);
  const searchTimer = useRef(null);

  const load = async (q = search, p = page, pp = perPage) => {
    setLoading(true);
    try {
      const [{ data, count }, counts] = await Promise.all([
        adminFetchOrganizers({ page: p, perPage: pp, search: q || undefined }),
        adminCountEventsByOrganizer(),
      ]);
      setOrganizers(data);
      setTotal(count);
      setEventCounts(counts);
    } catch (err) {
      toast?.error(t('organizers.errorLoad', { msg: err.message }));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [page, perPage]);

  const handleSearch = (val) => {
    setSearch(val);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => { setPage(1); load(val, 1); }, 300);
  };

  const handleDelete = async (id) => {
    try {
      await adminDeleteOrganizer(id);
      toast?.success(t('organizers.successDelete'));
      setShowConfirm(null);
      load();
    } catch (err) {
      toast?.error(t('organizers.errorDelete', { msg: err.message }));
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / perPage));

  return (
    <div className="p-6 space-y-5 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-100">{t('organizers.title')}</h1>
          <p className="text-stone-500 text-sm mt-0.5">{total} {t('organizers.subtitleTemplate')}</p>
        </div>
        <button
          onClick={() => onNavigate('/admin/organizers/new')}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-400 text-white text-sm font-medium transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
          {t('organizers.newOrganizer')}
        </button>
      </div>

      {/* Search */}
      <div className="bg-stone-900 rounded-xl border border-stone-800 p-4">
        <div className="flex items-center gap-3">
          <input
            type="text"
            placeholder={t('organizers.searchPlaceholder')}
            value={search}
            onChange={e => handleSearch(e.target.value)}
            className="flex-1 max-w-md px-3 py-2 rounded-lg bg-stone-800 border border-stone-700 text-stone-200 text-sm placeholder:text-stone-600 focus:outline-none focus:border-orange-500/50"
          />
          <select
            value={perPage}
            onChange={e => { const pp = Number(e.target.value); setPerPage(pp); setPage(1); load(search, 1, pp); }}
            className="px-3 py-2 rounded-lg bg-stone-800 border border-stone-700 text-stone-300 text-sm focus:outline-none focus:border-orange-500/50"
          >
            {ITEMS_PER_PAGE_OPTIONS.map(n => <option key={n} value={n}>{n} {t('events.perPage')}</option>)}
          </select>
        </div>
      </div>

      {/* Confirm Delete */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-stone-900 border border-stone-700 rounded-xl p-6 max-w-sm w-full mx-4 shadow-2xl">
            <h3 className="text-stone-100 font-semibold mb-2">{t('organizers.confirmDeleteTitle')}</h3>
            <p className="text-stone-400 text-sm mb-5">{t('organizers.confirmDeleteMsg')}</p>
            <div className="flex gap-3">
              <button onClick={() => handleDelete(showConfirm)} className="flex-1 py-2 rounded-lg bg-red-500 hover:bg-red-400 text-white text-sm font-medium transition-colors">{t('common.delete')}</button>
              <button onClick={() => setShowConfirm(null)} className="flex-1 py-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 text-sm border border-stone-700 transition-colors">{t('common.cancel')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-stone-900 rounded-xl border border-stone-800 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-7 h-7 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"/>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-stone-950/50 border-b border-stone-800">
                <tr>
                  {[t('organizers.tableLogo'), t('organizers.tableName'), t('organizers.tableEmail'), t('organizers.tableWebsite'), t('organizers.tableEvents'), t('organizers.tableVerified'), t('organizers.tableActions')].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-stone-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800">
                {organizers.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-12 text-stone-600">{t('organizers.noOrganizers')}</td></tr>
                ) : organizers.map(org => (
                  <tr key={org.id} className="hover:bg-stone-800/40 transition-colors">
                    <td className="px-4 py-3">
                      <div
                        className="organizer-logo-bg w-10 h-10 rounded-full border border-stone-700 flex items-center justify-center flex-shrink-0"
                        style={{ '--org-logo-bg': org.logo_bg_color || 'transparent' }}
                      >
                        {org.logo ? (
                          <img src={org.logo} alt="" className="w-full h-full object-contain p-0.5"/>
                        ) : (
                          <span className="text-stone-500 font-bold text-sm">{org.name?.[0]?.toUpperCase() ?? '?'}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => onNavigate(`/admin/events?organizer_id=${org.id}&organizer_name=${encodeURIComponent(org.name)}`)}
                        className="text-stone-200 text-sm font-medium hover:text-orange-400 transition-colors text-left"
                        title="Events anzeigen"
                      >
                        {org.name}
                      </button>
                      {org.description && <p className="text-stone-500 text-xs mt-0.5 max-w-[180px] truncate">{org.description}</p>}
                    </td>
                    <td className="px-4 py-3 text-stone-400 text-sm">{org.email ?? '–'}</td>
                    <td className="px-4 py-3">
                      {org.website ? (
                        <a href={org.website} target="_blank" rel="noreferrer" className="text-orange-400 hover:text-orange-300 text-sm truncate max-w-[140px] block">
                          {org.website.replace(/^https?:\/\//, '')}
                        </a>
                      ) : <span className="text-stone-600 text-sm">–</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-stone-300 text-sm font-medium">{eventCounts[org.id] ?? 0}</span>
                    </td>
                    <td className="px-4 py-3">
                      {org.verified ? (
                        <span className="inline-flex items-center gap-1 text-xs text-green-400"><span>✓</span>{t('organizers.verifiedBadge')}</span>
                      ) : (
                        <span className="text-xs text-stone-600">–</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => onNavigate(`/admin/organizers/${org.id}/edit`)}
                          className="p-1.5 rounded-lg text-stone-400 hover:text-orange-400 hover:bg-orange-500/10 transition-colors"
                          title={t('organizers.tooltipEdit')}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
                        </button>
                        <button
                          onClick={() => setShowConfirm(org.id)}
                          className="p-1.5 rounded-lg text-stone-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          title={t('organizers.tooltipDelete')}
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

        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-stone-800">
            <p className="text-stone-500 text-sm">{(page - 1) * perPage + 1}–{Math.min(page * perPage, total)} {t('common.of')} {total}</p>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 rounded-lg bg-stone-800 border border-stone-700 text-stone-400 text-sm disabled:opacity-40 hover:bg-stone-700 transition-colors">{t('common.back')}</button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1.5 rounded-lg bg-stone-800 border border-stone-700 text-stone-400 text-sm disabled:opacity-40 hover:bg-stone-700 transition-colors">{t('common.next')}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}