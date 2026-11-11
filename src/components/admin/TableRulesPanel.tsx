import { useCallback, useEffect, useState } from 'react';
import { Save, SlidersHorizontal } from 'lucide-react';
import { adminUpdateTableRules, fetchAllPokerTables } from '@/lib/api';
import { errorMessage, formatPeso } from '@/lib/format';
import type { PokerTableRow } from '@/lib/models';
import { tableBotLevel } from '@/poker/session';
import { BOT_LEVELS, type BotLevel } from '@/poker/types';

const SKILL_LABEL: Record<BotLevel, string> = { easy: 'Easy', normal: 'Normal', hard: 'Hard' };

interface Draft {
  level: BotLevel;
  rake: string;
}

function draftOf(table: PokerTableRow): Draft {
  return {
    level: tableBotLevel(table.bot_level),
    rake: table.rake_percent === null ? '' : String(Number(table.rake_percent)),
  };
}

/** Admin: the bot skill is fixed per table (players cannot pick it), plus an optional house cut. */
export function TableRulesPanel({ houseRake }: { houseRake: number }) {
  const [tables, setTables] = useState<PokerTableRow[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const rows = await fetchAllPokerTables();
      setTables(rows);
      setDrafts(Object.fromEntries(rows.map((row) => [row.id, draftOf(row)])));
      setError(null);
    } catch (err) {
      setError(errorMessage(err));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function save(table: PokerTableRow) {
    const draft = drafts[table.id]!;
    const rake = draft.rake.trim() === '' ? null : Number(draft.rake);
    if (rake !== null && (!Number.isFinite(rake) || rake < 0 || rake > 20)) {
      setError('House cut must be between 0 and 20 percent, or blank for the house default.');
      return;
    }
    setSaving(table.id);
    setError(null);
    try {
      await adminUpdateTableRules(table.id, draft.level, rake);
      await load();
      setSaved(table.id);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(null);
    }
  }

  return (
    <section className="glass-panel rounded-2xl p-5 lg:col-span-2">
      <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-slate-400">
        <SlidersHorizontal className="h-4 w-4" /> Table rules
      </h3>
      <p className="mt-2 text-sm text-slate-400">
        Each table plays with one fixed bot skill. Players can no longer choose an easier level. Leave the cut blank to
        use the house default ({houseRake}%).
      </p>
      {error && (
        <p role="alert" className="mt-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
          {error}
        </p>
      )}
      <div className="mt-4 divide-y divide-white/5">
        {tables.map((table) => {
          const draft = drafts[table.id];
          if (!draft) return null;
          const original = draftOf(table);
          const dirty = original.level !== draft.level || original.rake !== draft.rake;
          return (
            <div key={table.id} className="flex flex-wrap items-center gap-3 py-3">
              <div className="min-w-[9rem] flex-1">
                <p className="font-semibold text-white">{table.name}</p>
                <p className="text-xs text-slate-500">
                  Blinds {formatPeso(Number(table.small_blind))}/{formatPeso(Number(table.big_blind))}
                  {!table.is_active && ' · closed'}
                </p>
              </div>
              <div className="flex gap-1.5" role="radiogroup" aria-label={`Bot skill for ${table.name}`}>
                {BOT_LEVELS.map((level) => {
                  const on = draft.level === level;
                  return (
                    <button
                      key={level}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      onClick={() => {
                        setSaved(null);
                        setDrafts((current) => ({ ...current, [table.id]: { ...draft, level } }));
                      }}
                      className={`rounded-full border px-3 py-1 text-xs font-bold transition ${
                        on ? 'border-gold/60 bg-gold/15 text-gold' : 'border-white/10 text-slate-500 hover:border-white/25'
                      }`}
                    >
                      {SKILL_LABEL[level]}
                    </button>
                  );
                })}
              </div>
              <label className="flex items-center gap-1.5 text-xs text-slate-400">
                Cut
                <input
                  type="number"
                  min={0}
                  max={20}
                  step={0.5}
                  placeholder={String(houseRake)}
                  aria-label={`House cut for ${table.name}`}
                  value={draft.rake}
                  onChange={(event) => {
                    setSaved(null);
                    setDrafts((current) => ({ ...current, [table.id]: { ...draft, rake: event.target.value } }));
                  }}
                  className="w-16 rounded-lg border border-white/10 bg-slate-950 px-2 py-1 text-sm text-white tabular-nums outline-none focus:border-gold-400/60"
                />
                %
              </label>
              <button
                type="button"
                disabled={!dirty || saving !== null}
                onClick={() => void save(table)}
                className="btn-gold inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold disabled:opacity-30"
              >
                <Save className="h-3.5 w-3.5" /> {saving === table.id ? 'Saving…' : 'Save'}
              </button>
              {saved === table.id && <span className="text-xs text-emerald-300">Saved</span>}
            </div>
          );
        })}
      </div>
    </section>
  );
}
