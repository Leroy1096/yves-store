import { Link } from 'react-router-dom'
import { ArrowDownToLine, ArrowUpFromLine, ClipboardCheck, Download, Loader2, PackagePlus } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Img } from '../../components/ui'
import NewProduct from './NewProduct'
import { refreshCatalog } from '../../lib/catalog'
import { cn } from '../../lib/format'
import { supabase } from '../../lib/supabase'
import {
  Badge, Card, CATEGORY_FR, dateTime, downloadCsv, Empty, ErrorBox, errMsg, fetchCatalog, fetchMovements, Loading, MOVE_KIND, PageHead, Pills, productInfo, SearchInput, Stat,
  type CatalogRow, type Movement,
} from './shared'

type Kind = 'entree' | 'sortie' | 'ajustement'
type Period = '7j' | '30j' | 'tout'
type HistFilter = 'tous' | 'entrees' | 'sorties'
const KINDS: { id: Kind; label: string; icon: typeof ArrowDownToLine; hint: string; cls: string }[] = [
  { id: 'entree', label: 'Entrée', icon: ArrowDownToLine, hint: 'Réception fournisseur, réassort…', cls: 'peer-checked:border-emerald-500 peer-checked:bg-emerald-50' },
  { id: 'sortie', label: 'Sortie', icon: ArrowUpFromLine, hint: 'Vente en boutique, casse, perte, cadeau…', cls: 'peer-checked:border-orange-500 peer-checked:bg-orange-50' },
  { id: 'ajustement', label: 'Inventaire', icon: ClipboardCheck, hint: 'Corriger : saisir la quantité réellement comptée', cls: 'peer-checked:border-ink peer-checked:bg-ivory-200' },
]
const stockState = (r: CatalogRow) => r.stock === 0 ? { label: 'Rupture', cls: 'bg-red-100 text-red-700' } : r.stock <= r.low_stock_threshold ? { label: 'Stock faible', cls: 'bg-orange-100 text-orange-800' } : { label: 'OK', cls: 'bg-emerald-100 text-emerald-800' }

