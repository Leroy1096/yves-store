import { Boxes, ExternalLink, LayoutDashboard, Loader2, Megaphone, MessageCircle, ShoppingBag, Star, Tag, UserCog, Users } from 'lucide-react'
import { lazy, Suspense, useCallback, useEffect, useState } from 'react'
import { Link, Navigate, NavLink, Route, Routes, useLocation } from 'react-router-dom'
import { Logo } from '../../components/ui'
import { initials } from '../../lib/auth-utils'
import Assistant, { AssistantButton } from './Assistant'
import { cn } from '../../lib/format'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../store/auth'
import { Loading } from './shared'

const Overview = lazy(() => import('./Overview'))
const Orders = lazy(() => import('./Orders'))
const Clients = lazy(() => import('./Clients'))
const Products = lazy(() => import('./Products'))
const Stock = lazy(() => import('./Stock'))
const Messages = lazy(() => import('./Messages'))
const AdminProfile = lazy(() => import('./AdminProfile'))
const News = lazy(() => import('./News'))
const Reviews = lazy(() => import('./Reviews'))

const NAV = [
  { to: '/gerant', label: 'Tableau de bord', icon: LayoutDashboard, end: true },
  { to: '/gerant/commandes', label: 'Commandes', icon: ShoppingBag, badge: 'orders' as const },
  { to: '/gerant/clients', label: 'Clients inscrits', icon: Users },
  { to: '/gerant/produits', label: 'Produits & prix', icon: Tag },
  { to: '/gerant/stock', label: 'Stock', icon: Boxes, badge: 'stock' as const },
  { to: '/gerant/messages', label: 'Messages WhatsApp', icon: MessageCircle, badge: 'wa' as const },
  { to: '/gerant/avis', label: 'Avis clients', icon: Star, badge: 'reviews' as const },
  { to: '/gerant/nouveautes', label: 'Nouveautés', icon: Megaphone, badge: 'news' as const },
  { to: '/gerant/profil', label: 'Mon profil', icon: UserCog },
]

function useBadges(enabled: boolean) {
  const [b, setB] = useState({ orders: 0, wa: 0, stock: 0, news: 0, reviews: 0 })
  const load = useCallback(async () => {
    const [o, w, s, n, rv] = await Promise.all([
      supabase.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'confirmee'),
      supabase.from('whatsapp_requests').select('id', { count: 'exact', head: true }).eq('status', 'en_attente'),
      supabase.from('catalog_products').select('stock,low_stock_threshold,active'),
      supabase.from('announcements').select('id', { count: 'exact', head: true }).eq('status', 'brouillon'),
      supabase.from('product_reviews').select('id', { count: 'exact', head: true }).eq('seen_by_admin', false),
    ])
    const low = (s.data ?? []).filter((r: { stock: number; low_stock_threshold: number; active: boolean }) => r.active && r.stock <= r.low_stock_threshold).length
    setB({ orders: o.count ?? 0, wa: w.count ?? 0, stock: low, news: n.count ?? 0, reviews: rv.count ?? 0 })
  }, [])
  useEffect(() => {
    if (!enabled) return
    void load()
    const t = setInterval(load, 60000)
    return () => clearInterval(t)
  }, [enabled, load])
  return { badges: b, reload: load }
}

