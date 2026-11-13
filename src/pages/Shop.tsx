import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown, SlidersHorizontal, X, Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import ProductCard from '../components/ProductCard'
import { Img, Page, Stars } from '../components/ui'
import { matches, searchText } from '../lib/search'
import { ageGroups, categories, products, subcategories, type AgeGroup, type CategoryId, type Gender } from '../data/products'
import { cn, fcfa } from '../lib/format'

const SORTS = {
  pertinence: 'Pertinence',
  nouveautes: 'Nouveautés',
  'prix-asc': 'Prix croissant',
  'prix-desc': 'Prix décroissant',
  notes: 'Mieux notés',
  populaires: 'Plus populaires',
} as const
type SortId = keyof typeof SORTS
const MIN_PRICE = Math.min(...products.map((p) => p.price))
const MAX_PRICE = Math.ceil(Math.max(...products.map((p) => p.price)) / 5000) * 5000
const list = (v: string | null) => (v ? v.split(',').filter(Boolean) : [])

function Section({ title, children, open = true }: { title: string; children: React.ReactNode; open?: boolean }) {
  const [o, setO] = useState(open)
  return (
    <div className="border-b border-ink/10 py-5">
      <button onClick={() => setO(!o)} className="flex w-full items-center justify-between text-xs font-semibold uppercase tracking-[0.16em]">{title}<ChevronDown size={16} className={cn('transition', o && 'rotate-180')} /></button>
      <AnimatePresence initial={false}>
        {o && <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden"><div className="pt-4">{children}</div></motion.div>}
      </AnimatePresence>
    </div>
  )
}
function Check({ checked, onChange, label, count }: { checked: boolean; onChange: () => void; label: string; count?: number }) {
  return (
  <label className="flex cursor-pointer items-center gap-3 py-1.5 text-sm">
    <span className={cn('grid h-[18px] w-[18px] place-items-center rounded-[5px] border transition', checked ? 'border-ink bg-ink' : 'border-ink/25')}>
      {checked && <svg width="10" height="10" viewBox="0 0 12 12"><path d="M2 6.5 5 9l5-6" stroke="#D9B56E" strokeWidth="2" fill="none" /></svg>}
    </span>
    <input type="checkbox" checked={checked} onChange={onChange} className="sr-only" />
    <span className="flex-1">{label}</span>
    {count !== undefined && <span className="text-xs text-ink-400">{count}</span>}
  </label>
)
}

export default function Shop() {
  const [sp, setSp] = useSearchParams()
  const [drawer, setDrawer] = useState(false)
  const [sortOpen, setSortOpen] = useState(false)

  const cats = list(sp.get('cat')) as CategoryId[]
  const genders = list(sp.get('genre')) as Gender[]
  const ages = list(sp.get('age')) as AgeGroup[]
  const maxPrice = Number(sp.get('prix') ?? MAX_PRICE)
  const minRating = Number(sp.get('note') ?? 0)
  const promo = sp.get('promo') === '1'
  const flash = sp.get('flash') === '1'
  const express = sp.get('express') === '1'
  const sub = sp.get('sub')
  const subObj = subcategories.find((x) => x.id === sub)
  const q = sp.get('q') ?? ''
  const sort = (sp.get('tri') as SortId) in SORTS ? (sp.get('tri') as SortId) : 'pertinence'

  const update = (k: string, v: string | null) => {
    const n = new URLSearchParams(sp)
    if (v === null || v === '') n.delete(k); else n.set(k, v)
    setSp(n, { replace: true })
  }
  const toggleIn = (k: string, cur: string[], v: string) => update(k, (cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v]).join(',') || null)
  const reset = () => setSp(sort !== 'pertinence' ? { tri: sort } : {}, { replace: true })

  useEffect(() => { document.body.style.overflow = drawer ? 'hidden' : '' }, [drawer])

  const filtered = useMemo(() => {
    let r = products.filter((p) =>
      (!cats.length || cats.includes(p.category)) &&
      (!genders.length || genders.includes(p.gender) || (p.gender === 'Unisexe' && genders.length > 0)) &&
      (!ages.length || p.ages.some((a) => ages.includes(a))) &&
      p.price <= maxPrice && p.rating >= minRating && (!promo || !!p.compareAt) &&
      (!flash || !!p.flash) && (!express || p.stock >= 20) && (!sub || p.sub === sub) &&
      (!q || matches(q, searchText(p))),
    )
    const s = [...r]
    if (sort === 'prix-asc') s.sort((a, b) => a.price - b.price)
    if (sort === 'prix-desc') s.sort((a, b) => b.price - a.price)
    if (sort === 'nouveautes') s.sort((a, b) => a.addedDaysAgo - b.addedDaysAgo)
    if (sort === 'notes') s.sort((a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount)
    if (sort === 'populaires') s.sort((a, b) => (b.sold ?? 0) - (a.sold ?? 0))
    if (sort === 'pertinence') s.sort((a, b) => Number(!!b.featured) - Number(!!a.featured))
    r = s
    return r
  }, [cats.join(), genders.join(), ages.join(), maxPrice, minRating, promo, flash, express, sub, q, sort])

  const activeCount = cats.length + genders.length + ages.length + (maxPrice < MAX_PRICE ? 1 : 0) + (minRating ? 1 : 0) + (promo ? 1 : 0) + (flash ? 1 : 0) + (express ? 1 : 0) + (sub ? 1 : 0)
  const title = subObj ? subObj.name : cats.length === 1 ? categories.find((c) => c.id === cats[0])!.name : q ? `Résultats pour « ${q} »` : flash ? 'Ventes Flash ⚡' : promo ? 'Promotions' : express ? 'Livraison en 24 h' : maxPrice <= 10000 ? 'Petits prix' : sort === 'nouveautes' ? 'Nouveautés' : genders.length === 1 ? `Mode ${genders[0]}` : 'Toute la boutique'
  const parentCat = subObj?.category ?? (cats.length === 1 ? cats[0] : null)
  const subRow = parentCat ? subcategories.filter((x) => x.category === parentCat) : subcategories

  const filters = (
    <div>
      <Section title="Catégorie">
        {categories.map((c) => <Check key={c.id} checked={cats.includes(c.id)} onChange={() => toggleIn('cat', cats, c.id)} label={c.name} count={products.filter((p) => p.category === c.id).length} />)}
      </Section>
      <Section title="Pour qui">
        {(['Homme', 'Femme', 'Unisexe'] as Gender[]).map((g) => <Check key={g} checked={genders.includes(g)} onChange={() => toggleIn('genre', genders, g)} label={g} />)}
      </Section>
      <Section title="Tranche d’âge">
        <div className="flex flex-wrap gap-2">
          {ageGroups.map((a) => (
            <button key={a.id} onClick={() => toggleIn('age', ages, a.id)} className={cn('chip', ages.includes(a.id) ? 'border-ink bg-ink text-ivory' : 'border-ink/15 hover:border-ink')}>{a.label}</button>
          ))}
        </div>
      </Section>
      <Section title="Prix maximum">
        <input type="range" min={5000} max={MAX_PRICE} step={2500} value={maxPrice} onChange={(e) => update('prix', Number(e.target.value) >= MAX_PRICE ? null : e.target.value)} className="w-full" />
        <div className="mt-2 flex justify-between text-xs text-ink-500"><span>{fcfa(MIN_PRICE)}</span><span className="font-semibold text-ink">{fcfa(maxPrice)}</span></div>
      </Section>
      <Section title="Note minimum">
        {[4.8, 4.5, 0].map((n) => (
          <label key={n} className="flex cursor-pointer items-center gap-3 py-1.5 text-sm">
            <input type="radio" name="note" checked={minRating === n} onChange={() => update('note', n ? String(n) : null)} className="accent-gold" />
            {n ? <><Stars value={n} size={13} /> <span>{n.toString().replace('.', ',')} et +</span></> : 'Toutes les notes'}
          </label>
        ))}
      </Section>
      <div className="py-5"><Check checked={promo} onChange={() => update('promo', promo ? null : '1')} label="En promotion uniquement" count={products.filter((p) => p.compareAt).length} /></div>
    </div>
  )

  const chips = [
    ...cats.map((c) => ({ l: categories.find((x) => x.id === c)!.name, x: () => toggleIn('cat', cats, c) })),
    ...genders.map((g) => ({ l: g, x: () => toggleIn('genre', genders, g) })),
    ...ages.map((a) => ({ l: `${a} ans`, x: () => toggleIn('age', ages, a) })),
    ...(maxPrice < MAX_PRICE ? [{ l: `≤ ${fcfa(maxPrice)}`, x: () => update('prix', null) }] : []),
    ...(minRating ? [{ l: `${minRating}★ et +`, x: () => update('note', null) }] : []),
    ...(promo ? [{ l: 'Promotions', x: () => update('promo', null) }] : []),
    ...(q ? [{ l: `« ${q} »`, x: () => update('q', null) }] : []),
    ...(subObj ? [{ l: subObj.name, x: () => update('sub', null) }] : []),
    ...(flash ? [{ l: 'Ventes flash', x: () => update('flash', null) }] : []),
    ...(express ? [{ l: 'Livraison 24 h', x: () => update('express', null) }] : []),
  ]

  return (
    <Page>
      <div className="border-b border-ink/5 bg-white">
        <div className="container-x pb-4 pt-3 sm:pt-4">
          <nav className="flex items-center gap-1.5 text-xs text-ink-400">
            <Link to="/" className="hover:text-ink">Accueil</Link> ›
            {parentCat && subObj ? <><Link to={`/boutique?cat=${parentCat}`} className="hover:text-ink">{categories.find((c) => c.id === parentCat)!.name}</Link> ›</> : null}
            <span className="text-ink-700">{title}</span>
          </nav>
          <div className="mt-1.5 flex items-baseline gap-3">
            <motion.h1 key={title} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="text-xl font-extrabold tracking-tight sm:text-2xl">{title}</motion.h1>
            <span className="text-xs text-ink-400">{filtered.length} article{filtered.length > 1 ? 's' : ''}</span>
          </div>
          <div className="no-scrollbar -mx-5 mt-3 flex gap-3 overflow-x-auto px-5 sm:-mx-8 sm:gap-4 sm:px-8 lg:mx-0 lg:px-0">
            {subRow.map((x) => (
              <button key={x.id} onClick={() => { const n = new URLSearchParams(sp); n.delete('cat'); if (sub === x.id) n.delete('sub'); else n.set('sub', x.id); setSp(n, { replace: true }) }} className="group flex w-[64px] shrink-0 flex-col items-center text-center sm:w-[76px]">
                <span className={cn('h-14 w-14 overflow-hidden rounded-full bg-ivory-200 ring-2 transition sm:h-16 sm:w-16', sub === x.id ? 'ring-ink' : 'ring-transparent group-hover:ring-gold')}><Img src={x.image} alt="" className="h-full w-full object-cover" /></span>
                <span className={cn('mt-1 line-clamp-2 text-[11px] leading-tight', sub === x.id && 'font-bold')}>{x.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="sticky top-[96px] z-20 border-b border-ink/5 bg-white/95 backdrop-blur-xl sm:top-[112px] lg:top-[116px]">
        <div className="container-x no-scrollbar flex items-center gap-2 overflow-x-auto py-2.5">
          {([['pertinence', 'Recommandé'], ['populaires', 'Plus vendus'], ['nouveautes', 'Nouveautés'], ['prix-asc', 'Prix ↑'], ['prix-desc', 'Prix ↓']] as [SortId, string][]).map(([k, l]) => (
            <button key={k} onClick={() => update('tri', k === 'pertinence' ? null : k)} className={cn('shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition', sort === k ? 'bg-ink text-gold-light' : 'bg-ivory-200 text-ink-700 hover:bg-ivory-300')}>{l}</button>
          ))}
          <span className="mx-1 h-5 w-px shrink-0 bg-ink/10" />
          <button onClick={() => update('flash', flash ? null : '1')} className={cn('shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition', flash ? 'bg-red-600 text-white' : 'bg-red-50 text-red-600 hover:bg-red-100')}>⚡ Flash</button>
          <button onClick={() => update('express', express ? null : '1')} className={cn('shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition', express ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100')}>🚚 24 h</button>
          <button onClick={() => update('promo', promo ? null : '1')} className={cn('shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition', promo ? 'bg-ink text-gold-light' : 'bg-ivory-200 text-ink-700 hover:bg-ivory-300')}>Promos</button>
          <button onClick={() => setDrawer(true)} className="ml-auto flex shrink-0 items-center gap-1.5 rounded-full border border-ink/15 px-3.5 py-1.5 text-xs font-semibold lg:hidden"><SlidersHorizontal size={13} /> Filtres {activeCount > 0 && <span className="grid h-4 w-4 place-items-center rounded-full bg-gold text-[9px] font-bold">{activeCount}</span>}</button>
        </div>
      </div>

      <div className="container-x grid gap-8 py-5 lg:grid-cols-[230px_1fr]">
        <aside className="hidden lg:block">
          <div className="no-scrollbar sticky top-[180px] max-h-[calc(100vh-200px)] overflow-y-auto pr-2">
            <div className="flex items-center justify-between pb-2">
              <p className="text-base font-extrabold">Filtres</p>
              {activeCount > 0 && <button onClick={reset} className="text-xs font-semibold uppercase tracking-[0.12em] text-gold-dark hover:underline">Réinitialiser</button>}
            </div>
            {filters}
          </div>
        </aside>

        <div>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <button onClick={() => setDrawer(true)} className="chip border-ink/15 bg-white py-2.5 lg:hidden"><SlidersHorizontal size={14} /> Filtres {activeCount > 0 && <span className="grid h-5 w-5 place-items-center rounded-full bg-gold text-[10px] font-bold">{activeCount}</span>}</button>
            <div className="hidden min-w-0 flex-1 flex-wrap gap-2 lg:flex">
              {chips.map((c) => <button key={c.l} onClick={c.x} className="chip border-ink/15 bg-white hover:border-ink">{c.l} <X size={12} /></button>)}
            </div>
            <div className="relative ml-auto">
              <button onClick={() => setSortOpen(!sortOpen)} className="chip border-ink/15 bg-white py-2.5">Trier : <b>{SORTS[sort]}</b> <ChevronDown size={14} className={cn('transition', sortOpen && 'rotate-180')} /></button>
              <AnimatePresence>
                {sortOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setSortOpen(false)} />
                    <motion.ul initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="absolute right-0 z-20 mt-2 w-56 overflow-hidden rounded-2xl border border-ink/10 bg-white p-1.5 shadow-xl">
                      {(Object.keys(SORTS) as SortId[]).map((k) => (
                        <li key={k}><button onClick={() => { update('tri', k === 'pertinence' ? null : k); setSortOpen(false) }} className={cn('w-full rounded-xl px-4 py-2.5 text-left text-sm transition hover:bg-ivory-200', sort === k && 'bg-ivory-200 font-semibold')}>{SORTS[k]}</button></li>
                      ))}
                    </motion.ul>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-ink/20 py-24 text-center">
              <Search size={32} className="mx-auto text-gold" />
              <p className="mt-4 font-display text-3xl">Aucun produit trouvé</p>
              <p className="mt-2 text-sm text-ink-500">Essayez d’élargir vos filtres.</p>
              <button onClick={() => setSp({}, { replace: true })} className="btn-dark mt-6">Réinitialiser les filtres</button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-x-2.5 gap-y-5 sm:grid-cols-3 sm:gap-x-3 xl:grid-cols-4 2xl:grid-cols-5">
              {filtered.map((p) => <ProductCard key={p.id} p={p} />)}
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {drawer && (
          <>
            <motion.div className="fixed inset-0 z-[60] bg-ink/50 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDrawer(false)} />
            <motion.aside className="fixed inset-x-0 bottom-0 z-[61] flex max-h-[88vh] flex-col rounded-t-3xl bg-ivory" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 32, stiffness: 300 }}>
              <div className="flex items-center justify-between border-b border-ink/10 px-6 py-4">
                <p className="font-display text-2xl">Filtres</p>
                <button onClick={() => setDrawer(false)} className="p-2" aria-label="Fermer"><X size={20} /></button>
              </div>
              <div className="flex-1 overflow-y-auto px-6">{filters}</div>
              <div className="flex gap-3 border-t border-ink/10 p-4">
                <button onClick={reset} className="btn-outline flex-1 px-4">Effacer</button>
                <button onClick={() => setDrawer(false)} className="btn-dark flex-[2] px-4">Voir {filtered.length} produits</button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </Page>
  )
}
