// ─── TrailHub Admin – User List ───────────────────────────────────────────────
import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { adminFetchUsers, adminUpdateUser } from '../../services/adminSupabase';

export default function UserList({ onNavigate, toast }) {
  const { t } = useTranslation();
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [minReg, setMinReg] = useState('');
  const [selected, setSelected] = useState(new Set());
  const [bulkAction, setBulkAction] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const searchTimer = useRef(null);
  const perPage = 25;

  const load = async (q = search, p = page, mr = minReg) => {
    setLoading(true);
    try {
      const { data, count } = await adminFetchUsers({
        page: p, perPage, search: q || undefined,
        minRegistrations: mr ? Number(mr) : undefined,
      });
      setUsers(data);
      setTotal(count);
      setSelected(new Set());
    } catch (err) {
      toast?.error(t('users.errorLoad', { msg: err.message }));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [page]);

  const handleSearchChange = (val) => {
    setSearch(val);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => { setPage(1); load(val, 1, minReg); }, 300);
  };

  const handleFilter = () => { setPage(1); load(search, 1, minReg); };

  const toggleSelect = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === users.length) setSelected(new Set());
    else setSelected(new Set(users.map(u => u.id)));
  };

  const executeBulk = async () => {
    setShowConfirm(false);
    const ids = Array.from(selected);
    try {
      if (bulkAction === 'block') {
        for (const id of ids) await adminUpdateUser(id, { is_blocked: true });
        toast?.success(`${ids.length} ${t('userDetail.successLock')}`);
      } else if (bulkAction === 'unblock') {
        for (const id of ids) await adminUpdateUser(id, { is_blocked: false });
        toast?.success(`${ids.length} ${t('userDetail.successUnlock')}`);
      }
      setBulkAction('');
      load();
    } catch (err) {
      toast?.error('Bulk-Aktion fehlgeschlagen: ' + err.message);
    }
  };

  const formatDate = (d) => {
    if (!d) return '–';
    return new Date(d).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const totalPages = Math.max(1, Math.ceil(total / perPage));

  return (
    <div className="p-6 space-y-5 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-100">{t('users.title')}</h1>
          <p className="text-stone-500 text-sm mt-0.5">{total} {t('users.subtitleTemplate')}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-stone-900 rounded-xl border border-stone-800 p-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder={t('users.searchPlaceholder')}
              value={search}
              onChange={e => handleSearchChange(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-stone-800 border border-stone-700 text-stone-200 text-sm placeholder:text-stone-600 focus:outline-none focus:border-orange-500/50"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-stone-500 text-sm whitespace-nowrap">{t('users.minRegistrations')}</span>
            <input
              type="number"
              value={minReg}
              onChange={e => setMinReg(e.target.value)}
              placeholder={t('users.minRegistrationsPlaceholder')}
              min={0}
              className="w-20 px-3 py-2 rounded-lg bg-stone-800 border border-stone-700 text-stone-200 text-sm focus:outline-none focus:border-orange-500/50"
            />
          </div>
          <button
            onClick={handleFilter}
            className="px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-400 text-white text-sm font-medium transition-colors"
          >
            {t('users.filter')}
          </button>
        </div>
      </div>

      {/* Bulk */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
          <span className="text-orange-400 text-sm font-medium">{selected.size} {t('common.selected')}</span>
          <select
            value={bulkAction}
            onChange={e => setBulkAction(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-stone-800 border border-stone-700 text-stone-300 text-sm"
          >
            <option value="">{t('common.selectAction')}</option>
            <option value="block">{t('users.bulkLock')}</option>
            <option value="unblock">{t('users.bulkUnlock')}</option>
          </select>
          <button
            onClick={() => { if (bulkAction) setShowConfirm(true); }}
            disabled={!bulkAction}
            className="px-3 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-400 text-white text-sm disabled:opacity-40 transition-colors"
          >{t('common.execute')}</button>
          <button onClick={() => setSelected(new Set())} className="text-stone-500 hover:text-stone-300 text-sm ml-auto">{t('common.deselectAll')}</button>
        </div>
      )}

      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-stone-900 border border-stone-700 rounded-xl p-6 max-w-sm w-full mx-4 shadow-2xl">
            <h3 className="text-stone-100 font-semibold mb-2">{t('users.confirmTitle')}</h3>
            <p className="text-stone-400 text-sm mb-5">{t('users.confirmBulkAction', { count: selected.size })}</p>
            <div className="flex gap-3">
              <button onClick={executeBulk} className="flex-1 py-2 rounded-lg bg-orange-500 hover:bg-orange-400 text-white text-sm">{t('common.confirm')}</button>
              <button onClick={() => setShowConfirm(false)} className="flex-1 py-2 rounded-lg bg-stone-800 text-stone-300 border border-stone-700 text-sm">{t('common.cancel')}</button>
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
                  <th className="px-4 py-3">
                    <input type="checkbox" checked={users.length > 0 && selected.size === users.length} onChange={toggleAll} className="rounded border-stone-600 bg-stone-800 accent-orange-500" />
                  </th>
                  {[t('users.tableAvatar'), t('users.tableName'), t('users.tableEmail'), t('users.tableLocation'), t('users.tableEvents'), t('users.tableFriends'), t('users.tableRegistered'), t('users.tableStatus'), t('users.tableActions')].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-stone-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800">
                {users.length === 0 ? (
                  <tr><td colSpan={10} className="text-center py-12 text-stone-600">{t('users.noUsers')}</td></tr>
                ) : users.map(user => (
                  <tr key={user.id} className={`hover:bg-stone-800/40 transition-colors ${selected.has(user.id) ? 'bg-orange-500/5' : ''}`}>
                    <td className="px-4 py-3">
                      <input type="checkbox" checked={selected.has(user.id)} onChange={() => toggleSelect(user.id)} className="rounded border-stone-600 bg-stone-800 accent-orange-500" />
                    </td>
                    <td className="px-4 py-3">
                      {user.avatar
                        ? <img src={user.avatar} alt="" className="w-9 h-9 rounded-full object-cover border border-stone-700"/>
                        : <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center text-white text-sm font-bold">
                            {user.name?.[0]?.toUpperCase() ?? '?'}
                          </div>
                      }
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-stone-200 text-sm font-medium">{user.name ?? '–'}</p>
                      {user.main_bike && <p className="text-stone-500 text-xs mt-0.5">🏍 {user.main_bike}</p>}
                    </td>
                    <td className="px-4 py-3 text-stone-400 text-sm">{user.email ?? '–'}</td>
                    <td className="px-4 py-3 text-stone-400 text-sm max-w-[120px] truncate">{user.location ?? '–'}</td>
                    <td className="px-4 py-3">
                      <span className="text-stone-300 text-sm font-medium">{(user.registered_event_ids ?? []).length}</span>
                    </td>
                    <td className="px-4 py-3 text-stone-400 text-sm">
                      {user.friend_ids?.length ?? user.friends_count ?? '–'}
                    </td>
                    <td className="px-4 py-3 text-stone-500 text-sm whitespace-nowrap">
                      {formatDate(user.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      {user.is_blocked
                        ? <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-red-500/15 text-red-400 border border-red-500/20">{t('users.statusLocked')}</span>
                        : <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-green-500/15 text-green-400 border border-green-500/20">{t('users.statusActive')}</span>
                      }
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => onNavigate(`/admin/users/${user.id}`)}
                        className="p-1.5 rounded-lg text-stone-400 hover:text-orange-400 hover:bg-orange-500/10 transition-colors"
                        title={t('users.tooltipDetails')}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0zm-3-9a9 9 0 100 18A9 9 0 0012 3z"/></svg>
                      </button>
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
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 rounded-lg bg-stone-800 border border-stone-700 text-stone-400 text-sm disabled:opacity-40">{t('common.back')}</button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1.5 rounded-lg bg-stone-800 border border-stone-700 text-stone-400 text-sm disabled:opacity-40">{t('common.next')}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}