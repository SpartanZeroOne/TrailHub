#!/usr/bin/env node
// TrailFinder – Supabase Setup Script
// Erstellt alle Tabellen, Policies und Seed-Daten über die Management API
//
// Verwendung:
//   node supabase/setup.mjs <PERSONAL_ACCESS_TOKEN>
//
// PAT generieren: https://app.supabase.com/account/tokens

const PROJECT_REF = 'hmdkiteqapiahwvdbdyh';
const SUPABASE_URL = 'https://hmdkiteqapiahwvdbdyh.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_KEY || '';
const MGMT_API = 'https://api.supabase.com/v1';

const PAT = process.argv[2];

if (!PAT) {
    console.error('\n❌  Kein Personal Access Token angegeben!');
    console.error('   Generiere einen unter: https://app.supabase.com/account/tokens');
    console.error('   Verwendung: node supabase/setup.mjs <PAT>\n');
    process.exit(1);
}

// ─── Hilfsfunktionen ────────────────────────────────────────

async function runSQL(sql, label = '') {
    const res = await fetch(`${MGMT_API}/projects/${PROJECT_REF}/database/query`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${PAT}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: sql }),
    });
    const text = await res.text();
    if (!res.ok) {
        console.error(`  ❌ ${label}: ${res.status} – ${text}`);
        return false;
    }
    console.log(`  ✅ ${label}`);
    return true;
}

async function restInsert(table, rows) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
            'apikey': SERVICE_ROLE_KEY,
            'Content-Type': 'application/json',
            'Prefer': 'resolution=ignore-duplicates',
        },
        body: JSON.stringify(rows),
    });
    if (!res.ok) {
        const t = await res.text();
        console.error(`  ❌ INSERT ${table}: ${res.status} – ${t}`);
        return false;
    }
    console.log(`  ✅ INSERT ${table} (${rows.length} Zeilen)`);
    return true;
}

// ─── Schema ─────────────────────────────────────────────────

async function createSchema() {
    console.log('\n📋  Schema erstellen...');

    await runSQL(`create extension if not exists "uuid-ossp";`, 'uuid-ossp Extension');

    await runSQL(`
        create table if not exists public.organizers (
            id            text primary key,
            name          text not null,
            logo          text,
            verified      boolean default false,
            since         integer,
            events_hosted integer default 0,
            rating        numeric(3,1) default 0,
            specialties   text[] default '{}',
            website       text,
            description   text,
            created_at    timestamptz default now()
        );
    `, 'Tabelle: organizers');

    await runSQL(`
        create table if not exists public.events (
            id                 serial primary key,
            name               text not null,
            category           text not null,
            subcategory        text,
            mx_type            text,
            start_date         date not null,
            end_date           date,
            location           text not null,
            coordinates        jsonb,
            price              text,
            price_value        numeric(10,2),
            image              text,
            status             text default 'upcoming',
            difficulty         integer,
            beginner_friendly  boolean default false,
            organizer_id       text references public.organizers(id) on delete set null,
            registered_friends jsonb default '[]',
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
    `, 'Tabelle: events');

    await runSQL(`
        create table if not exists public.users (
            id                   uuid primary key references auth.users(id) on delete cascade,
            name                 text,
            email                text,
            avatar               text,
            registered_event_ids integer[] default '{}',
            favorite_event_ids   integer[] default '{}',
            created_at           timestamptz default now(),
            updated_at           timestamptz default now()
        );
    `, 'Tabelle: users');

    await runSQL(`
        create table if not exists public.friends (
            id         bigserial primary key,
            user_id    uuid not null references public.users(id) on delete cascade,
            friend_id  uuid not null references public.users(id) on delete cascade,
            created_at timestamptz default now(),
            unique(user_id, friend_id)
        );
    `, 'Tabelle: friends');
}

// ─── Trigger ────────────────────────────────────────────────

