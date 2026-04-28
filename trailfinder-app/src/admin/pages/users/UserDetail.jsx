// ─── TrailHub Admin – User Detail ─────────────────────────────────────────────
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { adminFetchUserById, adminUpdateUser, adminDeleteUser, adminUpdateUserRole, adminFetchOrganizers, adminFetchUserFriends } from '../../services/adminSupabase';
import { supabase } from '../../../services/supabaseClient';

export default function UserDetail({ userId, onNavigate, toast }) {
  const { t } = useTranslation();
  const [user, setUser] = useState(null);
  const [registeredEvents, setRegisteredEvents] = useState([]);
  const [favoriteEvents, setFavoriteEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('profile');
  const [note, setNote] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  // Role assignment state
  const [organizers, setOrganizers] = useState([]);
  const [selectedOrganizerId, setSelectedOrganizerId] = useState('');
  const [isSuperAdminCheck, setIsSuperAdminCheck] = useState(false);
  const [roleSaving, setRoleSaving] = useState(false);

  // Friends tab state — loaded lazily on first tab visit
  const [friends, setFriends] = useState([]);
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [friendsLoaded, setFriendsLoaded] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      adminFetchUserById(userId),
      adminFetchOrganizers({ perPage: 100 }),
    ]).then(async ([u, { data: orgs }]) => {
        setUser(u);
        setNote(u?.admin_note ?? '');
        setOrganizers(orgs ?? []);
        setSelectedOrganizerId(u?.organizer_id ?? '');
        setIsSuperAdminCheck(u?.admin_role === 'super_admin');
        // Fetch ALL registered events directly by ID (includes past + flexible)
        if (u?.registered_event_ids?.length) {
          const { data: evData } = await supabase
            .from('events')
            .select('id, name, start_date, end_date, location, image, is_flexible_date, status')
            .in('id', u.registered_event_ids)
            .order('start_date', { ascending: false, nullsFirst: false });
          setRegisteredEvents(evData ?? []);
        }
        // Fetch favorite events by IDs directly
        if (u?.favorite_event_ids?.length) {
          const { data: favData } = await supabase
            .from('events')
            .select('id, name, start_date, location, image')
            .in('id', u.favorite_event_ids);
          setFavoriteEvents(favData ?? []);
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
    setSaving(true);
    try {
      const redirectTo = `${window.location.origin}/reset-password`;
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, { redirectTo });
      if (error) throw error;
      toast?.success(t('userDetail.successPasswordReset'));
    } catch (err) {
      toast?.error(t('userDetail.errorGeneric', { msg: err.message }));
    } finally {
      setSaving(false);
    }
  };

  const handleCopyId = () => {
    navigator.clipboard.writeText(user.id).then(() => {
      setCopiedId(true);
      toast?.success(t('userDetail.copiedToClipboard'));
      setTimeout(() => setCopiedId(false), 2000);
    });
  };

  const handleAssignRole = async () => {
    setRoleSaving(true);
    try {
      const newRole = isSuperAdminCheck ? 'super_admin' : (selectedOrganizerId ? 'organizer' : 'user');
      const expectedOrgId = selectedOrganizerId || null;
      const updated = await adminUpdateUserRole(userId, newRole, expectedOrgId);
      if (updated.admin_role !== newRole || (updated.organizer_id ?? null) !== expectedOrgId) {
        throw new Error('Änderung nicht gespeichert – RLS-Richtlinie blockiert das Update. Bitte SQL-Policy prüfen.');
      }
      setUser(updated);
      setSelectedOrganizerId(updated.organizer_id ?? '');
      setIsSuperAdminCheck(updated.admin_role === 'super_admin');
      toast?.success(t('userDetail.roleAssigned'));
    } catch (err) {
      toast?.error(err.message);
    } finally {
      setRoleSaving(false);
    }
  };

  useEffect(() => {
    if (tab !== 'friends' || friendsLoaded) return;
    setFriendsLoading(true);
    adminFetchUserFriends(userId)
      .then(data => { setFriends(data); setFriendsLoaded(true); })
      .catch(err => toast?.error('Freunde laden fehlgeschlagen: ' + err.message))
      .finally(() => setFriendsLoading(false));
  }, [tab, userId, friendsLoaded]); // eslint-disable-line

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
    { id: 'profile',  label: t('userDetail.tabProfile') },
    { id: 'activity', label: `${t('userDetail.tabActivity')} (${(user.registered_event_ids ?? []).length})` },
    { id: 'friends',  label: friendsLoaded ? `${t('userDetail.tabFriends')} (${friends.length})` : t('userDetail.tabFriends') },
    { id: 'admin',    label: t('userDetail.tabAdmin') },
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
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: t('userDetail.statEventRegistrations'), value: (user.registered_event_ids ?? []).length },
          { label: t('userDetail.statFavorites'), value: (user.favorite_event_ids ?? []).length },
        ].map(s => (
          <div key={s.label} className="bg-stone-900 rounded-xl border border-stone-800 p-4 text-center">
            <p className="text-2xl font-bold text-stone-100">{s.value}</p>
            <p className="text-stone-500 text-xs mt-1">{s.label}</p>
          </div>
        ))}
        {/* Copyable User ID */}
        <button
          onClick={handleCopyId}
          title={t('userDetail.clickToCopy')}
          className="bg-stone-900 rounded-xl border border-stone-800 p-4 text-center cursor-pointer hover:border-orange-500/40 transition-colors group relative"
        >
          <p className="text-2xl font-bold text-stone-100 group-hover:text-orange-400 transition-colors">
            {user.id?.slice(0, 8)}…
          </p>
          <p className="text-stone-500 text-xs mt-1 flex items-center justify-center gap-1">
            {copiedId ? (
              <><svg className="w-3 h-3 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>
              <span className="text-green-400">{t('userDetail.copied')}</span></>
            ) : (
              <><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
              {t('userDetail.statUserId')}</>
            )}
          </p>
        </button>
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
                {registeredEvents.map(e => {
                  const isPast = e.status === 'past' || (!e.is_flexible_date && e.start_date && e.start_date < new Date().toISOString().split('T')[0]);
                  const confirmed = (user.flex_confirmed_dates ?? {})[String(e.id)];
                  const dateLabel = e.is_flexible_date
                    ? confirmed?.start
                      ? `📅 ${formatDate(confirmed.start)}${confirmed.end && confirmed.end !== confirmed.start ? ` – ${formatDate(confirmed.end)}` : ''}`
                      : '📅 Flexibles Datum'
                    : e.start_date
                      ? `${formatDate(e.start_date)}${e.end_date && e.end_date !== e.start_date ? ` – ${formatDate(e.end_date)}` : ''}`
                      : '–';
                  return (
                    <div key={e.id} className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${isPast ? 'bg-stone-800/50 opacity-60' : 'bg-stone-800 hover:bg-stone-700'}`}>
                      {e.image && <img src={e.image} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0"/>}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-stone-200 text-sm font-medium truncate">{e.name}</p>
                          {e.is_flexible_date && <span className="text-xs px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-400 border border-blue-500/20 flex-shrink-0">Flex</span>}
                          {isPast && <span className="text-xs px-1.5 py-0.5 rounded bg-stone-700 text-stone-500 flex-shrink-0">Past</span>}
                        </div>
                        <p className="text-stone-500 text-xs mt-0.5">{dateLabel} · {e.location ?? '–'}</p>
                      </div>
                      <button
                        onClick={() => onNavigate(`/admin/events/${e.id}/edit`)}
                        className="text-orange-400 hover:text-orange-300 text-xs flex-shrink-0"
                      >
                        {t('userDetail.openLink')}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="pt-4 border-t border-stone-800">
              <h2 className="text-stone-300 font-semibold mb-3">{t('userDetail.sectionFavorites')} ({(user.favorite_event_ids ?? []).length})</h2>
              {favoriteEvents.length === 0
                ? <p className="text-stone-600 text-sm">{t('userDetail.noFavorites')}</p>
                : (
                  <div className="space-y-2">
                    {favoriteEvents.map(e => (
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
                )
              }
            </div>
          </div>
        )}

        {/* Friends Tab */}
        {tab === 'friends' && (
          <div className="space-y-4">
            <h2 className="text-stone-300 font-semibold">
              {t('userDetail.sectionFriends')}{friendsLoaded ? ` (${friends.length})` : ''}
            </h2>
            {friendsLoading ? (
              <div className="flex items-center justify-center h-20">
                <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"/>
              </div>
            ) : friends.length === 0 ? (
              <p className="text-stone-600 text-sm">{t('userDetail.noFriends')}</p>
            ) : (
              <div className="space-y-2">
                {friends.map(f => (
                  <div key={f.id} className="flex items-center gap-3 p-3 rounded-lg bg-stone-800 hover:bg-stone-700 transition-colors">
                    {f.avatar
                      ? <img src={f.avatar} alt="" className="w-9 h-9 rounded-full object-cover flex-shrink-0 border border-stone-700"/>
                      : <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                          {f.name?.[0]?.toUpperCase() ?? '?'}
                        </div>
                    }
                    <div className="flex-1 min-w-0">
                      <p className="text-stone-200 text-sm font-medium truncate">{f.name ?? '–'}</p>
                      <p className="text-stone-500 text-xs">{f.email} · {(f.registered_event_ids ?? []).length} Events</p>
                    </div>
                    <button
                      onClick={() => onNavigate(`/admin/users/${f.id}`)}
                      className="text-orange-400 hover:text-orange-300 text-xs flex-shrink-0"
                    >
                      {t('userDetail.openLink')}
                    </button>
                  </div>
                ))}
              </div>
            )}
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

            {/* Organizer-Zuweisung */}
            <div className="border-t border-stone-800 pt-4 space-y-3">
              <h3 className="text-stone-400 text-sm font-medium">{t('userDetail.organizerAssignment')}</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-stone-500 mb-1.5">{t('userDetail.selectOrganizer')}</label>
                  <select
                    value={selectedOrganizerId}
                    onChange={e => setSelectedOrganizerId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-stone-800 border border-stone-700 text-stone-300 text-sm focus:outline-none focus:border-orange-500/50"
                  >
                    <option value="">{t('userDetail.noOrganizer')}</option>
                    {organizers.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                  </select>
                </div>
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isSuperAdminCheck}
                    onChange={e => setIsSuperAdminCheck(e.target.checked)}
                    className="w-4 h-4 rounded border-stone-600 bg-stone-800 accent-orange-500"
                  />
                  <span className="text-sm text-stone-300">{t('userDetail.superAdminRights')}</span>
                </label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleAssignRole}
                    disabled={roleSaving}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500/20 border border-blue-500/30 text-blue-300 text-sm hover:bg-blue-500/30 disabled:opacity-50 transition-colors"
                  >
                    {roleSaving && <span className="w-3 h-3 border-2 border-blue-300 border-t-transparent rounded-full animate-spin"/>}
                    {t('userDetail.linkAsOrganizer')}
                  </button>
                  {user?.organizer_id && (
                    <span className="text-xs text-stone-500">
                      {t('userDetail.currentRole')}: <span className="text-orange-400">{user.admin_role}</span>
                    </span>
                  )}
                </div>
              </div>
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