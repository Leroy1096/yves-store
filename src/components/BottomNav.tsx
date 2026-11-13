import { motion } from 'framer-motion'
import { Home, LayoutGrid, ShoppingBag, Sparkles, User } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import { cn } from '../lib/format'
import { cartCount, useCart, useUI } from '../store'
import { useAuth } from '../store/auth'

/** Barre d’onglets mobile (Accueil · Catégories · Nouveautés · Panier · Moi) */
export default function BottomNav() {
  const { pathname, search } = useLocation()
  const count = useCart((s) => cartCount(s.lines))
  const openCart = useUI((s) => s.openCart)
  const cartOpen = useUI((s) => s.cartOpen)
  const user = useAuth((s) => s.user)

  const isNew = pathname === '/boutique' && search.includes('tri=nouveautes')
  const tabs = [
    { label: 'Accueil', icon: Home, to: '/', active: pathname === '/' },
    { label: 'Catégories', icon: LayoutGrid, to: '/categories', active: pathname === '/categories' },
    { label: 'Nouveautés', icon: Sparkles, to: '/boutique?tri=nouveautes', active: isNew },
    { label: 'Panier', icon: ShoppingBag, onClick: openCart, active: cartOpen, badge: count },
    { label: 'Moi', icon: User, to: user ? '/mon-compte' : '/compte', active: pathname === '/mon-compte' || pathname === '/favoris' },
  ]

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-ink/10 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden" aria-label="Navigation principale">
      <ul className="grid h-[58px] grid-cols-5">
        {tabs.map((t) => {
          const inner = (
            <>
              <span className="relative">
                <t.icon size={22} strokeWidth={t.active ? 2.4 : 1.7} />
                {!!t.badge && <motion.span key={t.badge} initial={{ scale: 0.4 }} animate={{ scale: 1 }} className="absolute -right-2.5 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-red-600 px-1 text-[9px] font-bold text-white">{t.badge}</motion.span>}
              </span>
              <span className={cn('text-[10px]', t.active ? 'font-bold' : 'font-medium')}>{t.label}</span>
              {t.active && <motion.span layoutId="tab-dot" className="absolute top-0 h-[3px] w-8 rounded-b-full bg-gold" />}
            </>
          )
          const cls = cn('relative flex h-full w-full flex-col items-center justify-center gap-0.5 transition', t.active ? 'text-ink' : 'text-ink-400')
          return (
            <li key={t.label}>
              {t.to ? <Link to={t.to} className={cls}>{inner}</Link> : <button onClick={t.onClick} className={cls}>{inner}</button>}
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