async function createTriggers() {
    console.log('\n⚡  Trigger erstellen...');

    await runSQL(`
        create or replace function public.handle_updated_at()
        returns trigger language plpgsql as $$
        begin new.updated_at = now(); return new; end; $$;
    `, 'Funktion: handle_updated_at');

    await runSQL(`
        do $$ begin
            if not exists (select 1 from pg_trigger where tgname = 'events_updated_at') then
                create trigger events_updated_at
                    before update on public.events
                    for each row execute function public.handle_updated_at();
            end if;
        end $$;
    `, 'Trigger: events_updated_at');

    await runSQL(`
        create or replace function public.handle_new_user()
        returns trigger language plpgsql security definer as $$
        begin
            insert into public.users (id, name, email)
            values (
                new.id,
                coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
                new.email
            ) on conflict (id) do nothing;
            return new;
        end; $$;
    `, 'Funktion: handle_new_user');

    await runSQL(`
        create or replace trigger on_auth_user_created
            after insert on auth.users
            for each row execute function public.handle_new_user();
    `, 'Trigger: on_auth_user_created');
}

// ─── Indizes ────────────────────────────────────────────────

async function createIndexes() {
    console.log('\n🗂️  Indizes erstellen...');
    const indexes = [
        ['events_category_idx',   'events(category)'],
        ['events_status_idx',     'events(status)'],
        ['events_start_date_idx', 'events(start_date)'],
        ['events_organizer_idx',  'events(organizer_id)'],
        ['friends_user_idx',      'friends(user_id)'],
        ['friends_friend_idx',    'friends(friend_id)'],
    ];
    for (const [name, col] of indexes) {
        await runSQL(`create index if not exists ${name} on public.${col};`, `Index: ${name}`);
    }
}

// ─── RLS Policies ────────────────────────────────────────────

async function createPolicies() {
    console.log('\n🔒  RLS Policies einrichten...');

    const tables = ['events', 'organizers', 'users', 'friends'];
    for (const t of tables) {
        await runSQL(`alter table public.${t} enable row level security;`, `RLS enable: ${t}`);
    }

    const policies = [
        // Events
        [`create policy "events_select_all" on public.events for select using (true);`, 'Policy: events select all'],
        [`create policy "events_write_auth" on public.events for all to authenticated using (true) with check (true);`, 'Policy: events write auth'],
        // Organizers
        [`create policy "organizers_select_all" on public.organizers for select using (true);`, 'Policy: organizers select all'],
        [`create policy "organizers_write_auth" on public.organizers for all to authenticated using (true);`, 'Policy: organizers write auth'],
        // Users
        [`create policy "users_own" on public.users for all to authenticated using (auth.uid() = id) with check (auth.uid() = id);`, 'Policy: users own'],
        // Friends
        [`create policy "friends_select_own" on public.friends for select to authenticated using (auth.uid() = user_id or auth.uid() = friend_id);`, 'Policy: friends select own'],
        [`create policy "friends_insert_own" on public.friends for insert to authenticated with check (auth.uid() = user_id);`, 'Policy: friends insert own'],
        [`create policy "friends_delete_own" on public.friends for delete to authenticated using (auth.uid() = user_id);`, 'Policy: friends delete own'],
    ];

    for (const [sql, label] of policies) {
        await runSQL(sql, label);
    }
}

// ─── Seed Data ───────────────────────────────────────────────

