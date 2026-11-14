import { AnimatePresence, motion } from 'framer-motion'
import { Bell, ChevronRight, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { products } from '../data/products'
import { cn, fcfa } from '../lib/format'
import { fetchPublicNews, markNewsSeen, newsSeenAt, type PublicNews } from '../lib/news'
import { useAuth } from '../store/auth'
import { Img } from './ui'

const ago = (d: string) => {
  const m = Math.max(0, Math.round((Date.now() - new Date(d).getTime()) / 60000))
  if (m < 60) return m <= 1 ? 'à l’instant' : `il y a ${m} min`
  const h = Math.round(m / 60); if (h < 24) return `il y a ${h} h`
  const j = Math.round(h / 24); return j === 1 ? 'hier' : j < 30 ? `il y a ${j} jours` : new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
}
/** Articles encore en vente (photo et prix à jour depuis le catalogue) */
const live = (n: PublicNews) => n.items.map((it) => products.find((p) => p.id === it.id)).filter(Boolean) as typeof products

let cache: { at: number; list: PublicNews[] } | null = null
export function usePublicNews() {
  const [list, setList] = useState<PublicNews[] | null>(cache?.list ?? null)
  useEffect(() => {
    if (cache && Date.now() - cache.at < 5 * 60000) return
    let alive = true
    fetchPublicNews(20).then((l) => { cache = { at: Date.now(), list: l }; if (alive) setList(l) })
    return () => { alive = false }
  }, [])
  return list
}

/** Liste des annonces (menu de la cloche et onglet « Nouveautés » de Mon compte) */
export function NewsFeed({ list, compact = false, onPick }: { list: PublicNews[]; compact?: boolean; onPick?: () => void }) {
  const seen = newsSeenAt()
  const shown = list.map((n) => ({ n, items: live(n) })).filter((x) => x.items.length)
  if (!shown.length) return <p className="px-4 py-10 text-center text-sm text-ink-500">Pas encore de nouveautés annoncées.<br />Revenez bientôt ✨</p>
  return (
    <ul className={cn('space-y-3', compact && 'p-3')} data-testid="news-feed">
      {shown.map(({ n, items }) => (
        <li key={n.id} className={cn('rounded-2xl border bg-white p-3.5', !compact && 'p-5', seen && n.published_at > seen ? 'border-gold/50 ring-1 ring-gold/30' : 'border-ink/10')}>
          <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-gold-dark">
            {n.kind === 'hebdo' ? '🗓️ Résumé de la semaine' : '✨ Nouveauté'}<span className="font-medium normal-case tracking-normal text-ink-400">· {ago(n.published_at)}</span>
            {seen && n.published_at > seen && <span className="ml-auto rounded-full bg-red-600 px-1.5 py-0.5 text-[9px] tracking-normal text-white">NOUVEAU</span>}
          </p>
          <p className={cn('mt-1 font-semibold', compact ? 'text-sm' : 'text-lg')}>{n.title}</p>
          <div className={cn('mt-2.5 grid gap-2', compact ? 'grid-cols-3' : 'grid-cols-3 sm:grid-cols-4 lg:grid-cols-6')}>
            {items.slice(0, compact ? 3 : 12).map((p) => (
              <Link key={p.id} to={`/produit/${p.slug}`} onClick={onPick} className="group min-w-0" data-testid="news-feed-item">
                <Img src={p.images[0]} alt={p.name} className="aspect-[4/5] w-full rounded-xl object-cover transition group-hover:opacity-90" />
                <p className="mt-1 truncate text-[11px] font-semibold">{p.name}</p>
                <p className="text-[11px] font-bold text-gold-dark">{fcfa(p.price)}{p.compareAt && p.compareAt > p.price && <span className="ml-1 font-normal text-ink-400 line-through">{fcfa(p.compareAt)}</span>}</p>
              </Link>
            ))}
          </div>
          {compact && items.length > 3 && <p className="mt-1.5 text-[11px] font-semibold text-ink-500">+ {items.length - 3} autre{items.length - 3 > 1 ? 's' : ''} article{items.length - 3 > 1 ? 's' : ''}</p>}
        </li>
      ))}
    </ul>
  )
}

/** Cloche 🔔 de l’en-tête : les annonces du gérant, avec pastille « non lues » */
export default function NewsBell() {
  const list = usePublicNews()
  const user = useAuth((s) => s.user)
  const [open, setOpen] = useState(false)
  const [seen, setSeen] = useState(newsSeenAt())
  const box = useRef<HTMLDivElement>(null)
  const { pathname } = useLocation()
  useEffect(() => { setOpen(false) }, [pathname])
  useEffect(() => {
    if (!open) return
    const out = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false) }
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', out); document.addEventListener('keydown', esc)
    return () => { document.removeEventListener('mousedown', out); document.removeEventListener('keydown', esc) }
  }, [open])
  const recent = (list ?? []).filter((n) => Date.now() - new Date(n.published_at).getTime() < 30 * 864e5 && live(n).length)
  const unread = recent.filter((n) => !seen || n.published_at > seen).length
  const toggle = () => {
    const next = !open; setOpen(next)
    // On marque comme lu à la fermeture : les nouvelles restent surlignées pendant la lecture
    if (!next && list?.[0]) { markNewsSeen(list[0].published_at); setSeen(list[0].published_at) }
  }
  const close = () => { setOpen(false); if (list?.[0]) { markNewsSeen(list[0].published_at); setSeen(list[0].published_at) } }

  return (
    <div className="relative" ref={box}>
      <button onClick={toggle} className="relative grid h-9 w-9 place-items-center rounded-full transition hover:bg-ink/5 sm:h-10 sm:w-10" aria-label={`Nouveautés${unread ? ` (${unread} non lue${unread > 1 ? 's' : ''})` : ''}`} aria-expanded={open} data-testid="news-bell">
        <Bell size={21} />
        {unread > 0 && <span className="absolute right-0.5 top-0.5 grid h-[17px] min-w-[17px] place-items-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white" data-testid="news-bell-count">{unread}</span>}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }}
            className="fixed inset-x-2 top-[60px] z-50 max-h-[75vh] overflow-hidden rounded-2xl border border-ink/10 bg-ivory shadow-2xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-12 sm:w-[400px]" data-testid="news-panel-client">
            <div className="flex items-center justify-between border-b border-ink/10 bg-white px-4 py-3">
              <p className="font-semibold">Nouveautés de la boutique</p>
              <button onClick={close} className="grid h-8 w-8 place-items-center rounded-full hover:bg-ink/5" aria-label="Fermer"><X size={17} /></button>
            </div>
            <div className="max-h-[calc(75vh-110px)] overflow-y-auto">{list === null ? <p className="py-10 text-center text-sm text-ink-500">Chargement…</p> : <NewsFeed list={list.slice(0, 8)} compact onPick={close} />}</div>
            <div className="border-t border-ink/10 bg-white px-4 py-2.5 text-center">
              {user
                ? <Link to="/mon-compte?onglet=nouveautes" onClick={close} className="inline-flex items-center gap-1 text-xs font-bold text-ink hover:text-gold-dark">Toutes les nouveautés <ChevronRight size={14} /></Link>
                : <Link to="/boutique?tri=nouveautes" onClick={close} className="inline-flex items-center gap-1 text-xs font-bold text-ink hover:text-gold-dark">Voir tous les nouveaux articles <ChevronRight size={14} /></Link>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
