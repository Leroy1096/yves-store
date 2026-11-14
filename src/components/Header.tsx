import { AnimatePresence, motion } from 'framer-motion'
import { BadgeCheck, ChevronRight, Heart, LayoutGrid, LogOut, Package, RotateCcw, ShoppingBag, Ticket, Truck, User } from 'lucide-react'
import NewsBell from './NewsBell'
import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { navItems, shortCat } from '../data/nav'
import { categories, products, subcategories, type CategoryId } from '../data/products'
import { initials } from '../lib/auth-utils'
import { cn, fcfa } from '../lib/format'
import { cartCount, useCart, useUI, useWishlist } from '../store'
import { useAuth } from '../store/auth'
import SearchBar from './SearchBar'
import { Img, Logo } from './ui'

const perks = [
  { icon: Truck, text: 'Livraison offerte dès 50 000 FCFA' },
  { icon: RotateCcw, text: 'Retours gratuits sous 7 jours' },
  { icon: BadgeCheck, text: 'Paiement à la livraison & Mobile Money' },
]

function PromoStrip() {
  const [i, setI] = useState(0)
  useEffect(() => { const t = setInterval(() => setI((x) => (x + 1) % perks.length), 3800); return () => clearInterval(t) }, [])
  return (
    <div className="relative z-50 bg-ink text-ivory">
      <div className="container-x hidden h-8 items-center justify-center gap-10 text-[11px] font-medium tracking-wide md:flex">
        {perks.map((p) => <span key={p.text} className="flex items-center gap-2"><p.icon size={14} className="text-gold-light" />{p.text}</span>)}
        <Link to="/compte?mode=inscription" className="font-bold text-gold-light hover:underline">-5 000 FCFA sur votre 1ʳᵉ commande ›</Link>
      </div>
      <div className="relative h-8 overflow-hidden md:hidden">
        <AnimatePresence mode="wait">
          {(() => { const P = perks[i]; return (
            <motion.p key={i} initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -16, opacity: 0 }} transition={{ duration: 0.3 }} className="absolute inset-0 flex items-center justify-center gap-2 text-[11px] font-medium">
              <P.icon size={13} className="text-gold-light" />{P.text}
            </motion.p>) })()}
        </AnimatePresence>
      </div>
    </div>
  )
}

function MegaMenu({ cat, onClose }: { cat: CategoryId; onClose: () => void }) {
  const subs = subcategories.filter((s) => s.category === cat)
  const picks = products.filter((p) => p.category === cat).sort((a, b) => (b.sold ?? 0) - (a.sold ?? 0)).slice(0, 3)
  const c = categories.find((x) => x.id === cat)!
  return (
    <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }} className="absolute inset-x-0 top-full hidden border-t border-ink/5 bg-white text-ink shadow-2xl shadow-ink/10 lg:block">
      <div className="container-x grid grid-cols-[1fr_auto] gap-10 py-7">
        <div>
          <div className="mb-5 flex items-center justify-between">
            <p className="text-sm font-bold">{c.name}</p>
            <Link to={`/boutique?cat=${cat}`} onClick={onClose} className="flex items-center gap-1 text-xs font-semibold text-ink-500 hover:text-ink">Tout voir <ChevronRight size={14} /></Link>
          </div>
          <div className="grid grid-cols-6 gap-x-4 gap-y-5">
            {subs.map((s) => (
              <Link key={s.id} to={`/boutique?sub=${s.id}`} onClick={onClose} className="group flex flex-col items-center text-center">
                <span className="h-20 w-20 overflow-hidden rounded-full bg-ivory-200 ring-2 ring-transparent transition group-hover:ring-gold"><Img src={s.image} alt="" className="h-full w-full object-cover" /></span>
                <span className="mt-2 text-xs font-medium group-hover:text-gold-dark">{s.name}</span>
              </Link>
            ))}
            <Link to={`/boutique?cat=${cat}&tri=nouveautes`} onClick={onClose} className="group flex flex-col items-center text-center">
              <span className="grid h-20 w-20 place-items-center rounded-full bg-ink text-[11px] font-bold uppercase tracking-wider text-gold-light transition group-hover:bg-gold group-hover:text-ink">New</span>
              <span className="mt-2 text-xs font-medium">Nouveautés</span>
            </Link>
          </div>
        </div>
        <div className="flex gap-3">
          {picks.map((p) => (
            <Link key={p.id} to={`/produit/${p.slug}`} onClick={onClose} className="group w-32">
              <div className="aspect-[3/4] overflow-hidden rounded-lg bg-ivory-200"><Img src={p.images[0]} alt={p.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" /></div>
              <p className="mt-1.5 truncate text-xs">{p.name}</p>
              <p className={cn('text-xs font-bold', !!p.compareAt && 'text-red-600')}>{fcfa(p.price)}</p>
            </Link>
          ))}
        </div>
      </div>
    </motion.div>
  )
}

