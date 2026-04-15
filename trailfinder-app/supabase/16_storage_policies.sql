-- ============================================================
-- Migration 16: Storage RLS policies for organizer-logos
--               and event-heros buckets
-- Run in Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- ── organizer-logos ──────────────────────────────────────────
create policy "organizer_logos_public_read"
  on storage.objects for select
  using (bucket_id = 'organizer-logos');

create policy "organizer_logos_authenticated_upload"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'organizer-logos');

create policy "organizer_logos_authenticated_update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'organizer-logos');

create policy "organizer_logos_authenticated_delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'organizer-logos');

-- ── event-heros ──────────────────────────────────────────────
create policy "event_heros_public_read"
  on storage.objects for select
  using (bucket_id = 'event-heros');

create policy "event_heros_authenticated_upload"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'event-heros');

create policy "event_heros_authenticated_update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'event-heros');

create policy "event_heros_authenticated_delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'event-heros');
