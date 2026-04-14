// ─── TrailHub Admin – Category & Field Configuration ─────────────────────────

export const CATEGORIES = [
  { value: 'trail-adventures', label: 'Trail Adventures' },
  { value: 'rallyes',          label: 'Rallyes' },
  { value: 'adventure-trips',  label: 'Adventure Trips' },
  { value: 'skills-camps',     label: 'Skills-Camps' },
  { value: 'offroad-festivals',label: 'Offroad Festivals' },
];

export const CATEGORY_FIELDS = {
  'trail-adventures': {
    subcategoryOptions: [
      { value: 'trail',      label: 'Trail' },
      { value: 'enduro',     label: 'Enduro' },
      { value: 'hard-enduro',label: 'Hard Enduro' },
      { value: 'mx',         label: 'MX' },
    ],
    showSubcategory: true,
    showDifficulty: true,
    showBikeRequirements: true,
    showRallyeRegion: false,
    showRallyeLevel: false,
    showTripType: false,
    showSkillLevel: false,
    showBikeType: false,
    showFestivalType: false,
    showGroupSize: false,
    namePlaceholder: 'z.B. Black Forest Enduro 2026',
  },
  'rallyes': {
    showSubcategory: false,
    showDifficulty: false,
    showBikeRequirements: false,
    showRallyeRegion: true,
    rallyeRegionOptions: [
      { value: 'europe', label: 'Europa / Europe' },
      { value: 'africa', label: 'Afrika / Africa' },
      { value: 'asia',   label: 'Asien / Asia' },
    ],
    showRallyeLevel: true,
    rallyeLevelOptions: [
      { value: 'beginner',  label: 'Einsteiger / Beginner' },
      { value: 'amateur',   label: 'Amateur' },
      { value: 'pro',       label: 'Pro / Race' },
      { value: 'dakar',     label: 'Dakar-Style' },
    ],
    showTripType: false,
    showSkillLevel: false,
    showBikeType: false,
    showFestivalType: false,
    showGroupSize: false,
    namePlaceholder: 'z.B. Rallye des Ardennes 2026',
  },
  'adventure-trips': {
    showSubcategory: false,
    showDifficulty: false,
    showBikeRequirements: false,
    showRallyeRegion: false,
    showRallyeLevel: false,
    showTripType: true,
    tripTypeOptions: [
      { value: 'onroad',  label: 'Onroad' },
      { value: 'offroad', label: 'Offroad' },
    ],
    showTripLevel: true,
    tripLevelOptions: [
      { value: 'beginner',  label: 'Einsteiger' },
      { value: 'amateur',   label: 'Amateur' },
      { value: 'pro',       label: 'Pro / Race' },
      { value: 'dakar',     label: 'Dakar-Style' },
    ],
    showSkillLevel: false,
    showBikeType: false,
    showFestivalType: false,
    showGroupSize: false,
    namePlaceholder: 'z.B. Vosges Trail Adventure',
  },
  'skills-camps': {
    showSubcategory: false,
    showDifficulty: false,
    showBikeRequirements: false,
    showRallyeRegion: false,
    showRallyeLevel: false,
    showTripType: false,
    showSkillLevel: true,
    skillLevelOptions: [
      { value: 'beginner',      label: 'Einsteiger / Beginner' },
      { value: 'hobbyist',      label: 'Hobbyfahrer' },
      { value: 'intermediate',  label: 'Fortgeschritten / Intermediate' },
      { value: 'advanced',      label: 'Profi / Advanced' },
    ],
    showBikeType: true,
    bikeTypeOptions: [
      { value: 'enduro',    label: 'Enduro' },
      { value: 'trail',     label: 'Trail' },
      { value: 'adventure', label: 'Adventure' },
      { value: 'mx',        label: 'MX' },
      { value: 'hard-enduro', label: 'Hard Enduro' },
    ],
    showFestivalType: false,
    showGroupSize: true,
    namePlaceholder: 'z.B. Enduro Basics Camp Eifel',
  },
  'offroad-festivals': {
    showSubcategory: false,
    showDifficulty: false,
    showBikeRequirements: false,
    showRallyeRegion: false,
    showRallyeLevel: false,
    showTripType: false,
    showSkillLevel: false,
    showBikeType: false,
    showFestivalType: true,
    festivalTypeOptions: [
      { value: 'community',     label: 'Community-Treffen' },
      { value: 'hersteller',    label: 'Hersteller-Event' },
      { value: 'demo',          label: 'Demo-/Test-Event' },
      { value: 'race',          label: 'Rennen integriert' },
      { value: 'messe',         label: 'Messe/Expo' },
      { value: 'adventure-festival', label: 'Adventure-Festival' },
      { value: 'hard-enduro-festival', label: 'Hard-Enduro-Festival' },
    ],
    showGroupSize: false,
    namePlaceholder: 'z.B. Adventure Festival Nürburgring',
  },
};

