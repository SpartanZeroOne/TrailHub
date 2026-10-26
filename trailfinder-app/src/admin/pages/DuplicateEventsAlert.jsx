// ─── TrailHub Admin – Possible Duplicate Events Alert ─────────────────────────
// Exact duplicates are blocked by DB index unique_event_idx; this lists events that
// share name + start date across organizers/categories so an admin can review them.
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { adminFetchSimilarEvents, adminDeleteEvent } from '../services/adminSupabase';

export default function DuplicateEventsAlert({ onNavigate, toast }) {
  const { t } = useTranslation();
  const [groups, setGroups] = useState([]);

  const load = () => adminFetchSimilarEvents().then(setGroups).catch(() => {});
  useEffect(() => { load(); }, []);

  // ponytail: native confirm(); swap for the EventList modal if it needs styling
  const handleDelete = async (event) => {
    if (!window.confirm(t('dashboard.duplicatesDeleteConfirm', { name: event.name, id: event.id }))) return;
    try {
      await adminDeleteEvent(event.id);
      toast?.success(t('dashboard.duplicatesDeleted'));
      load();
    } catch (err) {
      toast?.error(t('dashboard.duplicatesDeleteError', { msg: err.message }));
    }
  };

  if (groups.length === 0) return null;

  return (
    <div className="bg-amber-500/10 rounded-xl border border-amber-500/40 p-5" role="alert">
      <div className="flex items-center gap-2 mb-1">
        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-500 text-stone-950">{groups.length}</span>
        <h2 className="text-amber-300 font-semibold">{t('dashboard.duplicatesTitle')}</h2>
      </div>
      <p className="text-stone-400 text-sm mb-4">{t('dashboard.duplicatesSubtitle', { count: groups.length })}</p>
      <div className="space-y-3">
        {groups.map(group => (
          <div key={group[0].id} className="bg-stone-900 rounded-lg border border-stone-800 divide-y divide-stone-800">
            {group.map(e => (
              <div key={e.id} className="flex items-center gap-3 px-3 py-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-stone-200 truncate">{e.name} <span className="text-stone-600">#{e.id}</span></p>
                  <p className="text-xs text-stone-500 truncate">
                    {e.start_date} · {e.category ?? '–'} · {e.organizers?.name ?? e.organizer_id ?? '–'} · {e.status}
                  </p>
                </div>
                <button
                  onClick={() => onNavigate(`/admin/events/${e.id}/edit`)}
                  className="p-1.5 rounded-lg text-stone-500 hover:text-orange-400 hover:bg-orange-500/10 transition-colors"
                  title={t('events.tooltipEdit')}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
                  </svg>
                </button>
                <button
                  onClick={() => handleDelete(e)}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-medium border bg-stone-800 border-stone-700 text-stone-400 hover:text-red-400 hover:border-red-500/40 hover:bg-red-500/10 transition-colors"
                >
                  {t('dashboard.duplicatesDelete')}
                </button>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