function AllCategories({ onClose }: { onClose: () => void }) {
  const [active, setActive] = useState<CategoryId>('accessoires')
  return (
    <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }} className="absolute left-0 top-full hidden w-[760px] overflow-hidden rounded-b-2xl border border-ink/5 bg-white text-ink shadow-2xl shadow-ink/15 lg:flex">
      <ul className="w-56 shrink-0 bg-ivory-100 py-2">
        {categories.map((c) => (
          <li key={c.id}>
            <Link to={`/boutique?cat=${c.id}`} onClick={onClose} onMouseEnter={() => setActive(c.id)} className={cn('flex items-center justify-between px-5 py-3 text-sm transition', active === c.id ? 'bg-white font-bold' : 'hover:bg-white')}>
              {shortCat[c.id] ?? c.name} <ChevronRight size={14} className="text-ink-400" />
            </Link>
          </li>
        ))}
        <li><Link to="/categories" onClick={onClose} className="block px-5 py-3 text-sm font-semibold text-gold-dark hover:underline">Toutes les catégories</Link></li>
      </ul>
      <div className="grid flex-1 grid-cols-4 content-start gap-x-3 gap-y-5 p-6">
        {!subcategories.some((s) => s.category === active) && products.filter((p) => p.category === active).slice(0, 8).map((p) => (
          <Link key={p.id} to={`/produit/${p.slug}`} onClick={onClose} className="group flex flex-col items-center text-center">
            <span className="h-[72px] w-[72px] overflow-hidden rounded-full bg-ivory-200 ring-2 ring-transparent transition group-hover:ring-gold"><Img src={p.images[0]} alt="" className="h-full w-full object-cover" /></span>
            <span className="mt-2 line-clamp-2 text-xs">{p.name}</span>
          </Link>
        ))}
        {subcategories.filter((s) => s.category === active).map((s) => (
          <Link key={s.id} to={`/boutique?sub=${s.id}`} onClick={onClose} className="group flex flex-col items-center text-center">
            <span className="h-[72px] w-[72px] overflow-hidden rounded-full bg-ivory-200 ring-2 ring-transparent transition group-hover:ring-gold"><Img src={s.image} alt="" className="h-full w-full object-cover" /></span>
            <span className="mt-2 text-xs">{s.name}</span>
          </Link>
        ))}
      </div>
    </motion.div>
  )
}

