-- ============================================================
-- TrailFinder – Supabase Schema Migration
-- Ausführen im Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- ─── EXTENSIONS ─────────────────────────────────────────────
create extension if not exists "uuid-ossp";
create extension if not exists "postgis";  -- für Geo-Koordinaten (optional, kann weggelassen werden)

-- ─── TABELLE: organizers ────────────────────────────────────
create table if not exists public.organizers (
    id            text primary key,                    -- z.B. 'rally-masters'
    name          text not null,
    logo          text,
    verified      boolean default false,
    since         integer,                             -- Gründungsjahr
    events_hosted integer default 0,
    rating        numeric(3,1) default 0,
    specialties   text[] default '{}',
    website       text,
    description   text,
    created_at    timestamptz default now()
);

-- ─── TABELLE: events ────────────────────────────────────────
create table if not exists public.events (
    id                 serial primary key,
    name               text not null,
    category           text not null,                  -- 'trail-adventures', 'rallyes', 'adventure-trips', 'skills-camps', 'offroad-festivals'
    subcategory        text,                           -- 'enduro', 'trail', 'mx', etc.
    mx_type            text,                           -- für MX-spezifische Events
    start_date         date not null,
    end_date           date,
    location           text not null,
    coordinates        jsonb,                          -- { lat: number, lng: number }
    price              text,                           -- formatiert z.B. "€189"
    price_value        numeric(10,2),                  -- numerisch für Filter/Sortierung
    image              text,                           -- URL
    status             text default 'upcoming',        -- 'upcoming' | 'past' | 'cancelled'
    difficulty         integer,                        -- 1=leicht, 2=mittel, 3=schwer
    beginner_friendly  boolean default false,
    organizer_id       text references public.organizers(id) on delete set null,
    registered_friends jsonb default '[]',             -- cached friend-array für Frontend
    rallye_region      text,
    trip_type          text,
    skill_level        text,
    bike_type          text,
    group_size         integer,
    level              text,
    is_new             boolean default false,
    has_changes        boolean default false,
    change_details     jsonb,
    created_at         timestamptz default now(),
    updated_at         timestamptz default now()
);

-- ─── TABELLE: users ──────────────────────────────────────────
-- Erweitert auth.users von Supabase Auth
create table if not exists public.users (
    id                  uuid primary key references auth.users(id) on delete cascade,
    name                text,
    email               text,
    avatar              text,
    registered_event_ids integer[] default '{}',
    favorite_event_ids   integer[] default '{}',
    created_at           timestamptz default now(),
    updated_at           timestamptz default now()
);

-- ─── TABELLE: friends ────────────────────────────────────────
create table if not exists public.friends (
    id         bigserial primary key,
    user_id    uuid not null references public.users(id) on delete cascade,
    friend_id  uuid not null references public.users(id) on delete cascade,
    created_at timestamptz default now(),
    unique(user_id, friend_id)
);

-- ─── UPDATED_AT TRIGGER ──────────────────────────────────────
create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

create trigger events_updated_at
    before update on public.events
    for each row execute function public.handle_updated_at();

create trigger users_updated_at
    before update on public.users
    for each row execute function public.handle_updated_at();

-- ─── TRIGGER: neues Auth-User → users-Zeile anlegen ─────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
    insert into public.users (id, name, email)
    values (
        new.id,
        coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
        new.email
    )
    on conflict (id) do nothing;
    return new;
end;
$$;

create or replace trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();

-- ─── INDIZES ─────────────────────────────────────────────────
create index if not exists events_category_idx     on public.events(category);
create index if not exists events_status_idx       on public.events(status);
create index if not exists events_start_date_idx   on public.events(start_date);
create index if not exists events_organizer_idx    on public.events(organizer_id);
create index if not exists friends_user_idx        on public.friends(user_id);
create index if not exists friends_friend_idx      on public.friends(friend_id);

-- ─── ROW LEVEL SECURITY (RLS) ────────────────────────────────

-- Events: öffentlich lesbar, nur Admins dürfen schreiben
alter table public.events enable row level security;

create policy "events_select_all"
    on public.events for select
    using (true);

create policy "events_insert_authenticated"
    on public.events for insert
    to authenticated
    with check (true);

create policy "events_update_authenticated"
    on public.events for update
    to authenticated
    using (true);

create policy "events_delete_authenticated"
    on public.events for delete
    to authenticated
    using (true);

-- Organizers: öffentlich lesbar
alter table public.organizers enable row level security;

create policy "organizers_select_all"
    on public.organizers for select
    using (true);

create policy "organizers_write_authenticated"
    on public.organizers for all
    to authenticated
    using (true);

-- Users: nur eigenes Profil lesen/schreiben
alter table public.users enable row level security;

create policy "users_select_own"
    on public.users for select
    to authenticated
    using (auth.uid() = id);

create policy "users_insert_own"
    on public.users for insert
    to authenticated
    with check (auth.uid() = id);

create policy "users_update_own"
    on public.users for update
    to authenticated
    using (auth.uid() = id);

-- Friends: nur eigene Freundschaften sehen/verwalten
alter table public.friends enable row level security;

create policy "friends_select_own"
    on public.friends for select
    to authenticated
    using (auth.uid() = user_id or auth.uid() = friend_id);

create policy "friends_insert_own"
    on public.friends for insert
    to authenticated
    with check (auth.uid() = user_id);

create policy "friends_delete_own"
    on public.friends for delete
    to authenticated
    using (auth.uid() = user_id);

-- ─── STORAGE BUCKET für App-Hosting ──────────────────────────
-- Führe im Dashboard unter Storage aus oder nutze die Supabase CLI:
-- supabase storage create trailfinder-hosting --public

insert into storage.buckets (id, name, public)
values ('trailfinder-hosting', 'trailfinder-hosting', true)
on conflict (id) do nothing;

-- Storage Policy: öffentlich lesbar
create policy "hosting_public_read"
    on storage.objects for select
    using (bucket_id = 'trailfinder-hosting');

-- Storage Policy: nur authenticated darf hochladen
create policy "hosting_authenticated_upload"
    on storage.objects for insert
    to authenticated
    with check (bucket_id = 'trailfinder-hosting');

create policy "hosting_authenticated_update"
    on storage.objects for update
    to authenticated
    using (bucket_id = 'trailfinder-hosting');

create policy "hosting_authenticated_delete"
    on storage.objects for delete
    to authenticated
    using (bucket_id = 'trailfinder-hosting');