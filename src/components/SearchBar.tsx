import { AnimatePresence, motion } from 'framer-motion'
import { Camera, Flame, History, Search, Trash2, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { trendingSearches } from '../data/nav'
import { products, subcategories } from '../data/products'
import { cn, fcfa } from '../lib/format'
import { searchText, matches } from '../lib/search'
import { Img } from './ui'

const HISTORY_KEY = 'yves-search-history'
const readHistory = (): string[] => { try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]') } catch { return [] } }

/** Barre de recherche centrale, avec suggestions « Recherches populaires » façon Shein */
export default function SearchBar({ compact = false }: { compact?: boolean }) {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [ph, setPh] = useState(0)
  const [top, setTop] = useState(0)
  const [history, setHistory] = useState<string[]>(readHistory)
  const wrap = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLInputElement>(null)
  const nav = useNavigate()
  const { pathname, search } = useLocation()

  useEffect(() => { const t = setInterval(() => setPh((p) => (p + 1) % trendingSearches.length), 3200); return () => clearInterval(t) }, [])
  useEffect(() => { setOpen(false); input.current?.blur() }, [pathname, search])
  useEffect(() => {
    const down = (e: MouseEvent) => { if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false) }
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setOpen(false); input.current?.blur() }
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); input.current?.focus() }
    }
    document.addEventListener('mousedown', down); window.addEventListener('keydown', key)
    return () => { document.removeEventListener('mousedown', down); window.removeEventListener('keydown', key) }
  }, [])

  const results = useMemo(() => (q.trim() ? products.filter((p) => matches(q, searchText(p))).slice(0, 6) : []), [q])
  const subs = useMemo(() => (q.trim() ? subcategories.filter((s) => matches(q, s.name)).slice(0, 4) : []), [q])

  const go = (term: string) => {
    const t = term.trim() || trendingSearches[ph]
    const h = [t, ...history.filter((x) => x.toLowerCase() !== t.toLowerCase())].slice(0, 8)
    setHistory(h); try { localStorage.setItem(HISTORY_KEY, JSON.stringify(h)) } catch { /* stockage bloqué */ }
    setQ(''); setOpen(false)
    if (/black friday|promo|soldes/i.test(t)) nav('/boutique?promo=1')
    else nav(`/boutique?q=${encodeURIComponent(t)}`)
  }

  return (
    <div ref={wrap} className="relative w-full">
      <form
        onSubmit={(e) => { e.preventDefault(); go(q) }}
        className={cn('flex items-center overflow-hidden rounded-full border-2 bg-white transition', open ? 'border-gold' : 'border-ink')}
      >
        <Search size={17} className="ml-3.5 shrink-0 text-ink-400 sm:ml-4" />
        <input
          ref={input}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => { setTop((wrap.current?.getBoundingClientRect().bottom ?? 96) + 8); setOpen(true) }}
          placeholder={trendingSearches[ph]}
          aria-label="Rechercher un produit"
          className={cn('min-w-0 flex-1 bg-transparent px-2.5 text-sm outline-none placeholder:text-ink-400', compact ? 'h-9' : 'h-10 sm:h-11')}
        />
        {q && <button type="button" onClick={() => setQ('')} className="p-1.5 text-ink-400 hover:text-ink" aria-label="Effacer"><X size={15} /></button>}
        <button type="button" title="Recherche par photo (bientôt)" className="hidden p-2 text-ink-400 hover:text-ink sm:block" aria-label="Recherche par photo"><Camera size={18} /></button>
        <button type="submit" className={cn('m-[3px] grid shrink-0 place-items-center rounded-full bg-ink text-ivory transition hover:bg-gold hover:text-ink', compact ? 'h-7 w-10' : 'h-8 w-12 sm:h-9 sm:w-14')} aria-label="Lancer la recherche">
          <Search size={compact ? 15 : 17} />
        </button>
      </form>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }}
            className="absolute inset-x-0 top-full z-50 mt-2 max-h-[70vh] overflow-y-auto rounded-2xl border border-ink/10 bg-white p-4 text-ink shadow-2xl shadow-ink/15 max-sm:fixed max-sm:inset-x-3 max-sm:mt-0"
            style={{ top: typeof window !== 'undefined' && window.innerWidth < 640 ? top : undefined }}
          >
            {!q.trim() ? (
              <>
                {history.length > 0 && (
                  <div className="mb-4">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider"><History size={14} /> Recherches récentes</p>
                      <button onClick={() => { setHistory([]); try { localStorage.removeItem(HISTORY_KEY) } catch { /* */ } }} className="p-1 text-ink-400 hover:text-red-600" aria-label="Effacer l’historique"><Trash2 size={14} /></button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {history.map((h) => <button key={h} onClick={() => go(h)} className="rounded-full bg-ivory-200 px-3 py-1.5 text-xs hover:bg-ink hover:text-ivory">{h}</button>)}
                    </div>
                  </div>
                )}
                <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider"><Flame size={14} className="text-red-600" /> Recherches populaires</p>
                <div className="flex flex-wrap gap-2">
                  {trendingSearches.map((t, i) => (
                    <button key={t} onClick={() => go(t)} className={cn('rounded-full border px-3 py-1.5 text-xs transition hover:border-ink hover:bg-ink hover:text-ivory', i < 3 ? 'border-red-200 bg-red-50 text-red-700' : 'border-ink/10')}>
                      {i < 3 && '🔥 '}{t}
                    </button>
                  ))}
                </div>
              </>
            ) : results.length === 0 && subs.length === 0 ? (
              <p className="py-4 text-center text-sm text-ink-500">Aucun résultat pour « {q} ». Essayez « chaîne », « wax » ou « chargeur ».</p>
            ) : (
              <>
                {subs.length > 0 && (
                  <div className="mb-3 flex flex-wrap gap-2">
                    {subs.map((s) => <Link key={s.id} to={`/boutique?sub=${s.id}`} className="rounded-full bg-ivory-200 px-3 py-1.5 text-xs font-semibold hover:bg-ink hover:text-ivory">{s.name}</Link>)}
                  </div>
                )}
                <ul className="divide-y divide-ink/5">
                  {results.map((p) => (
                    <li key={p.id}>
                      <Link to={`/produit/${p.slug}`} className="flex items-center gap-3 py-2 hover:bg-ivory-100">
                        <Img src={p.images[0]} alt="" className="h-12 w-10 shrink-0 rounded object-cover" />
                        <span className="min-w-0 flex-1 truncate text-sm">{p.name}</span>
                        <span className={cn('text-sm font-bold', !!p.compareAt && 'text-red-600')}>{fcfa(p.price)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
                <button onClick={() => go(q)} className="mt-3 w-full rounded-full bg-ink py-2.5 text-xs font-bold uppercase tracking-wider text-ivory hover:bg-gold hover:text-ink">Voir tous les résultats</button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
