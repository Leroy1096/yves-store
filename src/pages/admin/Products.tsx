import { Check, EyeOff, Loader2, RotateCcw, Save } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Img } from '../../components/ui'
import { refreshCatalog } from '../../lib/catalog'
import { cn, fcfa } from '../../lib/format'
import { supabase } from '../../lib/supabase'
import { Badge, CATEGORY_FR, Empty, ErrorBox, errMsg, fetchCatalog, Loading, PageHead, Pills, productInfo, SearchInput, type CatalogRow } from './shared'

type Vis = 'en_vente' | 'retires' | 'tous'
const toInt = (s: string) => { const n = parseInt(s.replace(/\D/g, ''), 10); return Number.isFinite(n) ? n : null }

function ProductRow({ r, onSaved }: { r: CatalogRow; onSaved: (r: CatalogRow) => void }) {
  const info = productInfo(r.id)
  const [price, setPrice] = useState(String(r.price))
  const [compare, setCompare] = useState(r.compare_at ? String(r.compare_at) : '')
  const [busy, setBusy] = useState('')
  const [err, setErr] = useState('')
  const [ok, setOk] = useState(false)
  useEffect(() => { setPrice(String(r.price)); setCompare(r.compare_at ? String(r.compare_at) : '') }, [r.price, r.compare_at])
  const p = toInt(price), c = compare.trim() ? toInt(compare) : null
  const dirty = p !== r.price || c !== (r.compare_at ?? null)
  const off = p && c && c > p ? Math.round((1 - p / c) * 100) : 0

  const save = async (active = r.active, key = 'save') => {
    setErr(''); setOk(false)
    if (!p || p < 100) return setErr('Prix de vente invalide.')
    if (c !== null && c <= p) return setErr('Le prix barré doit être supérieur au prix de vente (ou laissez vide).')
    setBusy(key)
    const { data, error } = await supabase.rpc('admin_update_product', { p_id: r.id, p_price: p, p_compare_at: c, p_active: active, p_low: null })
    setBusy('')
    if (error) return setErr(errMsg(error))
    onSaved(data as CatalogRow); setOk(true); setTimeout(() => setOk(false), 2000)
  }

  return (
    <div className={cn('grid items-center gap-3 rounded-2xl border bg-white p-3 sm:grid-cols-[56px_1fr_auto] sm:p-4', r.active ? 'border-ink/10' : 'border-dashed border-ink/20 bg-ivory-100 opacity-80')}>
      {info ? <Img src={info.images[0]} alt="" className={cn('hidden h-16 w-14 rounded-lg object-cover sm:block', !r.active && 'grayscale')} /> : <span className="hidden h-16 w-14 rounded-lg bg-ivory-200 sm:block" />}
      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-2 font-semibold">
          {r.name}
          {!r.active && <Badge cls="bg-ink/10 text-ink-700">Retiré du site</Badge>}
          {r.stock === 0 && r.active && <Badge cls="bg-red-100 text-red-700">Épuisé</Badge>}
        </p>
        <p className="text-xs text-ink-400">{CATEGORY_FR[r.category] ?? r.category} · Réf. {r.id.toUpperCase()} · Stock : <b className={cn(r.stock <= r.low_stock_threshold ? 'text-orange-700' : 'text-ink-500')}>{r.stock}</b></p>
        {err && <p className="mt-1 text-xs font-medium text-red-600">{err}</p>}
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <label className="block">
          <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-ink-400">Prix de vente</span>
          <div className="relative"><input value={price} onChange={(e) => setPrice(e.target.value.replace(/\D/g, ''))} inputMode="numeric" className="w-28 rounded-lg border border-ink/15 py-2 pl-3 pr-11 text-sm font-semibold tabular-nums outline-none focus:border-gold" aria-label={`Prix de ${r.name}`} /><span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-ink-400">FCFA</span></div>
        </label>
        <label className="block">
          <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-ink-400">Prix barré {off > 0 && <span className="text-red-600">−{off} %</span>}</span>
          <div className="relative"><input value={compare} onChange={(e) => setCompare(e.target.value.replace(/\D/g, ''))} inputMode="numeric" placeholder="aucun" className="w-28 rounded-lg border border-ink/15 py-2 pl-3 pr-11 text-sm tabular-nums text-ink-500 outline-none focus:border-gold" aria-label={`Prix barré de ${r.name}`} /><span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-ink-400">FCFA</span></div>
        </label>
        <button onClick={() => save()} disabled={!dirty || !!busy} className={cn('inline-flex h-[38px] items-center gap-1.5 rounded-lg px-3.5 text-xs font-bold transition', dirty ? 'bg-ink text-ivory hover:bg-gold hover:text-ink' : ok ? 'bg-emerald-100 text-emerald-700' : 'bg-ivory-200 text-ink-400')}>
          {busy === 'save' ? <Loader2 size={14} className="animate-spin" /> : ok ? <Check size={14} /> : <Save size={14} />} {ok ? 'Enregistré' : 'Enregistrer'}
        </button>
        {r.active ? (
          <button onClick={() => save(false, 'toggle')} disabled={!!busy} className="inline-flex h-[38px] items-center gap-1.5 rounded-lg px-3 text-xs font-bold text-red-600 ring-1 ring-red-200 hover:bg-red-50">
            {busy === 'toggle' ? <Loader2 size={14} className="animate-spin" /> : <EyeOff size={14} />} Retirer
          </button>
        ) : (
          <button onClick={() => save(true, 'toggle')} disabled={!!busy} className="inline-flex h-[38px] items-center gap-1.5 rounded-lg px-3 text-xs font-bold text-emerald-700 ring-1 ring-emerald-200 hover:bg-emerald-50">
            {busy === 'toggle' ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />} Remettre en vente
          </button>
        )}
      </div>
    </div>
  )
}

