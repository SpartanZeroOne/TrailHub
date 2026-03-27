-- ============================================================
-- TrailFinder – Seed Data (Mockdata importieren)
-- Ausführen NACH 01_schema.sql im Supabase SQL Editor
-- ============================================================

-- ─── ORGANIZERS ─────────────────────────────────────────────
insert into public.organizers (id, name, logo, verified, since, events_hosted, rating, specialties, website, description)
values
    ('rally-masters',    'Rally Masters GmbH',            'https://images.unsplash.com/photo-1560179707-f14e90ef3623?w=100&h=100&fit=crop', true, 2008, 48, 4.8, array['Rallye','Cross-Country','Orientierungsfahrten'], 'https://rally-masters.de',    'Professionelle Rallye-Veranstaltungen seit 2008'),
    ('enduro-events',    'Enduro Events Europe',           'https://images.unsplash.com/photo-1548407260-da850faa41e3?w=100&h=100&fit=crop', true, 2012, 32, 4.6, array['Enduro','Hare Scramble','Hard Enduro'],           'https://enduro-events.eu',    'Europas führender Enduro-Veranstalter'),
    ('adventure-tours',  'Adventure Tours International',  'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=100&h=100&fit=crop', true, 2005, 67, 4.9, array['Fernreisen','Sahara','Marokko','Mongolei'],        'https://adventure-tours.com', 'Unvergessliche Offroad-Abenteuer weltweit'),
    ('moto-academy',     'MotoSkills Academy',             'https://images.unsplash.com/photo-1568992687947-868a62a9f521?w=100&h=100&fit=crop', true, 2015, 120,4.7, array['Fahrtechnik','Enduro-Training','Gelände'],         'https://motoskills.de',       'Professionelles Fahrtechnik-Training'),
    ('offroad-community','Offroad Community e.V.',         'https://images.unsplash.com/photo-1552664730-d307ca884978?w=100&h=100&fit=crop', true, 2010, 85, 4.5, array['Community','Festival','Offroadpark'],              'https://offroad-community.de','Die größte Offroad-Community im deutschsprachigen Raum')
on conflict (id) do nothing;

-- ─── EVENTS ─────────────────────────────────────────────────
insert into public.events (
    name, category, subcategory, start_date, end_date, location, coordinates,
    price, price_value, image, status, difficulty, beginner_friendly,
    organizer_id, registered_friends, is_new, has_changes, level, rallye_region
) values
(
    'Eifel Adventure Rally', 'rallyes', null, '2026-03-15', '2026-03-16',
    'Nürburgring, Deutschland', '{"lat":50.3356,"lng":6.9475}',
    '€189', 189,
    'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop',
    'upcoming', null, false, 'rally-masters',
    '[{"id":1,"name":"Max","avatar":"https://i.pravatar.cc/40?img=1"},{"id":2,"name":"Lisa","avatar":"https://i.pravatar.cc/40?img=5"}]',
    true, false, 'amateur', 'inland'
),
(
    'Ardennes Mud Challenge', 'trail-adventures', 'enduro', '2026-04-05', '2026-04-06',
    'Spa, Belgien', '{"lat":50.4875,"lng":5.8667}',
    '€245', 245,
    'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=400&h=300&fit=crop',
    'upcoming', 2, false, 'enduro-events',
    '[{"id":3,"name":"Tom","avatar":"https://i.pravatar.cc/40?img=3"}]',
    false, true, null, null
),
(
    'Luxembourg Trail Days', 'trail-adventures', 'trail', '2026-04-20', '2026-04-22',
    'Echternach, Luxemburg', '{"lat":49.8153,"lng":6.4218}',
    '€320', 320,
    'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=400&h=300&fit=crop',
    'upcoming', 1, false, null,
    '[]', true, false, null, null
),
(
    'Black Forest Enduro', 'trail-adventures', 'enduro', '2026-05-10', '2026-05-11',
    'Freiburg, Deutschland', '{"lat":47.9990,"lng":7.8421}',
    '€175', 175,
    'https://images.unsplash.com/photo-1551632811-561732d1e306?w=400&h=300&fit=crop',
    'upcoming', 2, false, 'adventure-tours',
    '[{"id":1,"name":"Max","avatar":"https://i.pravatar.cc/40?img=1"},{"id":4,"name":"Sarah","avatar":"https://i.pravatar.cc/40?img=9"}]',
    false, false, null, null
),
(
    'Vosges Mountain Trophy', 'rallyes', null, '2026-02-01', '2026-02-02',
    'Colmar, Frankreich', '{"lat":48.0794,"lng":7.3558}',
    '€210', 210,
    'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=400&h=300&fit=crop',
    'past', null, false, null,
    '[]', false, false, 'beginner', 'europe'
),
(
    'Mosel Valley Crawler', 'trail-adventures', 'mx', '2026-02-15', '2026-02-16',
    'Trier, Deutschland', '{"lat":49.7490,"lng":6.6371}',
    '€155', 155,
    'https://images.unsplash.com/photo-1533577116850-9cc66cad8a9b?w=400&h=300&fit=crop',
    'upcoming', 1, false, 'rally-masters',
    '[{"id":2,"name":"Lisa","avatar":"https://i.pravatar.cc/40?img=5"}]',
    false, true, null, null
),
(
    '4x4 Driving Academy', 'skills-camps', null, '2026-05-24', '2026-05-25',
    'Bitburg, Deutschland', '{"lat":49.9667,"lng":6.5167}',
    '€299', 299,
    'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=400&h=300&fit=crop',
    'upcoming', null, false, 'moto-academy',
    '[]', true, false, null, null
),
(
    'Sahara Express Tour', 'adventure-trips', null, '2026-09-10', '2026-09-20',
    'Merzouga, Marokko', '{"lat":31.0801,"lng":-4.0134}',
    '€2.890', 2890,
    'https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=400&h=300&fit=crop',
    'upcoming', 2, false, 'adventure-tours',
    '[]', false, false, null, null
),
(
    'Rhine Valley MX Open', 'trail-adventures', 'mx', '2026-06-07', '2026-06-08',
    'Koblenz, Deutschland', '{"lat":50.3569,"lng":7.5890}',
    '€135', 135,
    'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=400&h=300&fit=crop',
    'upcoming', 3, false, 'enduro-events',
    '[{"id":5,"name":"Felix","avatar":"https://i.pravatar.cc/40?img=11"}]',
    true, false, null, null
),
(
    'Benelux Offroad Festival', 'offroad-festivals', null, '2026-08-14', '2026-08-16',
    'Diekirch, Luxemburg', '{"lat":49.8683,"lng":6.1597}',
    '€89', 89,
    'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop',
    'upcoming', null, true, 'offroad-community',
    '[{"id":1,"name":"Max","avatar":"https://i.pravatar.cc/40?img=1"},{"id":2,"name":"Lisa","avatar":"https://i.pravatar.cc/40?img=5"},{"id":3,"name":"Tom","avatar":"https://i.pravatar.cc/40?img=3"}]',
    false, false, null, null
);