export const ORGANIZER_IDS = [
  'adventure-tours',
  'bosnia-rally',
  'enduro-events',
  'moto-academy',
  'offroad-community',
  'rally-masters',
  'rando-tt',
  'tracks-adventures',
];

export const STATUS_OPTIONS = [
  { value: 'upcoming',  label: 'Upcoming' },
  { value: 'past',      label: 'Past' },
  { value: 'permanent', label: 'Permanent' },
];

export const DIFFICULTY_OPTIONS = [
  { value: 1, label: '1 – Leicht' },
  { value: 2, label: '2 – Mittel' },
  { value: 3, label: '3 – Schwer' },
];

export const LANGUAGES = ['DE', 'EN', 'FR'];

export const ITEMS_PER_PAGE_OPTIONS = [25, 50, 100];

export const BULK_ACTIONS = [
  { value: 'activate',   label: 'Aktivieren (upcoming)' },
  { value: 'deactivate', label: 'Deaktivieren (past)' },
  { value: 'delete',     label: 'Löschen' },
];

// CSV column → DB field mapping for import
export const CSV_FIELD_MAP = {
  name:             { label: 'Name', required: true },
  category:         { label: 'Kategorie', required: true },
  subcategory:      { label: 'Subkategorie', required: false },
  start_date:       { label: 'Start-Datum', required: true },
  end_date:         { label: 'End-Datum', required: false },
  location:         { label: 'Ort / Location', required: true },
  coordinates:      { label: 'Koordinaten (JSON)', required: false },
  price_value:      { label: 'Preis (€)', required: false },
  status:           { label: 'Status', required: false },
  organizer_id:     { label: 'Organizer-ID', required: false },
  difficulty:       { label: 'Schwierigkeit (1-3)', required: false },
  beginner_friendly:{ label: 'Einsteiger-geeignet', required: false },
  max_participants: { label: 'Max. Teilnehmer', required: false },
  description_de:   { label: 'Kurzbeschr. DE', required: false },
  description_en:   { label: 'Kurzbeschr. EN', required: false },
  description_fr:   { label: 'Kurzbeschr. FR', required: false },
  image:            { label: 'Hauptbild URL', required: false },
  event_url:        { label: 'Event-URL', required: false },
  meta_title:       { label: 'Meta-Title', required: false },
  meta_description: { label: 'Meta-Description', required: false },
  keywords:         { label: 'Keywords', required: false },
  slug:             { label: 'Slug (URL)', required: false },
  is_new:           { label: 'Neu-Badge', required: false },
  rallye_region:    { label: 'Rallye-Region', required: false },
  rallye_level:     { label: 'Rallye-Level', required: false },
  trip_type:        { label: 'Trip-Typ', required: false },
  skill_level:      { label: 'Skill-Level', required: false },
  bike_type:        { label: 'Bike-Typ', required: false },
  festival_type:    { label: 'Festival-Typ', required: false },
  group_size:       { label: 'Gruppengröße', required: false },
  route_url:        { label: 'Route-URL', required: false },
};

export const AI_PROMPT_TEMPLATES = {
  DE: `Erstelle eine prägnante 2-3 Sätze lange Zusammenfassung für folgendes Offroad-Motorrad-Event auf Deutsch. Fokus: Was macht das Event besonders, für wen ist es geeignet, was erwartet die Teilnehmer?`,
  EN: `Create a concise 2-3 sentence summary for the following offroad motorcycle event in English. Focus: What makes this event special, who is it suited for, what can participants expect?`,
  FR: `Créez un résumé concis de 2-3 phrases pour l'événement de moto tout-terrain suivant en français. Focus: Qu'est-ce qui rend cet événement spécial, pour qui est-il adapté, qu'est-ce que les participants peuvent attendre?`,
};