async function seedData() {
    console.log('\n🌱  Seed-Daten einfügen...');

    const organizers = [
        { id: 'rally-masters', name: 'Rally Masters GmbH', logo: 'https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=100&h=100&fit=crop', verified: true, since: 2008, events_hosted: 48, rating: 4.8, specialties: ['Rallye','Cross-Country'], website: 'https://rally-masters.de', description: 'Professionelle Rallye-Veranstaltungen seit 2008' },
        { id: 'enduro-events', name: 'Enduro Events Europe', logo: 'https://images.unsplash.com/photo-1548407260-da850faa41e3?w=100&h=100&fit=crop', verified: true, since: 2012, events_hosted: 32, rating: 4.6, specialties: ['Enduro','Hard Enduro'], website: 'https://enduro-events.eu', description: 'Europas führender Enduro-Veranstalter' },
        { id: 'adventure-tours', name: 'Adventure Tours International', logo: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=100&h=100&fit=crop', verified: true, since: 2005, events_hosted: 67, rating: 4.9, specialties: ['Fernreisen','Sahara','Marokko'], website: 'https://adventure-tours.com', description: 'Unvergessliche Offroad-Abenteuer weltweit' },
        { id: 'moto-academy', name: 'MotoSkills Academy', logo: 'https://images.unsplash.com/photo-1568992687947-868a62a9f521?w=100&h=100&fit=crop', verified: true, since: 2015, events_hosted: 120, rating: 4.7, specialties: ['Fahrtechnik','Gelände'], website: 'https://motoskills.de', description: 'Professionelles Fahrtechnik-Training' },
        { id: 'offroad-community', name: 'Offroad Community e.V.', logo: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=100&h=100&fit=crop', verified: true, since: 2010, events_hosted: 85, rating: 4.5, specialties: ['Community','Festival'], website: 'https://offroad-community.de', description: 'Die größte Offroad-Community im deutschsprachigen Raum' },
    ];
    await restInsert('organizers', organizers);

    // Alle Events müssen exakt dieselben Keys haben (PostgREST PGRST102)
    const base = {
        subcategory: null, mx_type: null, end_date: null, difficulty: null,
        beginner_friendly: false, organizer_id: null, registered_friends: [],
        rallye_region: null, trip_type: null, skill_level: null,
        bike_type: null, group_size: null, level: null,
        is_new: false, has_changes: false, change_details: null,
    };

    const events = [
        { ...base, name: 'Eifel Adventure Rally',   category: 'rallyes',           start_date: '2026-03-15', end_date: '2026-03-16', location: 'Nürburgring, Deutschland', coordinates: {lat:50.3356,lng:6.9475},  price: '€189',   price_value: 189,  image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop',  status: 'upcoming', organizer_id: 'rally-masters',     registered_friends: [{id:1,name:'Max',avatar:'https://i.pravatar.cc/40?img=1'},{id:2,name:'Lisa',avatar:'https://i.pravatar.cc/40?img=5'}], is_new: true,  level: 'amateur',  rallye_region: 'inland' },
        { ...base, name: 'Ardennes Mud Challenge',   category: 'trail-adventures',  subcategory: 'enduro', start_date: '2026-04-05', end_date: '2026-04-06', location: 'Spa, Belgien',              coordinates: {lat:50.4875,lng:5.8667},  price: '€245',   price_value: 245,  image: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=400&h=300&fit=crop', status: 'upcoming', difficulty: 2, organizer_id: 'enduro-events',     registered_friends: [{id:3,name:'Tom',avatar:'https://i.pravatar.cc/40?img=3'}],                                                     has_changes: true },
        { ...base, name: 'Luxembourg Trail Days',    category: 'trail-adventures',  subcategory: 'trail',  start_date: '2026-04-20', end_date: '2026-04-22', location: 'Echternach, Luxemburg',     coordinates: {lat:49.8153,lng:6.4218},  price: '€320',   price_value: 320,  image: 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=400&h=300&fit=crop',  status: 'upcoming', difficulty: 1,                                                                                                                                                          is_new: true  },
        { ...base, name: 'Black Forest Enduro',      category: 'trail-adventures',  subcategory: 'enduro', start_date: '2026-05-10', end_date: '2026-05-11', location: 'Freiburg, Deutschland',     coordinates: {lat:47.999,lng:7.8421},   price: '€175',   price_value: 175,  image: 'https://images.unsplash.com/photo-1551632811-561732d1e306?w=400&h=300&fit=crop',  status: 'upcoming', difficulty: 2, organizer_id: 'adventure-tours',    registered_friends: [{id:1,name:'Max',avatar:'https://i.pravatar.cc/40?img=1'},{id:4,name:'Sarah',avatar:'https://i.pravatar.cc/40?img=9'}]  },
        { ...base, name: 'Vosges Mountain Trophy',   category: 'rallyes',           start_date: '2026-02-01', end_date: '2026-02-02', location: 'Colmar, Frankreich',        coordinates: {lat:48.0794,lng:7.3558},  price: '€210',   price_value: 210,  image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=400&h=300&fit=crop',  status: 'past',                                                                                                                                                                          level: 'beginner', rallye_region: 'europe' },
        { ...base, name: 'Mosel Valley Crawler',     category: 'trail-adventures',  subcategory: 'mx',     start_date: '2026-02-15', end_date: '2026-02-16', location: 'Trier, Deutschland',        coordinates: {lat:49.749,lng:6.6371},   price: '€155',   price_value: 155,  image: 'https://images.unsplash.com/photo-1533577116850-9cc66cad8a9b?w=400&h=300&fit=crop',  status: 'upcoming', difficulty: 1, organizer_id: 'rally-masters',     registered_friends: [{id:2,name:'Lisa',avatar:'https://i.pravatar.cc/40?img=5'}],                                                     has_changes: true },
        { ...base, name: '4x4 Driving Academy',      category: 'skills-camps',      start_date: '2026-05-24', end_date: '2026-05-25', location: 'Bitburg, Deutschland',      coordinates: {lat:49.9667,lng:6.5167},  price: '€299',   price_value: 299,  image: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=400&h=300&fit=crop',  status: 'upcoming',             organizer_id: 'moto-academy',                                                                                                                                                    is_new: true, skill_level: 'beginner', bike_type: 'adventure', group_size: 8 },
        { ...base, name: 'Sahara Express Tour',      category: 'adventure-trips',   start_date: '2026-09-10', end_date: '2026-09-20', location: 'Merzouga, Marokko',         coordinates: {lat:31.0801,lng:-4.0134}, price: '€2.890', price_value: 2890, image: 'https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=400&h=300&fit=crop',  status: 'upcoming', difficulty: 2, organizer_id: 'adventure-tours' },
        { ...base, name: 'Rhine Valley MX Open',     category: 'trail-adventures',  subcategory: 'mx',     start_date: '2026-06-07', end_date: '2026-06-08', location: 'Koblenz, Deutschland',      coordinates: {lat:50.3569,lng:7.589},   price: '€135',   price_value: 135,  image: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=400&h=300&fit=crop',  status: 'upcoming', difficulty: 3, organizer_id: 'enduro-events',     registered_friends: [{id:5,name:'Felix',avatar:'https://i.pravatar.cc/40?img=11'}],                                                   is_new: true  },
        { ...base, name: 'Benelux Offroad Festival', category: 'offroad-festivals',  start_date: '2026-08-14', end_date: '2026-08-16', location: 'Diekirch, Luxemburg',      coordinates: {lat:49.8683,lng:6.1597},  price: '€89',    price_value: 89,   image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop',  status: 'upcoming', beginner_friendly: true, organizer_id: 'offroad-community', registered_friends: [{id:1,name:'Max',avatar:'https://i.pravatar.cc/40?img=1'},{id:2,name:'Lisa',avatar:'https://i.pravatar.cc/40?img=5'},{id:3,name:'Tom',avatar:'https://i.pravatar.cc/40?img=3'}] },
    ];
    await restInsert('events', events);
}

// ─── Main ────────────────────────────────────────────────────

async function main() {
    console.log('🚀  TrailFinder Supabase Setup');
    console.log(`   Projekt: ${PROJECT_REF}`);
    console.log(`   URL:     ${SUPABASE_URL}`);

    // PAT testen
    const testRes = await fetch(`${MGMT_API}/projects/${PROJECT_REF}`, {
        headers: { 'Authorization': `Bearer ${PAT}` }
    });
    if (!testRes.ok) {
        console.error(`\n❌  PAT ungültig oder keine Zugriffsrechte (${testRes.status})`);
        console.error('   Bitte einen gültigen PAT unter https://app.supabase.com/account/tokens generieren.\n');
        process.exit(1);
    }
    console.log('  ✅ PAT verifiziert\n');

    await createSchema();
    await createTriggers();
    await createIndexes();
    await createPolicies();
    await seedData();

    console.log('\n🎉  Setup abgeschlossen!');
    console.log(`\n   App-URL: ${SUPABASE_URL}/storage/v1/object/public/trailfinder-hosting/index.html`);
    console.log('   Dashboard: https://app.supabase.com/project/hmdkiteqapiahwvdbdyh\n');
}

main().catch((err) => {
    console.error('\n❌  Unerwarteter Fehler:', err.message);
    process.exit(1);
});