import { CalendarDays, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { cn, fcfa } from '../../lib/format'
import { supabase } from '../../lib/supabase'
import { errMsg } from './shared'

/** Vue du graphique : heures d’un jour, jours d’une semaine, jours d’un mois, mois d’une année */
export type View = 'jour' | 'semaine' | 'mois' | 'annee'
const VIEWS: { id: View; label: string }[] = [
  { id: 'jour', label: 'Jour' }, { id: 'semaine', label: 'Semaines' }, { id: 'mois', label: 'Mois' }, { id: 'annee', label: 'Années' },
]
type Row = { bucket: string; revenue: number; n_orders: number; n_cancelled: number; qty_in: number; qty_out: number }
type Bucket = Row & { label: string; full: string; current: boolean; future: boolean }

// ── Dates en heure d’Abidjan (UTC) au format AAAA-MM-JJ ──
const DAY = 86400000
const iso = (t: number) => new Date(t).toISOString().slice(0, 10)
const utc = (s: string) => Date.parse(s + 'T00:00:00Z')
const todayIso = () => iso(Date.now())
const mondayOf = (s: string) => { const t = utc(s); const wd = (new Date(t).getUTCDay() + 6) % 7; return iso(t - wd * DAY) }
const fmt = (s: string, o: Intl.DateTimeFormatOptions) => new Date(utc(s)).toLocaleDateString('fr-FR', { timeZone: 'UTC', ...o })
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
/** « 1 novembre » → « 1er novembre » */
const er = (s: string) => s.replace(/(^|\s)1(\s)/, '$11er$2')

/** Début de la période affichée selon la vue et le décalage (0 = période actuelle, −1 = précédente…) */
function periodStart(view: View, offset: number): string {
  const t = todayIso(); const d = new Date(utc(t))
  if (view === 'jour') return iso(utc(t) + offset * DAY)
  if (view === 'semaine') return iso(utc(mondayOf(t)) + offset * 7 * DAY)
  if (view === 'mois') return iso(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + offset, 1))
  return iso(Date.UTC(d.getUTCFullYear() + offset, 0, 1))
}
/** Décalage qui contient une date donnée */
function offsetFor(view: View, date: string): number {
  const t = new Date(utc(todayIso())); const d = new Date(utc(date))
  if (view === 'jour') return Math.round((utc(date) - utc(todayIso())) / DAY)
  if (view === 'semaine') return Math.round((utc(mondayOf(date)) - utc(mondayOf(todayIso()))) / (7 * DAY))
  if (view === 'mois') return (d.getUTCFullYear() - t.getUTCFullYear()) * 12 + d.getUTCMonth() - t.getUTCMonth()
  return d.getUTCFullYear() - t.getUTCFullYear()
}
/** Liste des barres (début de chaque barre) et regroupement serveur */
function buckets(view: View, start: string): { group: 'hour' | 'day' | 'month'; keys: string[] } {
  const d = new Date(utc(start)); const y = d.getUTCFullYear()
  if (view === 'jour') return { group: 'hour', keys: Array.from({ length: 24 }, (_, h) => String(h).padStart(2, '0')) }
  if (view === 'semaine') return { group: 'day', keys: Array.from({ length: 7 }, (_, i) => iso(utc(start) + i * DAY)) }
  if (view === 'mois') { const n = new Date(Date.UTC(y, d.getUTCMonth() + 1, 0)).getUTCDate(); return { group: 'day', keys: Array.from({ length: n }, (_, i) => iso(utc(start) + i * DAY)) } }
  return { group: 'month', keys: Array.from({ length: 12 }, (_, i) => iso(Date.UTC(y, i, 1))) }
}
const periodEnd = (view: View, start: string, keys: string[]) => {
  if (view === 'jour') return start
  const last = keys[keys.length - 1]
  if (view === 'semaine' || view === 'mois') return last
  return iso(Date.UTC(new Date(utc(last)).getUTCFullYear(), 12, 0))
}
function periodLabel(view: View, start: string, offset: number): string {
  if (view === 'jour') return offset === 0 ? 'Aujourd’hui' : offset === -1 ? 'Hier' : cap(er(fmt(start, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })))
  if (view === 'semaine') {
    if (offset === 0) return 'Cette semaine'
    if (offset === -1) return 'Semaine dernière'
    const end = iso(utc(start) + 6 * DAY)
    const sameMonth = start.slice(0, 7) === end.slice(0, 7)
    return `Du ${er(fmt(start, sameMonth ? { day: 'numeric' } : { day: 'numeric', month: 'short' }) + ' ')}au ${er(fmt(end, { day: 'numeric', month: 'short', year: 'numeric' }))}`
  }
  if (view === 'mois') return cap(fmt(start, { month: 'long', year: 'numeric' }))
  return start.slice(0, 4)
}
const PREV_WORD: Record<View, string> = { jour: 'la veille', semaine: 'la semaine précédente', mois: 'le mois précédent', annee: 'l’année précédente' }
const UNIT: Record<View, string> = { jour: 'heure', semaine: 'jour', mois: 'jour', annee: 'mois' }
const compact = (n: number) => (n >= 1e6 ? `${(n / 1e6).toFixed(1).replace('.', ',').replace(',0', '')} M` : n >= 1e3 ? `${Math.round(n / 1e3)} k` : `${n}`)

