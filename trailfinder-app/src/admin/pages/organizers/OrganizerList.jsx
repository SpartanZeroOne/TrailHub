// ─── TrailHub Admin – Organizer List ──────────────────────────────────────────
import { useState, useEffect, useRef } from 'react';
import { adminFetchOrganizers, adminDeleteOrganizer, adminCountEventsByOrganizer } from '../../services/adminSupabase';

export default function OrganizerList({ onNavigate, toast }) {
  const [organizers, setOrganizers] = useState([]);
  const [eventCounts, setEventCounts] = useState({});
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showConfirm, setShowConfirm] = useState(null); // id to delete
  const searchTimer = useRef(null);
  const perPage = 25;

  const load = async (q = search, p = page) => {
    setLoading(true);
    try {
      const [{ data, count }, counts] = await Promise.all([
        adminFetchOrganizers({ page: p, perPage, search: q || undefined }),
        adminCountEventsByOrganizer(),
      ]);
      setOrganizers(data);
      setTotal(count);
      setEventCounts(counts);
    } catch (err) {
      toast?.error('Laden fehlgeschlagen: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [page]);

  const handleSearch = (val) => {
    setSearch(val);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => { setPage(1); load(val, 1); }, 300);
  };

  const handleDelete = async (id) => {
    try {
      await adminDeleteOrganizer(id);
      toast?.success('Organizer gelöscht.');
      setShowConfirm(null);
      load();
    } catch (err) {
      toast?.error('Löschen fehlgeschlagen: ' + err.message);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / perPage));

  return (
    <div className="p-6 space-y-5 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-100">Organizer</h1>
          <p className="text-stone-500 text-sm mt-0.5">{total} Veranstalter</p>
        </div>
        <button
          onClick={() => onNavigate('/admin/organizers/new')}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-400 text-white text-sm font-medium transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
          Neuer Organizer
        </button>
      </div>

      {/* Search */}
      <div className="bg-stone-900 rounded-xl border border-stone-800 p-4">
        <input
          type="text"
          placeholder="Suche nach Name oder E-Mail..."
          value={search}
          onChange={e => handleSearch(e.target.value)}
          className="w-full max-w-md px-3 py-2 rounded-lg bg-stone-800 border border-stone-700 text-stone-200 text-sm placeholder:text-stone-600 focus:outline-none focus:border-orange-500/50"
        />
      </div>

      {/* Confirm Delete */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-stone-900 border border-stone-700 rounded-xl p-6 max-w-sm w-full mx-4 shadow-2xl">
            <h3 className="text-stone-100 font-semibold mb-2">Organizer löschen?</h3>
            <p className="text-stone-400 text-sm mb-5">Dieser Organizer wird permanent gelöscht. Verknüpfte Events bleiben bestehen.</p>
            <div className="flex gap-3">
              <button onClick={() => handleDelete(showConfirm)} className="flex-1 py-2 rounded-lg bg-red-500 hover:bg-red-400 text-white text-sm font-medium transition-colors">Löschen</button>
              <button onClick={() => setShowConfirm(null)} className="flex-1 py-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 text-sm border border-stone-700 transition-colors">Abbrechen</button>
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
                  {['Logo', 'Name', 'E-Mail', 'Website', 'Events', 'Verifiziert', 'Aktionen'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-stone-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800">
                {organizers.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-12 text-stone-600">Keine Organizer gefunden.</td></tr>
                ) : organizers.map(org => (
                  <tr key={org.id} className="hover:bg-stone-800/40 transition-colors">
                    <td className="px-4 py-3">
                      {org.logo ? (
                        <img src={org.logo} alt="" className="w-10 h-10 rounded-full object-cover border border-stone-700"/>
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-stone-800 flex items-center justify-center text-stone-500 font-bold text-sm">
                          {org.name?.[0]?.toUpperCase() ?? '?'}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-stone-200 text-sm font-medium">{org.name}</p>
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
                        <span className="inline-flex items-center gap-1 text-xs text-green-400"><span>✓</span>Verifiziert</span>
                      ) : (
                        <span className="text-xs text-stone-600">–</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => onNavigate(`/admin/organizers/${org.id}/edit`)}
                          className="p-1.5 rounded-lg text-stone-400 hover:text-orange-400 hover:bg-orange-500/10 transition-colors"
                          title="Bearbeiten"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
                        </button>
                        <button
                          onClick={() => setShowConfirm(org.id)}
                          className="p-1.5 rounded-lg text-stone-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          title="Löschen"
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
            <p className="text-stone-500 text-sm">{(page - 1) * perPage + 1}–{Math.min(page * perPage, total)} von {total}</p>
            <div className="flex gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 rounded-lg bg-stone-800 border border-stone-700 text-stone-400 text-sm disabled:opacity-40 hover:bg-stone-700 transition-colors">← Zurück</button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="px-3 py-1.5 rounded-lg bg-stone-800 border border-stone-700 text-stone-400 text-sm disabled:opacity-40 hover:bg-stone-700 transition-colors">Weiter →</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}