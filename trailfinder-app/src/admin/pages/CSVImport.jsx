// ─── TrailHub Admin – CSV Import ──────────────────────────────────────────────
import { useState, useRef, useCallback } from 'react';
import { adminImportEvents } from '../services/adminSupabase';
import { CSV_FIELD_MAP, CATEGORIES, STATUS_OPTIONS } from '../utils/adminConfig';

// ─── CSV Parser ───────────────────────────────────────────────────────────────
function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return { headers: [], rows: [] };

  const parseRow = (line) => {
    const cells = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
        else inQuotes = !inQuotes;
      } else if (ch === ',' && !inQuotes) {
        cells.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    cells.push(current.trim());
    return cells;
  };

  const headers = parseRow(lines[0]);
  const rows = lines.slice(1).map(l => {
    const cells = parseRow(l);
    return headers.reduce((obj, h, i) => { obj[h] = cells[i] ?? ''; return obj; }, {});
  });
  return { headers, rows };
}

// ─── CSV Template Generator ───────────────────────────────────────────────────
function downloadTemplate() {
  const fields = Object.keys(CSV_FIELD_MAP);
  const example = {
    name: 'Black Forest Enduro 2026', category: 'trail-adventures', subcategory: 'enduro',
    start_date: '2026-08-14', end_date: '2026-08-15',
    location: 'Freudenstadt, Deutschland', coordinates: '{"lat":48.4634,"lng":8.4105}',
    price_value: '185', status: 'upcoming', organizer_id: 'enduro-events',
    difficulty: '2', beginner_friendly: 'false', max_participants: '12',
    description_de: '2-Tages Enduro-Wochenende durch den Schwarzwald',
    description_en: '2-day enduro weekend through the Black Forest',
    description_fr: 'Week-end enduro de 2 jours à travers la Forêt-Noire',
    image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800',
    event_url: 'https://enduro-events.eu/black-forest',
    meta_title: 'Black Forest Enduro 2026 | TrailHub',
    meta_description: '2-Tages Enduro-Wochenende im Schwarzwald',
    keywords: 'enduro, schwarzwald, wochenende',
    slug: 'black-forest-enduro-2026', is_new: 'true',
    rallye_region: '', rallye_level: '', trip_type: '', skill_level: '',
    bike_type: '', festival_type: '', group_size: '', route_url: '',
  };
  const headers = fields.map(f => `"${f}"`).join(',');
  const row = fields.map(f => `"${example[f] ?? ''}"`).join(',');
  const csv = headers + '\n' + row;
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = 'trailhub_events_vorlage.csv'; a.click();
  URL.revokeObjectURL(url);
}