async function fetchSeries(from: string, to: string, group: string): Promise<Row[]> {
  const { data, error } = await supabase.rpc('admin_stats_series', { p_from: from, p_to: to, p_group: group })
  if (error) throw new Error(error.message)
  return ((data ?? []) as Row[]).map((r) => ({ ...r, bucket: String(r.bucket).slice(0, 10), revenue: Number(r.revenue) }))
}

async function fetchHours(day: string): Promise<Row[]> {
  const { data, error } = await supabase.rpc('admin_stats_hours', { p_day: day })
  if (error) throw new Error(error.message)
  return ((data ?? []) as (Omit<Row, 'bucket'> & { hour: number })[]).map((r) => ({ ...r, bucket: String(r.hour).padStart(2, '0'), revenue: Number(r.revenue) }))
}
const fetchPeriod = (view: View, start: string, end: string, group: string) => (view === 'jour' ? fetchHours(start) : fetchSeries(start, end, group))

let firstDateCache: Promise<string | null> | null = null
const firstDate = () => (firstDateCache ??= Promise.resolve(supabase.rpc('admin_stats_first_date')).then(({ data }) => (data ? String(data).slice(0, 10) : null), () => null))

export default function TrendChart({ kind, reloadKey = 0 }: { kind: 'revenue' | 'stock'; reloadKey?: number }) {
  const [view, setView] = useState<View>('semaine')
  const [offset, setOffset] = useState(0)
  const [first, setFirst] = useState<string | null | undefined>(undefined)
  const [rows, setRows] = useState<Row[] | null>(null)
  const [prev, setPrev] = useState<Row[] | null>(null)
  const [err, setErr] = useState('')
  const [sel, setSel] = useState<number | null>(null)

  useEffect(() => { firstDateCache = null; firstDate().then(setFirst) }, [reloadKey])

  const start = periodStart(view, offset)
  const { group, keys } = useMemo(() => buckets(view, start), [view, start])
  const end = periodEnd(view, start, keys)
  const canPrev = !!first && start > first
  const canNext = offset < 0

  useEffect(() => {
    let alive = true
    setRows(null); setErr(''); setSel(null)
    const prevStart = periodStart(view, offset - 1)
    const prevEnd = iso(utc(start) - DAY)
    Promise.all([fetchPeriod(view, view === 'jour' ? start : keys[0], end, group), fetchPeriod(view, prevStart, prevEnd, group)])
      .then(([a, b]) => { if (alive) { setRows(a); setPrev(b) } })
      .catch((e) => alive && setErr(errMsg(e)))
    return () => { alive = false }
  }, [view, offset, start, end, group, keys, reloadKey])

  const today = todayIso()
  const data: Bucket[] = useMemo(() => keys.map((k) => {
    const r = rows?.find((x) => x.bucket === k) ?? { bucket: k, revenue: 0, n_orders: 0, n_cancelled: 0, qty_in: 0, qty_out: 0 }
    const curKey = group === 'hour' ? (start === today ? String(new Date().getUTCHours()).padStart(2, '0') : start < today ? '99' : '') : group === 'day' ? today : today.slice(0, 7) + '-01'
    return {
      ...r,
      label: view === 'jour' ? `${Number(k)}h` : view === 'semaine' ? `${fmt(k, { weekday: 'short' }).replace('.', '')} ${fmt(k, { day: 'numeric' })}` : view === 'mois' ? fmt(k, { day: 'numeric' }) : fmt(k, { month: 'short' }).replace('.', ''),
      full: group === 'hour' ? `${cap(er(fmt(start, { weekday: 'long', day: 'numeric', month: 'long' })))}, de ${Number(k)}h à ${Number(k) + 1}h` : group === 'day' ? cap(er(fmt(k, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }))) : cap(fmt(k, { month: 'long', year: 'numeric' })),
      current: k === curKey, future: k > curKey,
    }
  }), [keys, rows, group, view, today, start])

  const sum = (rs: Row[] | null, f: (r: Row) => number) => (rs ?? []).reduce((a, r) => a + f(r), 0)
  const main = kind === 'revenue' ? (r: Row) => r.revenue : (r: Row) => r.qty_out
  const total = sum(rows, main), totalPrev = prev ? sum(prev, main) : null
  const delta = totalPrev ? Math.round(((total - totalPrev) / totalPrev) * 100) : null
  const max = Math.max(1, ...data.map((c) => (kind === 'revenue' ? c.revenue : Math.max(c.qty_in, c.qty_out))))
  const showLabel = (i: number) => (view === 'mois' ? i === 0 || (i + 1) % 5 === 0 || i === data.length - 1 : view === 'jour' ? i % 3 === 0 : true)
  const picked = sel !== null ? data[sel] : null

  const changeView = (v: View) => { setView(v); setOffset(0) }
  const jump = (date: string) => { if (!date) return; const o = offsetFor(view, date); setOffset(Math.min(0, o)) }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-semibold">{kind === 'revenue' ? 'Chiffre d’affaires' : 'Mouvements de stock'} par {UNIT[view]}</p>
          <p className="text-xs text-ink-400">{kind === 'revenue' ? 'Hors commandes annulées' : 'Articles entrés et sortis'}</p>
        </div>
        {kind === 'stock' && <div className="flex gap-3 text-[11px] text-ink-500"><span className="flex items-center gap-1"><i className="h-2 w-2 rounded-sm bg-emerald-500" />Entrées</span><span className="flex items-center gap-1"><i className="h-2 w-2 rounded-sm bg-orange-500" />Sorties</span></div>}
      </div>

      {/* Choix de la vue */}
      <div role="tablist" aria-label="Période du graphique" className="mt-3 flex gap-1 overflow-x-auto rounded-xl bg-ivory-200 p-1 text-[11px] font-bold">
        {VIEWS.map((v) => (
          <button key={v.id} type="button" role="tab" aria-selected={view === v.id} onClick={() => changeView(v.id)} className={cn('shrink-0 flex-1 whitespace-nowrap rounded-lg px-2 py-1.5 transition', view === v.id ? 'bg-white text-ink shadow-sm' : 'text-ink-500 hover:text-ink')}>{v.label}</button>
        ))}
      </div>

      {/* Navigation dans le temps */}
      <div className="mt-2 flex items-center gap-1.5">
        <button type="button" aria-label="Période précédente" disabled={!canPrev} onClick={() => setOffset((o) => o - 1)} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-ink/10 bg-white transition hover:border-gold disabled:opacity-30"><ChevronLeft size={16} /></button>
        <p data-testid="period-label" className="min-w-0 flex-1 truncate text-center text-sm font-semibold">{periodLabel(view, start, offset)}</p>
        <button type="button" aria-label="Période suivante" disabled={!canNext} onClick={() => setOffset((o) => o + 1)} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-ink/10 bg-white transition hover:border-gold disabled:opacity-30"><ChevronRight size={16} /></button>
        <>
            {offset !== 0 && <button type="button" onClick={() => setOffset(0)} className="shrink-0 rounded-lg border border-ink/10 bg-white px-2 py-1.5 text-[11px] font-bold text-gold-dark hover:border-gold">Actuel</button>}
            <label className="relative grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-lg border border-ink/10 bg-white hover:border-gold" title="Aller à une date">
              <CalendarDays size={15} />
              <input type="date" aria-label="Aller à une date" max={today} min={first ?? undefined} onChange={(e) => jump(e.target.value)} className="absolute inset-0 cursor-pointer opacity-0" />
            </label>
        </>
      </div>

      {/* Total de la période + comparaison */}
      <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        {kind === 'revenue'
          ? <><span data-testid="period-total" className="text-xl font-semibold tabular-nums">{rows ? fcfa(total) : '…'}</span><span className="text-xs text-ink-500">{rows ? `${sum(rows, (r) => r.n_orders)} commande(s)` : ''}</span></>
          : <><span data-testid="period-total" className="text-xl font-semibold tabular-nums"><span className="text-emerald-700">+{rows ? sum(rows, (r) => r.qty_in) : '…'}</span> <span className="text-ink/20">/</span> <span className="text-orange-600">−{rows ? total : '…'}</span></span><span className="text-xs text-ink-500">articles entrés / sortis</span></>}
        {rows && (delta !== null
          ? <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-bold', kind === 'stock' ? 'bg-ivory-200 text-ink-700' : delta >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700')}>{delta >= 0 ? '▲' : '▼'} {Math.abs(delta)} % {kind === 'stock' ? 'de sorties ' : ''}vs {PREV_WORD[view]}</span>
          : <span className="text-[11px] text-ink-400">Rien sur {PREV_WORD[view]}</span>)}
        {offset === 0 && <span className="text-[11px] text-ink-400">(période en cours)</span>}
      </div>

      {/* Graphique */}
      {err ? <p className="mt-4 rounded-lg bg-red-50 p-3 text-xs text-red-700">{err}</p> : (
        <div className="relative mt-3">
          <span className="pointer-events-none absolute left-0 top-0 text-[9px] text-ink-300">{kind === 'revenue' ? compact(max) : max}</span>
          <div className="pointer-events-none absolute inset-x-0 top-[calc(50%-10px)] border-t border-dashed border-ink/10" />
          {!rows && <div className="absolute inset-0 z-10 grid place-items-center"><Loader2 size={20} className="animate-spin text-gold" /></div>}
          <div className={cn('flex h-44 items-end gap-[3px] pt-3 transition-opacity', !rows && 'opacity-30')}>
            {data.map((c, i) => (
              <button key={c.bucket} type="button" onClick={() => setSel(sel === i ? null : i)} disabled={c.future}
                title={kind === 'revenue' ? `${c.full} : ${fcfa(c.revenue)} · ${c.n_orders} commande(s)` : `${c.full} : +${c.qty_in} entrées / −${c.qty_out} sorties`}
                className={cn('group flex h-full min-w-0 flex-1 flex-col justify-end rounded-t outline-none', sel === i && 'bg-ivory-200/80', c.future && 'cursor-default opacity-40')}>
                {kind === 'revenue'
                  ? <div className={cn('w-full rounded-t transition', c.current ? 'bg-gold' : 'bg-gold/60 group-hover:bg-gold/90', sel === i && 'bg-gold-dark')} style={{ height: `${(c.revenue / max) * 100}%`, minHeight: c.revenue ? 4 : 1 }} />
                  : <div className="flex w-full flex-1 items-end gap-px">
                      <div className={cn('flex-1 rounded-t', c.current || sel === i ? 'bg-emerald-600' : 'bg-emerald-500/70')} style={{ height: `${(c.qty_in / max) * 100}%`, minHeight: c.qty_in ? 4 : 1 }} />
                      <div className={cn('flex-1 rounded-t', c.current || sel === i ? 'bg-orange-600' : 'bg-orange-500/70')} style={{ height: `${(c.qty_out / max) * 100}%`, minHeight: c.qty_out ? 4 : 1 }} />
                    </div>}
                <span className={cn('mt-1 h-3 text-center text-[9px] leading-3', view === 'jour' ? 'self-center overflow-visible whitespace-nowrap' : 'truncate', c.current ? 'font-bold text-ink' : 'text-ink-400')}>{showLabel(i) ? c.label : ''}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Détail de la barre choisie */}
      <p data-testid="bar-detail" className="mt-2 min-h-[18px] text-xs text-ink-500">
        {picked
          ? <><b className="text-ink">{picked.full}</b> — {kind === 'revenue'
              ? <>{fcfa(picked.revenue)} · {picked.n_orders} commande(s){picked.n_cancelled ? ` · ${picked.n_cancelled} annulée(s)` : ''}</>
              : <>+{picked.qty_in} entré(s) · −{picked.qty_out} sorti(s)</>}</>
          : <span className="text-ink-300">Touchez une barre pour voir le détail.</span>}
      </p>
    </div>
  )
}
