// ─── TrailHub Admin – Event List ──────────────────────────────────────────────
import { useState, useEffect, useCallback, useRef } from 'react';
import { adminFetchEvents, adminBulkUpdateEvents, adminBulkDeleteEvents } from '../../services/adminSupabase';
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

export default function EventList({ onNavigate, toast }) {
  const [events, setEvents] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(25);
  const [sortBy, setSortBy] = useState('start_date');
  const [sortDir, setSortDir] = useState('asc');
  const [filters, setFilters] = useState({ category: '', status: '', organizerId: '', search: '' });
  const [selected, setSelected] = useState(new Set());
  const [bulkAction, setBulkAction] = useState('');
  const [bulkLoading, setBulkLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
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
      });
      setEvents(data);
      setTotal(count);
      setSelected(new Set());
    } catch (err) {
      toast?.error('Laden fehlgeschlagen: ' + err.message);
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
        toast?.success(`${ids.length} Event(s) gelöscht.`);
      } else if (bulkAction === 'activate') {
        await adminBulkUpdateEvents(ids, { status: 'upcoming' });
        toast?.success(`${ids.length} Event(s) auf "upcoming" gesetzt.`);
      } else if (bulkAction === 'deactivate') {
        await adminBulkUpdateEvents(ids, { status: 'past' });
        toast?.success(`${ids.length} Event(s) auf "past" gesetzt.`);
      } else if (bulkAction === 'sold_out') {
        await adminBulkUpdateEvents(ids, { status: 'sold_out' });
        toast?.success(`${ids.length} Event(s) als "Ausverkauft" markiert.`);
      } else if (bulkAction === 'cancelled') {
        await adminBulkUpdateEvents(ids, { status: 'cancelled' });
        toast?.success(`${ids.length} Event(s) als "Abgesagt" markiert.`);
      }
      setBulkAction('');
      load();
    } catch (err) {
      toast?.error('Bulk-Aktion fehlgeschlagen: ' + err.message);
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
          <h1 className="text-2xl font-bold text-stone-100">Events</h1>
          <p className="text-stone-500 text-sm mt-0.5">{total} Events gesamt</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={exportCSV} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 text-sm border border-stone-700 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
            CSV Export
          </button>
          <button
            onClick={() => onNavigate('/admin/events/new')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-400 text-white text-sm font-medium transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
            Neues Event
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-stone-900 rounded-xl border border-stone-800 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <input
            type="text"
            placeholder="Suche nach Name, Ort..."
            defaultValue={filters.search}
            onChange={e => handleSearchChange(e.target.value)}
            className="px-3 py-2 rounded-lg bg-stone-800 border border-stone-700 text-stone-200 text-sm placeholder:text-stone-600 focus:outline-none focus:border-orange-500/50"
          />
          <select
            value={filters.category}
            onChange={e => handleFilterChange('category', e.target.value)}
            className="px-3 py-2 rounded-lg bg-stone-800 border border-stone-700 text-stone-300 text-sm focus:outline-none focus:border-orange-500/50"
          >
            <option value="">Alle Kategorien</option>
            {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
          <select
            value={filters.status}
            onChange={e => handleFilterChange('status', e.target.value)}
            className="px-3 py-2 rounded-lg bg-stone-800 border border-stone-700 text-stone-300 text-sm focus:outline-none focus:border-orange-500/50"
          >
            <option value="">Alle Status</option>
            {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <select
            value={perPage}
            onChange={e => { setPerPage(Number(e.target.value)); setPage(1); }}
            className="px-3 py-2 rounded-lg bg-stone-800 border border-stone-700 text-stone-300 text-sm focus:outline-none focus:border-orange-500/50"
          >
            {ITEMS_PER_PAGE_OPTIONS.map(n => <option key={n} value={n}>{n} pro Seite</option>)}
          </select>
        </div>
      </div>

      {/* Bulk Actions */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
          <span className="text-orange-400 text-sm font-medium">{selected.size} ausgewählt</span>
          <select
            value={bulkAction}
            onChange={e => setBulkAction(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-stone-800 border border-stone-700 text-stone-300 text-sm focus:outline-none"
          >
            <option value="">Aktion wählen...</option>
            <option value="activate">Aktivieren (upcoming)</option>
            <option value="deactivate">Deaktivieren (past)</option>
            <option value="sold_out">Als Ausverkauft markieren</option>
            <option value="cancelled">Als Abgesagt markieren</option>
            <option value="delete">Löschen</option>
          </select>
          <button
            onClick={() => { if (bulkAction) setShowConfirm(true); }}
            disabled={!bulkAction || bulkLoading}
            className="px-3 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-400 text-white text-sm font-medium disabled:opacity-40 transition-colors"
          >
            Ausführen
          </button>
          <button onClick={() => setSelected(new Set())} className="text-stone-500 hover:text-stone-300 text-sm ml-auto">
            Auswahl aufheben
          </button>
        </div>
      )}

      {/* Confirm Dialog */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-stone-900 border border-stone-700 rounded-xl p-6 max-w-sm w-full mx-4 shadow-2xl">
            <h3 className="text-stone-100 font-semibold mb-2">Aktion bestätigen</h3>
            <p className="text-stone-400 text-sm mb-5">
              {bulkAction === 'delete'
                ? `${selected.size} Event(s) endgültig löschen?`
                : bulkAction === 'sold_out'
                ? `${selected.size} Event(s) als "Ausverkauft" markieren?`
                : bulkAction === 'cancelled'
                ? `${selected.size} Event(s) als "Abgesagt" markieren?`
                : `${selected.size} Event(s) auf "${bulkAction === 'activate' ? 'upcoming' : 'past'}" setzen?`}
            </p>
            <div className="flex gap-3">
              <button onClick={executeBulk} className="flex-1 py-2 rounded-lg bg-orange-500 hover:bg-orange-400 text-white text-sm font-medium transition-colors">
                Bestätigen
              </button>
              <button onClick={() => setShowConfirm(false)} className="flex-1 py-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 text-sm border border-stone-700 transition-colors">
                Abbrechen
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
                  <th className="px-4 py-3 w-12 text-left text-xs font-medium text-stone-400 uppercase tracking-wider">Bild</th>
                  <Th label="Name" col="name" />
                  <Th label="Kategorie" col="category" />
                  <Th label="Datum" col="start_date" />
                  <Th label="Ort" col="location" />
                  <Th label="Organizer" />
                  <Th label="Preis" col="price_value" />
                  <Th label="Schwierigkeit" />
                  <Th label="Status" col="status" />
                  <th className="px-4 py-3 text-left text-xs font-medium text-stone-400 uppercase tracking-wider">Aktionen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800">
                {events.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="text-center py-12 text-stone-600">
                      Keine Events gefunden.
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
                        <p className="text-stone-500 text-xs">bis {event.end_date}</p>
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
                          title="Bearbeiten"
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

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-stone-800">
            <p className="text-stone-500 text-sm">
              {(page - 1) * perPage + 1}–{Math.min(page * perPage, total)} von {total}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 rounded-lg bg-stone-800 border border-stone-700 text-stone-400 text-sm disabled:opacity-40 hover:bg-stone-700 transition-colors"
              >← Zurück</button>
              <span className="text-stone-400 text-sm px-2">{page} / {totalPages}</span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 rounded-lg bg-stone-800 border border-stone-700 text-stone-400 text-sm disabled:opacity-40 hover:bg-stone-700 transition-colors"
              >Weiter →</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}