function AccountMenu() {
  const user = useAuth((s) => s.user)
  const profile = useAuth((s) => s.profile)
  const signOut = useAuth((s) => s.signOut)
  const isAdmin = useAuth((s) => s.isAdmin)
  return (
    <div className="group relative">
      <Link to={user ? (isAdmin ? '/gerant' : '/mon-compte') : '/compte'} className="grid h-10 w-10 place-items-center rounded-full transition hover:bg-ink/5" aria-label={user ? 'Mon compte' : 'Se connecter'}>
        {user ? <span className="grid h-7 w-7 place-items-center rounded-full bg-gold text-[10px] font-bold text-ink">{initials(profile?.first_name, profile?.last_name)}</span> : <User size={21} />}
      </Link>
      <div className="invisible absolute right-0 top-full z-50 w-64 pt-2 opacity-0 transition group-hover:visible group-hover:opacity-100">
        <div className="rounded-2xl border border-ink/5 bg-white p-4 text-ink shadow-2xl shadow-ink/15">
          {user ? (
            <p className="mb-3 text-sm">Bonjour <b>{profile?.first_name || 'cher client'}</b> 👋</p>
          ) : (
            <>
              <p className="text-sm font-bold">Bienvenue chez YVES STORE</p>
              <p className="mt-1 text-xs text-ink-500">Connectez-vous pour suivre vos commandes et profiter de -5 000 FCFA.</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Link to="/compte" className="rounded-full bg-ink py-2 text-center text-xs font-bold text-ivory hover:bg-gold hover:text-ink">Connexion</Link>
                <Link to="/compte?mode=inscription" className="rounded-full border border-ink py-2 text-center text-xs font-bold hover:bg-ink hover:text-ivory">Inscription</Link>
              </div>
              <div className="my-3 h-px bg-ink/10" />
            </>
          )}
          {isAdmin && <Link to="/gerant" className="mb-2 flex items-center justify-center gap-2 rounded-full bg-ink py-2.5 text-xs font-bold text-ivory hover:bg-gold hover:text-ink">Ouvrir l’espace gérant</Link>}
          <ul className="space-y-0.5 text-sm">
            <li><Link to={user ? '/mon-compte?onglet=commandes' : '/compte?redirect=/mon-compte?onglet=commandes'} className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-ivory-200"><Package size={16} /> Mes commandes</Link></li>
            <li><Link to="/favoris" className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-ivory-200"><Heart size={16} /> Mes favoris</Link></li>
            <li><Link to={user ? '/mon-compte' : '/compte?mode=inscription'} className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-ivory-200"><Ticket size={16} /> Mes coupons</Link></li>
            {user && <li><button onClick={() => signOut()} className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-red-700 hover:bg-red-50"><LogOut size={16} /> Se déconnecter</button></li>}
          </ul>
        </div>
      </div>
    </div>
  )
}

export function isActive(to: string, pathname: string, search: string) {
  const [p, q] = to.split('?')
  if (p !== pathname) return false
  if (!q) return !search || search === '?'
  const want = new URLSearchParams(q)
  const have = new URLSearchParams(search)
  return [...want.entries()].every(([k, v]) => have.get(k) === v) && [...have.keys()].filter((k) => k !== 'tri' || want.has('tri')).length === [...want.keys()].length
}

export default function Header() {
  const { pathname, search } = useLocation()
  const [mega, setMega] = useState<CategoryId | 'all' | null>(null)
  const count = useCart((s) => cartCount(s.lines))
  const wish = useWishlist((s) => s.ids.length)
  const openCart = useUI((s) => s.openCart)

  useEffect(() => { setMega(null) }, [pathname, search])

  return (
    <>
      <PromoStrip />
      <header className="sticky top-0 z-40 bg-white text-ink shadow-[0_1px_0_rgba(14,13,11,0.08)]" onMouseLeave={() => setMega(null)}>
        <div className="container-x flex h-14 items-center gap-3 sm:h-[72px] sm:gap-6 lg:gap-10">
          <Link to="/" aria-label="YVES STORE accueil" className="shrink-0"><Logo className="-mr-4 origin-left scale-[0.8] sm:mr-0 sm:scale-100" /></Link>
          <div className="mx-auto min-w-0 max-w-2xl flex-1"><SearchBar compact={false} /></div>
          <div className="flex shrink-0 items-center sm:gap-1">
            <div className="hidden sm:block"><AccountMenu /></div>
            <NewsBell />
            <Link to="/favoris" className="relative hidden h-10 w-10 place-items-center rounded-full transition hover:bg-ink/5 sm:grid" aria-label="Favoris">
              <Heart size={21} />
              {wish > 0 && <span className="absolute right-0.5 top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-gold px-1 text-[9px] font-bold text-ink">{wish}</span>}
            </Link>
            <button onClick={openCart} className="relative grid h-10 w-10 place-items-center rounded-full transition hover:bg-ink/5" aria-label={`Panier (${count})`}>
              <ShoppingBag size={21} />
              <AnimatePresence>
                {count > 0 && <motion.span key={count} initial={{ scale: 0.4 }} animate={{ scale: 1 }} className="absolute right-0 top-0 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">{count}</motion.span>}
              </AnimatePresence>
            </button>
          </div>
        </div>

        <nav className="relative border-t border-ink/5">
          <div className="container-x flex h-10 items-stretch lg:h-11">
            <button
              onMouseEnter={() => setMega('all')} onClick={() => setMega((m) => (m === 'all' ? null : 'all'))}
              className={cn('hidden shrink-0 items-center gap-2 pr-5 text-[13px] font-bold lg:flex', mega === 'all' && 'text-gold-dark')}
            >
              <LayoutGrid size={16} /> Catégories
            </button>
            <div className="no-scrollbar -mx-5 flex flex-1 items-stretch gap-0.5 overflow-x-auto px-3 sm:-mx-8 sm:px-6 lg:mx-0 lg:px-0">
              <Link to="/" onMouseEnter={() => setMega(null)} className={cn('relative flex shrink-0 items-center px-2.5 text-[13px] lg:hidden', pathname === '/' ? 'font-bold' : 'text-ink-700')}>
                Accueil {pathname === '/' && <span className="absolute inset-x-2.5 bottom-0 h-[2.5px] rounded-full bg-ink" />}
              </Link>
              {navItems.map((n) => {
                const active = isActive(n.to, pathname, search)
                return (
                  <Link
                    key={n.label} to={n.to}
                    onMouseEnter={() => setMega(n.cat ?? null)}
                    className={cn('relative flex shrink-0 items-center whitespace-nowrap px-2.5 text-[13px] transition hover:text-gold-dark lg:px-3', active ? 'font-bold' : 'text-ink-700', n.hot && 'font-semibold text-red-600')}
                  >
                    {n.label}
                    {active && <span className="absolute inset-x-2.5 bottom-0 h-[2.5px] rounded-full bg-ink" />}
                  </Link>
                )
              })}
            </div>
          </div>
          <AnimatePresence>
            {mega === 'all' && <div key="all" className="container-x relative"><AllCategories onClose={() => setMega(null)} /></div>}
            {mega && mega !== 'all' && <MegaMenu key={mega} cat={mega} onClose={() => setMega(null)} />}
          </AnimatePresence>
        </nav>
      </header>
    </>
  )
}
