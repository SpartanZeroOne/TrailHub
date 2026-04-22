// ─── TrailHub Admin – User Detail ─────────────────────────────────────────────
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { adminFetchUserById, adminUpdateUser, adminDeleteUser, adminFetchEvents } from '../../services/adminSupabase';
import { supabase } from '../../../services/supabaseClient';

export default function UserDetail({ userId, onNavigate, toast }) {
  const { t } = useTranslation();
  const [user, setUser] = useState(null);
  const [registeredEvents, setRegisteredEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('profile');
  const [note, setNote] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLoading(true);
    adminFetchUserById(userId)
      .then(async (u) => {
        setUser(u);
        setNote(u?.admin_note ?? '');
        if (u?.registered_event_ids?.length) {
          const { data } = await adminFetchEvents({ perPage: 100 });
          const registered = data.filter(e => u.registered_event_ids.includes(e.id));
          setRegisteredEvents(registered);
        }
      })
      .catch(err => toast?.error(t('userDetail.errorLoad', { msg: err.message })))
      .finally(() => setLoading(false));
  }, [userId]);

  const handleToggleBlock = async () => {
    setSaving(true);
    try {
      const updated = await adminUpdateUser(userId, { is_blocked: !user.is_blocked });
      setUser(updated);
      toast?.success(updated.is_blocked ? t('userDetail.successLock') : t('userDetail.successUnlock'));
    } catch (err) {
      toast?.error(t('userDetail.errorGeneric', { msg: err.message }));
    } finally {
      setSaving(false);
    }
  };

  const handleSaveNote = async () => {
    setSaving(true);
    try {
      await adminUpdateUser(userId, { admin_note: note });
      toast?.success(t('userDetail.successNote'));
    } catch (err) {
      toast?.error(t('userDetail.errorGeneric', { msg: err.message }));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setSaving(true);
    try {
      await adminDeleteUser(userId);
      toast?.success(t('userDetail.successDelete'));
      onNavigate('/admin/users');
    } catch (err) {
      toast?.error(t('userDetail.errorDelete', { msg: err.message }));
      setSaving(false);
    }
  };

  const handlePasswordReset = async () => {
    try {
      const { error } = await supabase.auth.admin.generateLink({ type: 'recovery', email: user.email });
      if (error) throw error;
      toast?.success(t('userDetail.successPasswordReset'));
    } catch {
      toast?.info(t('userDetail.infoPasswordReset'));
    }
  };

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' }) : '–';

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"/>
    </div>
  );

  if (!user) return (
    <div className="p-6 text-center text-stone-500">
      {t('userDetail.notFound')}
      <button onClick={() => onNavigate('/admin/users')} className="block mx-auto mt-3 text-orange-400 hover:text-orange-300 text-sm">{t('common.back')}</button>
    </div>
  );

  const TABS = [
    { id: 'profile',    label: t('userDetail.tabProfile') },
    { id: 'activity',   label: `${t('userDetail.tabActivity')} (${(user.registered_event_ids ?? []).length})` },
    { id: 'admin',      label: t('userDetail.tabAdmin') },
  ];

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-5">
      {/* Back */}
      <button onClick={() => onNavigate('/admin/users')} className="flex items-center gap-2 text-stone-400 hover:text-orange-400 text-sm transition-colors">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/></svg>
        {t('userDetail.backToUsers')}
      </button>

      {/* Header card */}
      <div className="bg-stone-900 rounded-xl border border-stone-800 p-5">
        <div className="flex items-start gap-4">
          {user.avatar
            ? <img src={user.avatar} alt="" className="w-16 h-16 rounded-full object-cover border-2 border-stone-700"/>
            : <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
                {user.name?.[0]?.toUpperCase() ?? '?'}
              </div>
          }
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-stone-100">{user.name ?? t('userDetail.noName')}</h1>
              {user.is_blocked && (
                <span className="px-2 py-0.5 rounded-full text-xs bg-red-500/15 text-red-400 border border-red-500/20">{t('userDetail.statusLocked')}</span>
              )}
            </div>
            <p className="text-stone-400 text-sm mt-0.5">{user.email}</p>
            <div className="flex gap-4 mt-2 text-xs text-stone-500">
              {user.location && <span>📍 {user.location}</span>}
              {user.main_bike && <span>🏍 {user.main_bike}</span>}
              <span>{t('userDetail.registeredAt')} {formatDate(user.created_at)}</span>
            </div>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <button
              onClick={handleToggleBlock}
              disabled={saving}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                user.is_blocked
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30'
                  : 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30'
              }`}
            >
              {user.is_blocked ? t('userDetail.unlock') : t('userDetail.lock')}
            </button>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: t('userDetail.statEventRegistrations'), value: (user.registered_event_ids ?? []).length },
          { label: t('userDetail.statFavorites'), value: (user.favorite_event_ids ?? []).length },
          { label: t('userDetail.statUserId'), value: user.id?.slice(0, 8) + '…' },
        ].map(s => (
          <div key={s.label} className="bg-stone-900 rounded-xl border border-stone-800 p-4 text-center">
            <p className="text-2xl font-bold text-stone-100">{s.value}</p>
            <p className="text-stone-500 text-xs mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-stone-900 p-1 rounded-xl border border-stone-800">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t.id ? 'bg-orange-500 text-white' : 'text-stone-400 hover:text-stone-200'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="bg-stone-900 rounded-xl border border-stone-800 p-5">
        {/* Profile Tab */}
        {tab === 'profile' && (
          <div className="space-y-4">
            <h2 className="text-stone-300 font-semibold">{t('userDetail.sectionProfile')}</h2>
            {[
              { label: t('userDetail.fieldName'), value: user.name },
              { label: t('userDetail.fieldEmail'), value: user.email },
              { label: t('userDetail.fieldLocation'), value: user.location },
              { label: t('userDetail.fieldBike'), value: user.main_bike },
              { label: t('userDetail.fieldBio'), value: user.bio },
            ].map(f => f.value ? (
              <div key={f.label} className="flex gap-4 py-2 border-b border-stone-800 last:border-0">
                <span className="text-stone-500 text-sm w-32 flex-shrink-0">{f.label}</span>
                <span className="text-stone-300 text-sm">{f.value}</span>
              </div>
            ) : null)}
          </div>
        )}

        {/* Activity Tab */}
        {tab === 'activity' && (
          <div className="space-y-4">
            <h2 className="text-stone-300 font-semibold">{t('userDetail.sectionEventReg')} ({registeredEvents.length})</h2>
            {registeredEvents.length === 0 ? (
              <p className="text-stone-600 text-sm">{t('userDetail.noEventReg')}</p>
            ) : (
              <div className="space-y-2">
                {registeredEvents.map(e => (
                  <div key={e.id} className="flex items-center gap-3 p-3 rounded-lg bg-stone-800 hover:bg-stone-700 transition-colors">
                    {e.image && <img src={e.image} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0"/>}
                    <div className="flex-1 min-w-0">
                      <p className="text-stone-200 text-sm font-medium truncate">{e.name}</p>
                      <p className="text-stone-500 text-xs">{e.start_date} · {e.location}</p>
                    </div>
                    <button
                      onClick={() => onNavigate(`/admin/events/${e.id}/edit`)}
                      className="text-orange-400 hover:text-orange-300 text-xs"
                    >
                      {t('userDetail.openLink')}
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-4 border-t border-stone-800">
              <h2 className="text-stone-300 font-semibold mb-3">{t('userDetail.sectionFavorites')} ({(user.favorite_event_ids ?? []).length})</h2>
              {(user.favorite_event_ids ?? []).length === 0
                ? <p className="text-stone-600 text-sm">{t('userDetail.noFavorites')}</p>
                : <p className="text-stone-400 text-sm">{(user.favorite_event_ids ?? []).length} favorisierte Events (IDs: {user.favorite_event_ids?.slice(0, 5).join(', ')}{user.favorite_event_ids?.length > 5 ? '…' : ''})</p>
              }
            </div>
          </div>
        )}

        {/* Admin Actions Tab */}
        {tab === 'admin' && (
          <div className="space-y-5">
            <h2 className="text-stone-300 font-semibold">{t('userDetail.sectionAdminActions')}</h2>

            {/* Internal Note */}
            <div className="space-y-2">
              <label className="block text-sm text-stone-400">{t('userDetail.internalNote')}</label>
              <textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                rows={3}
                placeholder={t('userDetail.internalNotePlaceholder')}
                className="w-full px-3 py-2.5 rounded-lg bg-stone-800 border border-stone-700 text-stone-200 text-sm placeholder:text-stone-600 focus:outline-none focus:border-orange-500/60 resize-y"
              />
              <button onClick={handleSaveNote} disabled={saving} className="px-4 py-2 rounded-lg bg-stone-700 hover:bg-stone-600 text-stone-300 text-sm transition-colors">
                {t('userDetail.saveNote')}
              </button>
            </div>

            <div className="border-t border-stone-800 pt-4 space-y-3">
              <h3 className="text-stone-400 text-sm font-medium">{t('userDetail.sectionActions')}</h3>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={handlePasswordReset}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500/20 border border-blue-500/30 text-blue-300 text-sm hover:bg-blue-500/30 transition-colors"
                >
                  {t('userDetail.resetPassword')}
                </button>
                <button
                  onClick={handleToggleBlock}
                  disabled={saving}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm border transition-colors ${
                    user.is_blocked
                      ? 'bg-green-500/20 border-green-500/30 text-green-300 hover:bg-green-500/30'
                      : 'bg-amber-500/20 border-amber-500/30 text-amber-300 hover:bg-amber-500/30'
                  }`}
                >
                  {user.is_blocked ? t('userDetail.unlockUser') : t('userDetail.lockUser')}
                </button>
              </div>
            </div>

            {/* Danger Zone */}
            <div className="border border-red-500/20 rounded-xl p-4 space-y-3 bg-red-500/5">
              <h3 className="text-red-400 text-sm font-medium">{t('userDetail.dangerZone')}</h3>
              <p className="text-stone-500 text-xs">{t('userDetail.dangerWarning')}</p>
              {!showDeleteConfirm ? (
                <button onClick={() => setShowDeleteConfirm(true)} className="px-4 py-2 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 text-sm hover:bg-red-500/30 transition-colors">
                  {t('userDetail.deleteUser')}
                </button>
              ) : (
                <div className="flex gap-3">
                  <button onClick={handleDelete} disabled={saving} className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-400 text-white text-sm font-medium disabled:opacity-50 transition-colors">
                    {t('userDetail.confirmDelete')}
                  </button>
                  <button onClick={() => setShowDeleteConfirm(false)} className="px-4 py-2 rounded-lg bg-stone-800 text-stone-300 text-sm border border-stone-700 transition-colors">
                    {t('common.cancel')}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}