export default function Stock({ onChange }: { onChange?: () => void }) {
  const [catalog, setCatalog] = useState<CatalogRow[] | null>(null)
  const [moves, setMoves] = useState<Movement[] | null>(null)
  const [err, setErr] = useState('')
  // Formulaire
  const [pid, setPid] = useState('')
  const [kind, setKind] = useState<Kind>('entree')
  const [qty, setQty] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [formErr, setFormErr] = useState('')
  const [okMsg, setOkMsg] = useState('')
  const [newId, setNewId] = useState('')
  const [mode, setMode] = useState<'nouveau' | 'existant'>('nouveau')
  // Filtres
  const [q, setQ] = useState('')
  const [period, setPeriod] = useState<Period>('30j')
  const [hist, setHist] = useState<HistFilter>('tous')

  const load = useCallback(() => {
    Promise.all([fetchCatalog(), fetchMovements()]).then(([c, m]) => { setCatalog(c); setMoves(m) }).catch((e) => setErr(errMsg(e)))
  }, [])
  useEffect(load, [load])

  const name = (id: string) => catalog?.find((c) => c.id === id)?.name ?? id
  const selected = catalog?.find((c) => c.id === pid)
  const n = parseInt(qty, 10)
  const preview = selected && Number.isFinite(n) ? (kind === 'entree' ? selected.stock + n : kind === 'sortie' ? selected.stock - n : n) : null

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setFormErr(''); setOkMsg('')
    if (!selected) return setFormErr('Choisissez un article.')
    if (!Number.isFinite(n) || n < 0 || (kind !== 'ajustement' && n === 0)) return setFormErr('Saisissez une quantité valide.')
    if (kind === 'sortie' && n > selected.stock) return setFormErr(`Stock insuffisant : ${selected.stock} en stock.`)
    setBusy(true)
    const { data, error } = await supabase.rpc('admin_stock_move', { p_id: selected.id, p_kind: kind, p_qty: n, p_note: note || null })
    setBusy(false)
    if (error) return setFormErr(errMsg(error))
    const row = data as CatalogRow
    setCatalog((cs) => cs?.map((c) => (c.id === row.id ? row : c)) ?? null)
    setOkMsg(`${KINDS.find((k) => k.id === kind)!.label} enregistrée : « ${row.name} » → ${row.stock} en stock.`)
    setQty(''); setNote('')
    fetchMovements().then(setMoves).catch(() => {})
    void refreshCatalog(); onChange?.()
  }

  const from = period === 'tout' ? 0 : Date.now() - (period === '7j' ? 7 : 30) * 86400000
  const pMoves = useMemo(() => (moves ?? []).filter((m) => new Date(m.created_at).getTime() >= from), [moves, from])
  const totals = useMemo(() => ({
    in: pMoves.filter((m) => m.qty > 0).reduce((a, m) => a + m.qty, 0),
    out: pMoves.filter((m) => m.qty < 0).reduce((a, m) => a - m.qty, 0),
    sold: pMoves.filter((m) => m.kind === 'vente').reduce((a, m) => a - m.qty, 0),
    received: pMoves.filter((m) => m.kind === 'entree').reduce((a, m) => a + m.qty, 0),
  }), [pMoves])
  const histList = useMemo(() => {
    const s = q.trim().toLowerCase()
    return pMoves.filter((m) => (hist === 'tous' || (hist === 'entrees' ? m.qty > 0 : m.qty < 0)) && (!s || name(m.product_id).toLowerCase().includes(s) || (m.note ?? '').toLowerCase().includes(s) || (m.order_id ?? '').toLowerCase().includes(s)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pMoves, hist, q, catalog])
  const stockList = useMemo(() => [...(catalog ?? [])].filter((c) => c.active).sort((a, b) => (a.stock - a.low_stock_threshold) - (b.stock - b.low_stock_threshold)), [catalog])

  const exportCsv = () => downloadCsv(`mouvements-stock-${new Date().toISOString().slice(0, 10)}.csv`, [
    ['Date', 'Article', 'Type', 'Quantité', 'Stock après', 'Note', 'Commande'],
    ...histList.map((m) => [new Date(m.created_at).toLocaleString('fr-FR'), name(m.product_id), MOVE_KIND[m.kind].label, m.qty, m.stock_after, m.note, m.order_id]),
  ])

  if (err) return <ErrorBox msg={err} />
  if (!catalog || !moves) return <Loading />
  return (
    <>
      <PageHead title="Stock" sub="Entrées et sorties d’articles. Les ventes du site et les annulations sont comptées automatiquement." actions={<Pills value={period} onChange={setPeriod} options={[{ id: '7j', label: '7 jours' }, { id: '30j', label: '30 jours' }, { id: 'tout', label: 'Tout' }]} />} />
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Entrées" value={`+${totals.in}`} hint={`dont ${totals.received} réceptionnés`} icon={<ArrowDownToLine size={16} />} tone="green" />
        <Stat label="Sorties" value={`−${totals.out}`} hint={`dont ${totals.sold} vendus sur le site`} icon={<ArrowUpFromLine size={16} />} tone="orange" />
        <Stat label="En stock" value={catalog.filter((c) => c.active).reduce((a, c) => a + c.stock, 0)} hint="articles en vente" />
        <Stat label="Ruptures / faibles" value={`${catalog.filter((c) => c.active && c.stock === 0).length} / ${catalog.filter((c) => c.active && c.stock > 0 && c.stock <= c.low_stock_threshold).length}`} tone="red" />
      </div>

      <div className="grid gap-5 lg:grid-cols-[380px_1fr]">
        <Card className={cn('h-fit p-5', mode === 'existant' && 'lg:sticky lg:top-6')}>
          <p className="flex items-center gap-2 font-semibold"><PackagePlus size={18} className="text-gold-dark" /> Ajouter un produit</p>
          <div role="tablist" className="mt-3 grid grid-cols-2 gap-1 rounded-xl bg-ivory-200 p-1 text-xs font-bold">
            {([['nouveau', 'Nouveau produit'], ['existant', 'Déjà en boutique']] as const).map(([id, label]) => (
              <button key={id} type="button" role="tab" aria-selected={mode === id} onClick={() => { setMode(id); setFormErr(''); setOkMsg('') }} className={cn('rounded-lg px-2 py-2 transition', mode === id ? 'bg-white text-ink shadow-sm' : 'text-ink-500 hover:text-ink')}>{label}</button>
            ))}
          </div>
          <p className="mt-2 text-xs text-ink-400">{mode === 'nouveau' ? 'Un article qui n’est pas encore sur le site : il sera mis en vente immédiatement. Vous pouvez aussi créer une nouvelle catégorie.' : 'Réassort, sortie ou inventaire d’un article déjà en vente.'}</p>
          {okMsg && mode === 'nouveau' && <div className="mt-3 rounded-lg bg-emerald-50 p-2.5 text-xs font-medium text-emerald-800">✓ {okMsg}{newId && <Link to={`/gerant/nouveautes?produits=${encodeURIComponent(newId)}`} className="mt-2 flex w-fit items-center gap-1.5 rounded-lg bg-ink px-3 py-1.5 font-bold text-ivory" data-testid="announce-new">📣 Annoncer aux abonnés</Link>}</div>}
          {mode === 'nouveau' && <NewProduct onCreated={(row, msg) => { setOkMsg(msg); setNewId(row.id); load(); onChange?.() }} />}
          {mode === 'existant' && <form onSubmit={submit} className="mt-4 space-y-4">
            <div>
              <label className="label" htmlFor="st-product">Article</label>
              <select id="st-product" value={pid} onChange={(e) => { setPid(e.target.value); setFormErr(''); setOkMsg('') }} className="input">
                <option value="">— Choisir un article —</option>
                {Object.entries(CATEGORY_FR).map(([k, v]) => (
                  <optgroup key={k} label={v}>
                    {catalog.filter((c) => c.category === k).map((c) => <option key={c.id} value={c.id}>{c.name} ({c.stock}){!c.active ? ' — retiré' : ''}</option>)}
                  </optgroup>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {KINDS.map((k) => (
                <label key={k.id} className="cursor-pointer">
                  <input type="radio" name="kind" className="peer sr-only" checked={kind === k.id} onChange={() => setKind(k.id)} />
                  <span className={cn('flex flex-col items-center gap-1 rounded-xl border-2 border-ink/10 p-2.5 text-xs font-bold transition', k.cls)}><k.icon size={17} />{k.label}</span>
                </label>
              ))}
            </div>
            <p className="-mt-2 text-xs text-ink-400">{KINDS.find((k) => k.id === kind)!.hint}</p>
            <div>
              <label className="label" htmlFor="st-qty">{kind === 'ajustement' ? 'Quantité comptée' : 'Quantité'}</label>
              <input id="st-qty" value={qty} onChange={(e) => setQty(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" className="input tabular-nums" placeholder="0" />
              {selected && <p className="mt-1.5 text-xs text-ink-500">Stock actuel : <b>{selected.stock}</b>{preview !== null && <> → après : <b className={cn(preview < 0 ? 'text-red-600' : 'text-ink')}>{preview}</b></>}</p>}
            </div>
            <div>
              <label className="label" htmlFor="st-note">Note (facultatif)</label>
              <input id="st-note" value={note} onChange={(e) => setNote(e.target.value.slice(0, 200))} className="input" placeholder={kind === 'entree' ? 'Ex. : fournisseur, n° de facture' : kind === 'sortie' ? 'Ex. : vente boutique Agboville, casse' : 'Ex. : inventaire mensuel'} />
            </div>
            {formErr && <p className="rounded-lg bg-red-50 p-2.5 text-xs font-medium text-red-700">{formErr}</p>}
            {okMsg && <p className="rounded-lg bg-emerald-50 p-2.5 text-xs font-medium text-emerald-800">✓ {okMsg}</p>}
            <button disabled={busy} className="btn-dark w-full">{busy ? <Loader2 size={16} className="animate-spin" /> : 'Enregistrer'}</button>
          </form>}
        </Card>

        <div className="min-w-0 space-y-5">
          <Card className="overflow-hidden">
            <p className="border-b border-ink/10 px-5 py-3.5 font-semibold">État du stock <span className="text-xs font-normal text-ink-400">(les plus urgents en premier)</span></p>
            <div className="max-h-[420px] overflow-y-auto">
              <table className="w-full text-sm">
                <tbody className="divide-y divide-ink/5">
                  {stockList.map((c) => { const s = stockState(c); const info = productInfo(c.id); return (
                    <tr key={c.id} className="hover:bg-ivory-100">
                      <td className="py-2 pl-4 pr-2">{info && <Img src={info.images[0]} alt="" className="h-9 w-8 rounded object-cover" />}</td>
                      <td className="py-2 pr-2"><span className="line-clamp-1 font-medium">{c.name}</span><span className="text-xs text-ink-400">{CATEGORY_FR[c.category]}</span></td>
                      <td className="py-2 pr-2 text-right font-semibold tabular-nums">{c.stock}</td>
                      <td className="py-2 pr-2"><Badge cls={s.cls}>{s.label}</Badge></td>
                      <td className="py-2 pr-4 text-right"><button onClick={() => { setPid(c.id); setKind('entree'); window.scrollTo({ top: 0, behavior: 'smooth' }) }} className="text-xs font-semibold text-gold-dark hover:underline">+ Entrée</button></td>
                    </tr>
                  ) })}
                </tbody>
              </table>
            </div>
          </Card>

          <Card className="overflow-hidden">
            <div className="flex flex-wrap items-center gap-3 border-b border-ink/10 px-5 py-3.5">
              <p className="mr-auto font-semibold">Historique des mouvements</p>
              <button onClick={exportCsv} className="inline-flex items-center gap-1.5 rounded-full border border-ink/15 px-3 py-1.5 text-xs font-semibold hover:border-ink"><Download size={13} /> Excel</button>
            </div>
            <div className="flex flex-wrap items-center gap-3 px-5 pt-4">
              <SearchInput value={q} onChange={setQ} placeholder="Article, note ou n° de commande…" />
              <Pills value={hist} onChange={setHist} options={[{ id: 'tous', label: 'Tous' }, { id: 'entrees', label: 'Entrées' }, { id: 'sorties', label: 'Sorties' }]} />
            </div>
            <div className="p-5">
              {histList.length === 0 ? <Empty>Aucun mouvement sur la période.</Empty> : (
                <ul className="divide-y divide-ink/5">
                  {histList.slice(0, 150).map((m) => (
                    <li key={m.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5 text-sm">
                      <span className={cn('w-14 text-right font-bold tabular-nums', m.qty > 0 ? 'text-emerald-700' : m.qty < 0 ? 'text-orange-700' : 'text-ink-400')}>{m.qty > 0 ? `+${m.qty}` : m.qty}</span>
                      <span className="min-w-0 flex-1"><span className="line-clamp-1 font-medium">{name(m.product_id)}</span><span className="text-xs text-ink-400">{dateTime(m.created_at)}{m.note ? ` · ${m.note}` : ''}</span></span>
                      <Badge cls={MOVE_KIND[m.kind].cls}>{MOVE_KIND[m.kind].label}</Badge>
                      <span className="w-20 text-right text-xs text-ink-400">stock : {m.stock_after}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Card>
        </div>
      </div>
    </>
  )
}