export default function AdminApp() {
  const { user, profile, ready, isAdmin } = useAuth()
  const [aiOpen, setAiOpen] = useState(false)
  const [aiMounted, setAiMounted] = useState(false)
  const openAi = () => { setAiMounted(true); setAiOpen(true) }
  const loc = useLocation()
  const { badges, reload } = useBadges(!!isAdmin)
  useEffect(() => { document.title = 'Espace gérant — YVES STORE' }, [])
  useEffect(() => { if (isAdmin) void reload() }, [loc.pathname, isAdmin, reload])

  if (!ready || (user && isAdmin === null)) return <main className="grid min-h-screen place-items-center bg-ivory"><Loader2 className="animate-spin text-gold" size={30} /></main>
  if (!user) return <Navigate to={`/compte?redirect=${encodeURIComponent(loc.pathname)}`} replace />
  if (!isAdmin) return <Navigate to="/mon-compte" replace />
  const name = profile?.first_name || 'Gérant'

  const navLinks = (mobile: boolean) => NAV.map((n) => {
    const count = n.badge ? badges[n.badge] : 0
    return (
      <NavLink key={n.to} to={n.to} end={n.end}
        className={({ isActive }) => cn(
          'relative flex items-center gap-3 rounded-xl text-sm font-semibold transition',
          mobile ? 'shrink-0 px-3.5 py-2' : 'px-3.5 py-2.5',
          isActive ? (mobile ? 'bg-ink text-ivory' : 'bg-gold text-ink') : (mobile ? 'bg-white text-ink-500 ring-1 ring-ink/10' : 'text-ivory/70 hover:bg-white/5 hover:text-ivory'),
        )}>
        <n.icon size={17} />
        <span className={cn(mobile && 'whitespace-nowrap')}>{n.label}</span>
        {count > 0 && <span className={cn('ml-auto grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-[10px] font-bold', n.badge === 'stock' ? 'bg-orange-500 text-white' : n.badge === 'news' ? 'bg-violet-500 text-white' : n.badge === 'reviews' ? 'bg-gold text-ink' : 'bg-red-500 text-white')}>{count}</span>}
      </NavLink>
    )
  })

  return (
    <div className="min-h-screen bg-ivory lg:grid lg:grid-cols-[260px_1fr]">
      {/* Barre latérale (ordinateur) */}
      <aside className="sticky top-0 hidden h-screen flex-col bg-ink p-5 text-ivory lg:flex">
        <Link to="/gerant" className="block"><Logo light /></Link>
        <p className="mt-2 inline-flex w-fit rounded-full bg-gold/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-gold-light">Espace gérant</p>
        <nav className="mt-8 flex flex-1 flex-col gap-1">{navLinks(false)}</nav>
        <div className="mt-6 border-t border-white/10 pt-5">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-gold-light to-gold-dark text-sm font-bold text-ink">{initials(profile?.first_name, profile?.last_name)}</span>
            <div className="min-w-0"><p className="truncate text-sm font-semibold">{name}</p><p className="text-xs text-ivory/50">Gérant</p></div>
          </div>
          <div className="mt-4 flex flex-col gap-2">
            <AssistantButton variant="sidebar" onClick={openAi} />
            <Link to="/" className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-white/5 px-2 py-1.5 text-xs font-semibold text-ivory/80 hover:bg-white/10"><ExternalLink size={13} /> Boutique</Link>
          </div>
        </div>
      </aside>

      {/* En-tête (mobile / tablette) */}
      <header className="sticky top-0 z-30 border-b border-ink/10 bg-ivory/95 backdrop-blur lg:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2"><Logo /><span className="rounded-full bg-ink px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.15em] text-gold-light">Gérant</span></div>
          <AssistantButton variant="header" onClick={openAi} />
        </div>
        <nav className="flex gap-2 overflow-x-auto px-4 pb-3 [scrollbar-width:none]">{navLinks(true)}</nav>
      </header>

      {aiMounted && <Assistant open={aiOpen} onClose={() => setAiOpen(false)} name={name} onDataChange={reload} />}

      <main className="min-w-0 px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
        <div className="mx-auto max-w-6xl">
          <Suspense fallback={<Loading />}>
            <Routes>
              <Route index element={<Overview />} />
              <Route path="commandes" element={<Orders onChange={reload} />} />
              <Route path="clients" element={<Clients />} />
              <Route path="produits" element={<Products onChange={reload} />} />
              <Route path="stock" element={<Stock onChange={reload} />} />
              <Route path="messages" element={<Messages onChange={reload} />} />
              <Route path="nouveautes" element={<News />} />
              <Route path="avis" element={<Reviews onChange={reload} />} />
              <Route path="profil" element={<AdminProfile />} />
              <Route path="*" element={<Navigate to="/gerant" replace />} />
            </Routes>
          </Suspense>
        </div>
      </main>
    </div>
  )
}
