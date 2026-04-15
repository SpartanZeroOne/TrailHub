-- ============================================================
-- Migration 14: Create event-hero storage bucket
-- Run in Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- Create the bucket (public = files are accessible without a signed URL)
insert into storage.buckets (id, name, public)
values ('event-hero', 'event-hero', true)
on conflict (id) do nothing;

-- Public read access (anyone can view uploaded images)
create policy "event_hero_public_read"
  on storage.objects for select
  using (bucket_id = 'event-hero');

-- Authenticated users can upload
create policy "event_hero_authenticated_upload"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'event-hero');

-- Authenticated users can replace / update existing files (upsert)
create policy "event_hero_authenticated_update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'event-hero');

-- Authenticated users can delete their own uploads
create policy "event_hero_authenticated_delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'event-hero');