export default function Products({ onChange }: { onChange?: () => void }) {
  const [rows, setRows] = useState<CatalogRow[] | null>(null)
  const [err, setErr] = useState('')
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('tous')
  const [vis, setVis] = useState<Vis>('en_vente')
  const load = useCallback(() => { fetchCatalog().then(setRows).catch((e) => setErr(errMsg(e))) }, [])
  useEffect(load, [load])

  const list = useMemo(() => {
    const s = q.trim().toLowerCase()
    return (rows ?? []).filter((r) => (cat === 'tous' || r.category === cat) && (vis === 'tous' || (vis === 'en_vente' ? r.active : !r.active)) && (!s || r.name.toLowerCase().includes(s) || r.id.includes(s)))
  }, [rows, q, cat, vis])
  const saved = (n: CatalogRow) => { setRows((rs) => rs?.map((x) => (x.id === n.id ? n : x)) ?? null); void refreshCatalog(); onChange?.() }
  const active = rows?.filter((r) => r.active).length ?? 0

  if (err) return <ErrorBox msg={err} />
  return (
    <>
      <PageHead title="Produits & prix" sub={<>Modifiez les prix ou retirez un article : le changement s’applique <b>immédiatement</b> sur le site. {rows && <>· {active} en vente, {rows.length - active} retiré{rows.length - active > 1 ? 's' : ''}</>}</>} />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <SearchInput value={q} onChange={setQ} placeholder="Rechercher un article…" />
        <select value={cat} onChange={(e) => setCat(e.target.value)} className="rounded-xl border border-ink/15 bg-white px-3 py-2.5 text-sm">
          <option value="tous">Toutes catégories</option>
          {Object.entries(CATEGORY_FR).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>
      <div className="mb-5"><Pills value={vis} onChange={setVis} options={[{ id: 'en_vente', label: 'En vente', count: active }, { id: 'retires', label: 'Retirés', count: (rows?.length ?? 0) - active }, { id: 'tous', label: 'Tous', count: rows?.length ?? 0 }]} /></div>
      {!rows ? <Loading /> : list.length === 0 ? <Empty>{vis === 'retires' ? 'Aucun article retiré.' : 'Aucun article trouvé.'}</Empty> : (
        <div className="space-y-2.5">{list.map((r) => <ProductRow key={r.id} r={r} onSaved={saved} />)}</div>
      )}
      <p className="mt-6 text-xs text-ink-400">Astuce : le prix barré (facultatif) affiche une promotion « −X % » sur le site. Un article retiré n’est plus visible ni commandable, mais vous pouvez le remettre en vente à tout moment. Prix moyen affiché : {rows && rows.length ? fcfa(Math.round(rows.reduce((a, r) => a + r.price, 0) / rows.length)) : '—'}.</p>
    </>
  )
}