// ─── Field Mapping Row ────────────────────────────────────────────────────────
function MappingRow({ csvCol, dbField, onChange, dbFields }) {
  return (
    <div className="flex items-center gap-3 py-2 border-b border-stone-800 last:border-0">
      <span className="w-40 text-sm text-stone-300 font-mono truncate" title={csvCol}>{csvCol}</span>
      <svg className="w-4 h-4 text-stone-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6"/>
      </svg>
      <select
        value={dbField}
        onChange={e => onChange(e.target.value)}
        className="flex-1 px-3 py-1.5 rounded-lg bg-stone-800 border border-stone-700 text-stone-300 text-sm focus:outline-none focus:border-orange-500/50"
      >
        <option value="">(ignorieren)</option>
        {dbFields.map(f => (
          <option key={f.key} value={f.key}>{f.label}{f.required ? ' *' : ''}</option>
        ))}
      </select>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function CSVImport({ onNavigate, toast }) {
  const [step, setStep] = useState(1); // 1=upload, 2=mapping, 3=options, 4=importing, 5=done
  const [csvData, setCsvData] = useState(null); // { headers, rows }
  const [mapping, setMapping] = useState({});
  const [options, setOptions] = useState({ duplicates: 'skip', status: 'upcoming', organizer_id: '' });
  const [dragOver, setDragOver] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [results, setResults] = useState(null);
  const fileRef = useRef();

  const dbFields = Object.entries(CSV_FIELD_MAP).map(([key, cfg]) => ({ key, ...cfg }));

  // ─── Auto-map CSV columns to DB fields ────────────────────────────────────
  const autoMap = useCallback((headers) => {
    const map = {};
    headers.forEach(h => {
      const normalized = h.toLowerCase().trim().replace(/[\s-]/g, '_');
      const match = dbFields.find(f =>
        f.key === normalized ||
        f.key === h.toLowerCase() ||
        f.label.toLowerCase().replace(/[^a-z]/g, '') === normalized.replace(/_/g, '')
      );
      if (match) map[h] = match.key;
      else map[h] = '';
    });
    return map;
  }, []);

  const handleFile = (file) => {
    if (!file?.name.endsWith('.csv')) { toast?.error('Nur .csv Dateien erlaubt'); return; }
    const reader = new FileReader();
    reader.onload = (e) => {
      const { headers, rows } = parseCSV(e.target.result);
      if (!headers.length || !rows.length) { toast?.error('Leere oder ungültige CSV-Datei'); return; }
      setCsvData({ headers, rows });
      setMapping(autoMap(headers));
      setStep(2);
    };
    reader.readAsText(file, 'UTF-8');
  };

  const handleDrop = (e) => {
    e.preventDefault(); setDragOver(false);
    handleFile(e.dataTransfer.files[0]);
  };

  // ─── Build event objects from mapped rows ─────────────────────────────────
  const buildEvents = () => {
    return csvData.rows.map(row => {
      const event = { ...options.organizer_id ? { organizer_id: options.organizer_id } : {} };
      event.status = options.status;
      Object.entries(mapping).forEach(([csvCol, dbField]) => {
        if (!dbField) return;
        const val = row[csvCol] ?? '';
        if (dbField === 'beginner_friendly' || dbField === 'is_new' || dbField === 'is_featured') {
          event[dbField] = val.toLowerCase() === 'true' || val === '1';
        } else if (dbField === 'difficulty' || dbField === 'max_participants' || dbField === 'price_value' || dbField === 'group_size') {
          event[dbField] = val !== '' ? Number(val) : null;
        } else if (dbField === 'coordinates') {
          try { event[dbField] = val ? JSON.parse(val) : null; } catch { event[dbField] = null; }
        } else {
          event[dbField] = val || null;
        }
      });
      // Auto-generate price string
      if (event.price_value) event.price = `€${event.price_value}`;
      return event;
    });
  };

  const handleImport = async () => {
    const requiredFields = Object.values(mapping);
    if (!requiredFields.includes('name') || !requiredFields.includes('category') || !requiredFields.includes('start_date')) {
      toast?.error('Mapping fehlt: Name, Kategorie und Start-Datum sind Pflichtfelder!');
      return;
    }
    setStep(4);
    setProgress({ current: 0, total: csvData.rows.length });
    const events = buildEvents();
    const res = await adminImportEvents(events, {
      onProgress: (cur, tot) => setProgress({ current: cur, total: tot }),
    });
    setResults(res);
    setStep(5);
    if (res.success > 0) toast?.success(`${res.success} Event(s) erfolgreich importiert!`);
    if (res.errors.length > 0) toast?.warning(`${res.errors.length} Fehler beim Import.`);
  };

  const reset = () => { setStep(1); setCsvData(null); setMapping({}); setResults(null); };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-100">CSV Import</h1>
          <p className="text-stone-500 text-sm mt-0.5">Events aus CSV-Datei importieren</p>
        </div>
        <button onClick={downloadTemplate} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-stone-800 hover:bg-stone-700 border border-stone-700 text-stone-300 text-sm transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
          CSV-Vorlage herunterladen
        </button>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center gap-2">
        {[
          { n: 1, label: 'Upload' },
          { n: 2, label: 'Mapping' },
          { n: 3, label: 'Optionen' },
          { n: 4, label: 'Import' },
          { n: 5, label: 'Fertig' },
        ].map(({ n, label }) => (
          <div key={n} className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
              step === n ? 'bg-orange-500 text-white' :
              step > n ? 'bg-green-500 text-white' :
              'bg-stone-800 text-stone-500 border border-stone-700'
            }`}>{step > n ? '✓' : n}</div>
            <span className={`text-sm ${step === n ? 'text-stone-200' : 'text-stone-500'}`}>{label}</span>
            {n < 5 && <span className="text-stone-700 mx-1">›</span>}
          </div>
        ))}
      </div>

      {/* STEP 1: Upload */}
      {step === 1 && (
        <div
          className={`bg-stone-900 rounded-xl border-2 border-dashed transition-colors ${dragOver ? 'border-orange-500 bg-orange-500/5' : 'border-stone-700'}`}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-colors ${dragOver ? 'bg-orange-500/20' : 'bg-stone-800'}`}>
              <svg className={`w-8 h-8 ${dragOver ? 'text-orange-400' : 'text-stone-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
              </svg>
            </div>
            <p className="text-stone-300 font-medium mb-1">CSV-Datei hierher ziehen</p>
            <p className="text-stone-500 text-sm mb-4">oder klicken zum Auswählen · UTF-8 · max. 10 MB</p>
            <button
              onClick={() => fileRef.current?.click()}
              className="px-5 py-2.5 rounded-lg bg-orange-500 hover:bg-orange-400 text-white text-sm font-medium transition-colors"
            >
              Datei auswählen
            </button>
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={e => handleFile(e.target.files[0])} />
          </div>
        </div>
      )}

      {/* STEP 2: Mapping */}
      {step === 2 && csvData && (
        <div className="bg-stone-900 rounded-xl border border-stone-800 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-stone-800">
            <div>
              <h2 className="text-stone-200 font-semibold">Spalten-Zuordnung</h2>
              <p className="text-stone-500 text-sm mt-0.5">{csvData.headers.length} Spalten · {csvData.rows.length} Zeilen erkannt</p>
            </div>
            <div className="flex gap-2">
              <button onClick={reset} className="px-3 py-1.5 rounded-lg bg-stone-800 border border-stone-700 text-stone-400 text-sm hover:bg-stone-700 transition-colors">← Neue Datei</button>
              <button onClick={() => setStep(3)} className="px-4 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-400 text-white text-sm font-medium transition-colors">Weiter →</button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 divide-y lg:divide-y-0 lg:divide-x divide-stone-800">
            <div className="p-4">
              <h3 className="text-stone-400 text-xs font-medium uppercase tracking-wider mb-3">CSV-Spalte → Datenbank-Feld</h3>
              <div className="max-h-96 overflow-y-auto">
                {csvData.headers.map(h => (
                  <MappingRow
                    key={h}
                    csvCol={h}
                    dbField={mapping[h] ?? ''}
                    onChange={v => setMapping(m => ({ ...m, [h]: v }))}
                    dbFields={dbFields}
                  />
                ))}
              </div>
            </div>

            <div className="p-4">
              <h3 className="text-stone-400 text-xs font-medium uppercase tracking-wider mb-3">Vorschau (erste 5 Zeilen)</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-stone-800">
                      {csvData.headers.map(h => (
                        <th key={h} className="px-2 py-1.5 text-left text-stone-500 whitespace-nowrap font-normal">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {csvData.rows.slice(0, 5).map((row, i) => (
                      <tr key={i} className="border-b border-stone-800/50">
                        {csvData.headers.map(h => (
                          <td key={h} className="px-2 py-1.5 text-stone-400 whitespace-nowrap max-w-[120px] truncate">{row[h] ?? ''}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: Import Options */}
      {step === 3 && (
        <div className="bg-stone-900 rounded-xl border border-stone-800 p-6 space-y-5">
          <h2 className="text-stone-200 font-semibold">Import-Optionen</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="block text-sm text-stone-400">Duplikat-Behandlung</label>
              <select
                value={options.duplicates}
                onChange={e => setOptions(o => ({ ...o, duplicates: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-lg bg-stone-800 border border-stone-700 text-stone-300 text-sm focus:outline-none focus:border-orange-500/50"
              >
                <option value="skip">Überspringen (bestehendes behalten)</option>
                <option value="overwrite">Überschreiben</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-sm text-stone-400">Standard-Status</label>
              <select
                value={options.status}
                onChange={e => setOptions(o => ({ ...o, status: e.target.value }))}
                className="w-full px-3 py-2.5 rounded-lg bg-stone-800 border border-stone-700 text-stone-300 text-sm focus:outline-none focus:border-orange-500/50"
              >
                {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <label className="block text-sm text-stone-400">Standard-Organizer (optional – überschreibt CSV-Wert)</label>
              <input
                type="text"
                value={options.organizer_id}
                onChange={e => setOptions(o => ({ ...o, organizer_id: e.target.value }))}
                placeholder="z.B. enduro-events (leer lassen für CSV-Wert)"
                className="w-full px-3 py-2.5 rounded-lg bg-stone-800 border border-stone-700 text-stone-200 text-sm placeholder:text-stone-600 focus:outline-none focus:border-orange-500/50"
              />
            </div>
          </div>

          {/* Summary */}
          <div className="rounded-lg bg-stone-800 border border-stone-700 p-4">
            <h3 className="text-stone-300 text-sm font-medium mb-2">Import-Zusammenfassung</h3>
            <ul className="space-y-1 text-sm text-stone-400">
              <li>📄 <strong className="text-stone-300">{csvData?.rows.length ?? 0}</strong> Zeilen werden importiert</li>
              <li>🗂 Status: <strong className="text-stone-300">{options.status}</strong></li>
              <li>♻️ Duplikate: <strong className="text-stone-300">{options.duplicates === 'skip' ? 'Überspringen' : 'Überschreiben'}</strong></li>
              <li>✅ Gemappte Felder: <strong className="text-stone-300">{Object.values(mapping).filter(Boolean).length}</strong> von {csvData?.headers.length ?? 0}</li>
              {!Object.values(mapping).includes('name') && <li className="text-red-400">⚠ "name" Spalte nicht gemappt!</li>}
              {!Object.values(mapping).includes('category') && <li className="text-red-400">⚠ "category" Spalte nicht gemappt!</li>}
              {!Object.values(mapping).includes('start_date') && <li className="text-red-400">⚠ "start_date" Spalte nicht gemappt!</li>}
            </ul>
          </div>

          <div className="flex gap-3">
            <button onClick={() => setStep(2)} className="px-4 py-2 rounded-lg bg-stone-800 border border-stone-700 text-stone-300 text-sm hover:bg-stone-700 transition-colors">← Zurück</button>
            <button onClick={handleImport} className="flex items-center gap-2 px-6 py-2 rounded-lg bg-orange-500 hover:bg-orange-400 text-white text-sm font-medium transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
              Import starten ({csvData?.rows.length ?? 0} Events)
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: Progress */}
      {step === 4 && (
        <div className="bg-stone-900 rounded-xl border border-stone-800 p-8 text-center space-y-5">
          <div className="w-14 h-14 border-3 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" style={{ borderWidth: 3 }}/>
          <div>
            <p className="text-stone-200 font-semibold">Importiere Events...</p>
            <p className="text-stone-500 text-sm mt-1">Zeile {progress.current} von {progress.total}</p>
          </div>
          <div className="w-full bg-stone-800 rounded-full h-2 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-orange-500 to-amber-400 transition-all duration-300"
              style={{ width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%` }}
            />
          </div>
          <p className="text-stone-500 text-sm">{progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0}%</p>
        </div>
      )}

      {/* STEP 5: Results */}
      {step === 5 && results && (
        <div className="bg-stone-900 rounded-xl border border-stone-800 p-6 space-y-5">
          <h2 className="text-stone-200 font-semibold">Import abgeschlossen</h2>

          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg bg-green-500/10 border border-green-500/20 p-4 text-center">
              <p className="text-4xl font-bold text-green-400">{results.success}</p>
              <p className="text-green-300 text-sm mt-1">Erfolgreich importiert</p>
            </div>
            <div className={`rounded-lg p-4 text-center ${results.errors.length > 0 ? 'bg-red-500/10 border border-red-500/20' : 'bg-stone-800 border border-stone-700'}`}>
              <p className={`text-4xl font-bold ${results.errors.length > 0 ? 'text-red-400' : 'text-stone-500'}`}>{results.errors.length}</p>
              <p className={`text-sm mt-1 ${results.errors.length > 0 ? 'text-red-300' : 'text-stone-500'}`}>Fehler</p>
            </div>
          </div>

          {results.errors.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-stone-400 text-sm font-medium">Fehler-Log</h3>
              <div className="max-h-48 overflow-y-auto bg-stone-950 rounded-lg border border-stone-700 p-3 space-y-1.5">
                {results.errors.map((e, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs">
                    <span className="text-red-400 flex-shrink-0">Zeile {e.row}:</span>
                    <span className="text-stone-400 font-mono">{e.error}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={reset} className="px-4 py-2 rounded-lg bg-stone-800 border border-stone-700 text-stone-300 text-sm hover:bg-stone-700 transition-colors">
              Neuer Import
            </button>
            <button onClick={() => onNavigate('/admin/events')} className="px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-400 text-white text-sm font-medium transition-colors">
              Zu Events →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}