-- ─── Migration 03: Bidirektionale Freundschafts-Entfernung ──────────────────
-- Problem:  friends_delete_own erlaubte nur das Löschen wo auth.uid() = user_id.
--           Beim Entfernen eines Freundes schlug die zweite DELETE-Query
--           (user_id = anderer User) lautlos fehl → inkonsistenter Zustand.
-- Lösung:   1. RLS-Policy erweitert (OR friend_id) als Fallback.
--           2. SECURITY DEFINER RPC für atomares, bidirektionales Löschen.

-- ─── 1. RLS Policy fixen ─────────────────────────────────────────────────────
-- Erlaube Löschen wenn der aktuelle User ENTWEDER user_id ODER friend_id ist.
-- Sicher: Ein User kann keine fremden Freundschaften löschen, nur eigene.

drop policy if exists "friends_delete_own" on public.friends;

create policy "friends_delete_own"
    on public.friends for delete
    to authenticated
    using (auth.uid() = user_id OR auth.uid() = friend_id);


-- ─── 2. Atomare RPC: remove_friendship ───────────────────────────────────────
-- SECURITY DEFINER: Läuft mit Superuser-Rechten, prüft Authorization selbst.
-- Eine einzige DELETE-Query löscht BEIDE Richtungen in einer Transaction.
-- Verhindert teilweise Löschungen (race conditions, Netzwerkfehler).

create or replace function public.remove_friendship(
    p_user_id   uuid,
    p_friend_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
    -- Sicherheitsprüfung: Nur einer der beiden Beteiligten darf löschen
    if auth.uid() != p_user_id and auth.uid() != p_friend_id then
        raise exception 'Not authorized to remove this friendship'
            using errcode = 'insufficient_privilege';
    end if;

    -- Beide Richtungen in einer einzigen atomaren Operation löschen
    delete from public.friends
    where (user_id = p_user_id  and friend_id = p_friend_id)
       or (user_id = p_friend_id and friend_id = p_user_id);
end;
$$;

-- Ausführungsrecht nur für eingeloggte User
revoke all on function public.remove_friendship(uuid, uuid) from public;
grant execute on function public.remove_friendship(uuid, uuid) to authenticated;


-- ─── ANLEITUNG ────────────────────────────────────────────────────────────────
-- Dieses Script im Supabase Dashboard unter SQL Editor ausführen:
-- https://supabase.com/dashboard/project/<project-id>/sql/new
-- Oder via CLI: supabase db push (falls Migrationen konfiguriert)