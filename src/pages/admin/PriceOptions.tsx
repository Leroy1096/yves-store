import { Loader2, Plus, Save, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import { fcfa } from '../../lib/format'
import type { PriceOption } from '../../lib/options'
import { supabase } from '../../lib/supabase'
import { errMsg, type CatalogRow } from './shared'

type Choice = { label: string; delta: string }
type Group = { group: string; choices: Choice[] }
const toGroups = (o?: PriceOption[] | null): Group[] => (o ?? []).map((g) => ({ group: g.group, choices: g.choices.map((c) => ({ label: c.label, delta: c.delta ? String(c.delta) : '0' })) }))
const num = (s: string) => { const n = parseInt(s.replace(/[^\d-]/g, ''), 10); return Number.isFinite(n) ? n : NaN }

/** Modèles rapides pour les perruques */
const TEMPLATES: { name: string; g: Group }[] = [
  { name: 'Longueur (perruque)', g: { group: 'Longueur', choices: [['12 pouces', '0'], ['16 pouces', '8000'], ['20 pouces', '15000'], ['24 pouces', '25000']].map(([label, delta]) => ({ label, delta })) } },
  { name: 'Qualité', g: { group: 'Qualité', choices: [['Standard', '0'], ['Premium', '15000']].map(([label, delta]) => ({ label, delta })) } },
  { name: 'Densité', g: { group: 'Densité', choices: [['150 %', '0'], ['180 %', '7000'], ['250 %', '18000']].map(([label, delta]) => ({ label, delta })) } },
]

/** Éditeur « Prix par option » : chaque choix ajoute (ou retire) un montant au prix de base */
export default function PriceOptionsEditor({ r, onSaved, onClose }: { r: CatalogRow; onSaved: (r: CatalogRow) => void; onClose: () => void }) {
  const [groups, setGroups] = useState<Group[]>(() => toGroups(r.price_options))
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const setG = (i: number, patch: Partial<Group>) => setGroups((gs) => gs.map((g, k) => (k === i ? { ...g, ...patch } : g)))
  const setC = (i: number, j: number, patch: Partial<Choice>) => setG(i, { choices: groups[i].choices.map((c, k) => (k === j ? { ...c, ...patch } : c)) })
  const addTemplate = (t: Group) => { if (groups.length >= 3 || groups.some((g) => g.group.toLowerCase() === t.group.toLowerCase())) return; setGroups([...groups, JSON.parse(JSON.stringify(t))]) }

  const validate = (): PriceOption[] | string => {
    const out: PriceOption[] = []
    for (const g of groups) {
      const name = g.group.trim(); if (!name) return 'Donnez un nom à chaque option (ex. Longueur).'
      const cs = g.choices.filter((c) => c.label.trim())
      if (cs.length < 2) return `« ${name} » : il faut au moins 2 choix.`
      const labels = new Set<string>()
      const choices = []
      for (const c of cs) {
        const d = num(c.delta || '0'); const l = c.label.trim()
        if (labels.has(l)) return `« ${name} » : le choix « ${l} » est en double.`; labels.add(l)
        if (!Number.isFinite(d)) return `Montant invalide pour « ${l} ».`
        if (r.price + d < 100) return `« ${l} » : le prix final serait trop bas.`
        choices.push({ label: l, delta: d })
      }
      out.push({ group: name, choices })
    }
    return out
  }
  const save = async (clear = false) => {
    setErr('')
    const v = clear ? [] : validate()
    if (typeof v === 'string') return setErr(v)
    setBusy(true)
    const { data, error } = await supabase.rpc('admin_set_price_options', { p_id: r.id, p_options: v })
    setBusy(false)
    if (error) return setErr(errMsg(error))
    onSaved(data as CatalogRow); onClose()
  }
  // Aperçu : prix mini / maxi
  const v = validate(); const range = typeof v === 'string' ? null : v.reduce((a, g) => ({ min: a.min + Math.min(...g.choices.map((c) => c.delta)), max: a.max + Math.max(...g.choices.map((c) => c.delta)) }), { min: r.price, max: r.price })

  return (
    <div className="rounded-2xl border border-gold/40 bg-gold/5 p-4 sm:col-span-3" data-testid="price-options-editor">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-semibold">Prix par option — {r.name}</p>
          <p className="text-xs text-ink-500">Prix de base : <b>{fcfa(r.price)}</b>. Chaque choix ajoute un supplément (0 = même prix). Le client choisit sur la fiche produit et le serveur recalcule le prix à la commande.</p>
        </div>
        <button type="button" onClick={onClose} aria-label="Fermer" className="rounded-full p-1.5 text-ink-400 hover:bg-white hover:text-ink"><X size={16} /></button>
      </div>

      {groups.length < 3 && (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-ink-500">Ajouter :</span>
          {TEMPLATES.filter((t) => !groups.some((g) => g.group.toLowerCase() === t.g.group.toLowerCase())).map((t) => (
            <button key={t.name} type="button" onClick={() => addTemplate(t.g)} className="rounded-full border border-gold/50 bg-white px-3 py-1 font-semibold text-gold-dark hover:bg-gold/10" data-testid="opt-template">+ {t.name}</button>
          ))}
          <button type="button" onClick={() => setGroups([...groups, { group: '', choices: [{ label: '', delta: '0' }, { label: '', delta: '' }] }])} className="rounded-full border border-ink/15 bg-white px-3 py-1 font-semibold hover:border-ink">+ Option personnalisée</button>
        </div>
      )}

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        {groups.map((g, i) => (
          <div key={i} className="min-w-0 rounded-xl border border-ink/10 bg-white p-3">
            <div className="flex items-center gap-2">
              <input value={g.group} onChange={(e) => setG(i, { group: e.target.value.slice(0, 30) })} placeholder="Nom (ex. Longueur)" className="min-w-0 flex-1 rounded-lg border border-ink/15 px-2.5 py-1.5 text-sm font-semibold outline-none focus:border-gold" aria-label="Nom de l’option" />
              <button type="button" onClick={() => setGroups(groups.filter((_, k) => k !== i))} className="rounded-lg p-1.5 text-ink-400 hover:bg-red-50 hover:text-red-600" aria-label="Supprimer cette option"><Trash2 size={15} /></button>
            </div>
            <div className="mt-2 space-y-1.5">
              {g.choices.map((c, j) => {
                const d = num(c.delta || '0')
                return (
                  <div key={j} className="flex items-center gap-1.5">
                    <input value={c.label} onChange={(e) => setC(i, j, { label: e.target.value.slice(0, 30) })} placeholder="Choix (ex. 20 pouces)" className="min-w-0 flex-1 rounded-lg border border-ink/15 px-2.5 py-1.5 text-sm outline-none focus:border-gold" aria-label="Choix" />
                    <div className="relative w-28 shrink-0">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-ink-400">+</span>
                      <input value={c.delta} onChange={(e) => setC(i, j, { delta: e.target.value.replace(/[^\d-]/g, '').slice(0, 8) })} inputMode="numeric" placeholder="0" className="w-full rounded-lg border border-ink/15 py-1.5 pl-5 pr-2 text-right text-sm tabular-nums outline-none focus:border-gold" aria-label="Supplément en FCFA" />
                    </div>
                    <span className="hidden w-24 shrink-0 text-right text-[11px] text-ink-500 sm:block">{Number.isFinite(d) ? `= ${fcfa(r.price + d)}` : '—'}</span>
                    <button type="button" onClick={() => setG(i, { choices: g.choices.filter((_, k) => k !== j) })} disabled={g.choices.length <= 2} className="rounded p-1 text-ink-300 hover:text-red-600 disabled:opacity-30" aria-label="Retirer ce choix"><X size={13} /></button>
                  </div>
                )
              })}
            </div>
            {g.choices.length < 12 && <button type="button" onClick={() => setG(i, { choices: [...g.choices, { label: '', delta: '' }] })} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-gold-dark hover:underline"><Plus size={12} /> Ajouter un choix</button>}
          </div>
        ))}
      </div>
      {!groups.length && <p className="mt-3 rounded-xl border border-dashed border-ink/20 bg-white p-4 text-center text-sm text-ink-500">Aucune option : le même prix pour tous. Cliquez sur « + Longueur (perruque) » pour commencer.</p>}

      {range && groups.length > 0 && <p className="mt-3 text-sm">Sur le site : <b>{range.min === range.max ? fcfa(range.min) : `de ${fcfa(range.min)} à ${fcfa(range.max)}`}</b>{range.min !== range.max && <span className="text-ink-500"> (affiché « Dès {fcfa(range.min)} » sur la carte produit)</span>}</p>}
      {err && <p className="mt-2 text-sm font-medium text-red-600">{err}</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={() => save()} disabled={busy} className="inline-flex items-center gap-1.5 rounded-lg bg-ink px-4 py-2 text-xs font-bold text-ivory hover:bg-gold hover:text-ink disabled:opacity-50" data-testid="opt-save">{busy ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Enregistrer les options</button>
        {!!r.price_options?.length && <button type="button" onClick={() => save(true)} disabled={busy} className="rounded-lg px-3 py-2 text-xs font-semibold text-red-600 ring-1 ring-red-200 hover:bg-red-50">Supprimer toutes les options</button>}
      </div>
    </div>
  )
}
