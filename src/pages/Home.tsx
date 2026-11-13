import { AnimatePresence, motion } from 'framer-motion'
import { BadgeCheck, ChevronLeft, ChevronRight, Clock, Flame, Hash, MapPin, RotateCcw, ShieldCheck, Sparkles, Truck, Wallet, Zap } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { CouponTicket, coupons } from '../components/Floating'
import ProductCard from '../components/ProductCard'
import { Img, Page } from '../components/ui'
import { products, subcategories, type AgeGroup, type Product } from '../data/products'
import { cn, fcfa } from '../lib/format'
import { useRecent } from '../store'

/* ───────────────────────── Carrousel principal ───────────────────────── */
const slides = [
  { img: '/img/hero.webp', pos: 'object-[70%_center]', eyebrow: 'Black Friday avant l’heure', title: 'Jusqu’à -30 %', sub: 'Sneakers, montres, bijoux : les prix chutent cette semaine.', cta: 'J’en profite', to: '/boutique?promo=1', tone: 'from-ink/85' },
  { img: '/img/prod/robe-wax-1.webp', pos: 'object-[center_25%]', eyebrow: 'Nouvelle collection', title: 'Fierté Wax', sub: `Robes et chemises cousues à Abidjan. Dès ${fcfa(Math.min(...products.filter((p) => p.id === 'p08' || p.id === 'p27').map((p) => p.price)))}.`, cta: 'Découvrir', to: '/boutique?sub=robes', tone: 'from-[#3a1d0b]/85' },
  { img: '/img/cat-bijoux.webp', pos: 'object-center', eyebrow: 'Plaqué or 18K', title: 'L’or qui brille', sub: 'Chaînes, bracelets, bagues : garantie 1 an, écrin offert.', cta: 'Voir les bijoux', to: '/boutique?cat=bijoux', tone: 'from-ink/80' },
  { img: '/img/cat-cheveux.webp', pos: 'object-center', eyebrow: 'Cheveux & soins', title: 'Rituel naturel', sub: 'Huiles, karité pur, perruques lace HD. Pour tous les âges.', cta: 'Acheter', to: '/boutique?cat=cheveux', tone: 'from-[#1f150c]/80' },
]

function HeroCarousel() {
  const [i, setI] = useState(0)
  const [paused, setPaused] = useState(false)
  useEffect(() => { if (paused) return; const t = setInterval(() => setI((x) => (x + 1) % slides.length), 5200); return () => clearInterval(t) }, [paused])
  const s = slides[i]
  return (
    <div className="group relative aspect-[16/10] overflow-hidden rounded-xl bg-ink sm:aspect-[21/9] lg:aspect-auto lg:h-full" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <AnimatePresence initial={false}>
        <motion.div key={i} className="absolute inset-0" initial={{ opacity: 0, scale: 1.04 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.8 }}>
          <img src={s.img} alt={s.title} className={cn('h-full w-full object-cover', s.pos)} {...(i === 0 ? { fetchpriority: 'high' } : {})} />
          <div className={cn('absolute inset-0 bg-gradient-to-r via-black/25 to-transparent', s.tone)} />
          <div className="absolute inset-0 flex flex-col justify-center px-6 text-white sm:px-12 lg:px-14">
            <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="w-fit rounded-full bg-gold px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-ink sm:text-xs">{s.eyebrow}</motion.p>
            <motion.h1 initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="mt-2 font-display text-[38px] font-semibold leading-none sm:mt-3 sm:text-6xl lg:text-7xl">{s.title}</motion.h1>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="mt-2 max-w-[16rem] text-xs text-white/85 sm:mt-3 sm:max-w-sm sm:text-[15px]">{s.sub}</motion.p>
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
              <Link to={s.to} className="mt-4 inline-flex rounded-full bg-white px-5 py-2 text-xs font-bold uppercase tracking-wider text-ink transition hover:bg-gold sm:mt-6 sm:px-7 sm:py-3 sm:text-sm">{s.cta}</Link>
            </motion.div>
          </div>
        </motion.div>
      </AnimatePresence>
      <button onClick={() => setI((i - 1 + slides.length) % slides.length)} className="absolute left-3 top-1/2 hidden h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/80 text-ink opacity-0 shadow transition group-hover:opacity-100 sm:grid" aria-label="Précédent"><ChevronLeft size={20} /></button>
      <button onClick={() => setI((i + 1) % slides.length)} className="absolute right-3 top-1/2 hidden h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/80 text-ink opacity-0 shadow transition group-hover:opacity-100 sm:grid" aria-label="Suivant"><ChevronRight size={20} /></button>
      <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
        {slides.map((_, k) => <button key={k} onClick={() => setI(k)} aria-label={`Diapositive ${k + 1}`} className={cn('h-1.5 rounded-full transition-all', k === i ? 'w-6 bg-white' : 'w-1.5 bg-white/50')} />)}
      </div>
    </div>
  )
}

/* ───────────────────────── Tuiles campagnes ───────────────────────── */
const byId = (id: string) => products.find((p) => p.id === id)!
const tiles = [
  { title: 'Tendances', sub: 'Les plus aimés', icon: Flame, color: 'text-red-600', to: '/boutique?tri=populaires', items: ['p13', 'p27', 'p15'] },
  { title: 'Livraison 24 h', sub: 'Abidjan & Agboville', icon: Truck, color: 'text-emerald-600', to: '/boutique?express=1', items: ['p24', 'p26', 'p19'] },
  { title: 'Petits prix', sub: 'Moins de 10 000 F', icon: Wallet, color: 'text-gold-dark', to: '/boutique?prix=10000', items: ['p05', 'p31', 'p21'] },
]

function CampaignTiles({ className = '' }: { className?: string }) {
  return (
    <div className={cn('no-scrollbar -mx-5 flex gap-3 overflow-x-auto px-5 sm:mx-0 sm:grid sm:grid-cols-3 sm:px-0 lg:grid-cols-1 lg:gap-3', className)}>
      {tiles.map((t) => (
        <Link key={t.title} to={t.to} className="group w-[78%] shrink-0 rounded-xl bg-white p-3 shadow-sm ring-1 ring-ink/5 transition hover:shadow-md sm:w-auto">
          <div className="flex items-center justify-between">
            <p className="flex items-center gap-1.5 text-sm font-extrabold"><t.icon size={16} className={t.color} /> {t.title}</p>
            <span className="flex items-center text-[11px] text-ink-400 group-hover:text-ink">{t.sub} <ChevronRight size={13} /></span>
          </div>
          <div className="mt-2 grid grid-cols-3 gap-1.5">
            {t.items.map((id) => { const p = byId(id); return (
              <div key={id}>
                <div className="aspect-square overflow-hidden rounded-md bg-ivory-200"><Img src={p.images[0]} alt={p.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" /></div>
                <p className={cn('mt-1 truncate text-[11px] font-bold lg:hidden', !!p.compareAt && 'text-red-600')}>{fcfa(p.price)}</p>
              </div>) })}
          </div>
        </Link>
      ))}
    </div>
  )
}

/* ───────────────────────── Icônes catégories ───────────────────────── */
function CategoryCircles() {
  const extra = [
    { id: 'promo', name: 'Promos', to: '/boutique?promo=1', badge: '-30%' },
    { id: 'new', name: 'Nouveautés', to: '/boutique?tri=nouveautes', badge: 'NEW' },
  ]
  return (
    <section className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-ink/5 sm:p-5">
      <div className="no-scrollbar -mx-4 overflow-x-auto px-4 sm:-mx-5 sm:px-5">
        <div className="grid w-max grid-flow-col grid-rows-2 gap-x-3 gap-y-4 sm:gap-x-5">
          {extra.map((e) => (
            <Link key={e.id} to={e.to} className="group flex w-[68px] flex-col items-center text-center sm:w-[84px]">
              <span className={cn('grid h-[60px] w-[60px] place-items-center rounded-full text-sm font-black sm:h-[76px] sm:w-[76px]', e.id === 'promo' ? 'bg-gradient-to-br from-red-500 to-orange-400 text-white' : 'bg-ink text-gold-light')}>{e.badge}</span>
              <span className="mt-1.5 line-clamp-2 text-[11px] leading-tight sm:text-xs">{e.name}</span>
            </Link>
          ))}
          {subcategories.map((s) => (
            <Link key={s.id} to={`/boutique?sub=${s.id}`} className="group flex w-[68px] flex-col items-center text-center sm:w-[84px]">
              <span className="h-[60px] w-[60px] overflow-hidden rounded-full bg-ivory-200 ring-2 ring-transparent transition group-hover:ring-gold sm:h-[76px] sm:w-[76px]"><Img src={s.image} alt="" className="h-full w-full object-cover" /></span>
              <span className="mt-1.5 line-clamp-2 text-[11px] leading-tight group-hover:text-gold-dark sm:text-xs">{s.name}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ───────────────────────── Ventes flash ───────────────────────── */
function useCountdown() {
  const end = useMemo(() => { const d = new Date(); d.setHours(23, 59, 59, 999); return d.getTime() }, [])
  const [now, setNow] = useState(Date.now())
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t) }, [])
  const left = Math.max(0, end - now)
  return [Math.floor(left / 3.6e6), Math.floor((left / 6e4) % 60), Math.floor((left / 1000) % 60)].map((n) => String(n).padStart(2, '0'))
}

function Scroller({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const by = (d: number) => ref.current?.scrollBy({ left: d * ref.current.clientWidth * 0.8, behavior: 'smooth' })
  return (
    <div className="group/s relative">
      <div ref={ref} className={cn('no-scrollbar flex snap-x gap-2.5 overflow-x-auto sm:gap-3', className)}>{children}</div>
      <button onClick={() => by(-1)} className="absolute -left-3 top-[38%] hidden h-9 w-9 place-items-center rounded-full bg-white shadow-lg ring-1 ring-ink/5 transition hover:bg-ink hover:text-ivory lg:grid lg:opacity-0 lg:group-hover/s:opacity-100" aria-label="Précédent"><ChevronLeft size={18} /></button>
      <button onClick={() => by(1)} className="absolute -right-3 top-[38%] hidden h-9 w-9 place-items-center rounded-full bg-white shadow-lg ring-1 ring-ink/5 transition hover:bg-ink hover:text-ivory lg:grid lg:opacity-0 lg:group-hover/s:opacity-100" aria-label="Suivant"><ChevronRight size={18} /></button>
    </div>
  )
}

function FlashSale() {
  const [h, m, s] = useCountdown()
  const flash = useMemo(() => products.filter((p) => p.flash), [])
  return (
    <section className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-ink/5">
      <div className="flex items-center justify-between gap-3 bg-gradient-to-r from-red-600 via-red-500 to-orange-400 px-4 py-2.5 text-white sm:px-5">
        <div className="flex items-center gap-2 sm:gap-4">
          <p className="flex items-center gap-1 text-base font-black italic tracking-tight sm:text-xl"><Zap size={20} className="fill-yellow-300 text-yellow-300" /> VENTES FLASH</p>
          <div className="flex items-center gap-1 text-xs font-semibold">
            <span className="hidden sm:inline">Se termine dans</span>
            {[h, m, s].map((v, k) => <span key={k} className="flex items-center gap-1"><span className="rounded bg-ink px-1.5 py-0.5 font-mono text-[13px] font-bold tabular-nums">{v}</span>{k < 2 && ':'}</span>)}
          </div>
        </div>
        <Link to="/boutique?flash=1" className="flex shrink-0 items-center text-xs font-bold hover:underline">Tout voir <ChevronRight size={15} /></Link>
      </div>
      <div className="p-3 sm:p-4">
        <Scroller>
          {flash.map((p) => <ProductCard key={p.id} p={p} flash className="w-[38%] shrink-0 snap-start sm:w-[23%] lg:w-[15.5%]" />)}
        </Scroller>
      </div>
    </section>
  )
}

/* ───────────────────────── Coupons ───────────────────────── */
function CouponBar() {
  return (
    <section className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-ink/5 sm:p-5">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-extrabold sm:text-base">🎁 Coupons du jour</p>
        <Link to="/compte?mode=inscription" className="text-xs font-semibold text-ink-500 hover:text-ink">Récupérer plus ›</Link>
      </div>
      <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 sm:mx-0 sm:grid sm:grid-cols-3 sm:px-0">
        {coupons.map((c) => <CouponTicket key={c.code} c={c} />)}
      </div>
    </section>
  )
}

/* ───────────────────────── Blocs promo « ACHETER » ───────────────────────── */
const promoBlocks = [
  { title: 'Élégance Femme', sub: 'Robes wax, escarpins & bijoux', img: '/img/prod/escarpins-1.webp', to: '/boutique?genre=Femme', bg: 'bg-[#F3E3D3]', items: ['p27', 'p30'] },
  { title: 'Style Homme', sub: 'Cargo, sandales cuir, chevalières', img: '/img/prod/sandales-1.webp', to: '/boutique?genre=Homme', bg: 'bg-[#E4E1D8]', items: ['p28', 'p18'] },
  { title: 'Tech du quotidien', sub: 'Charge rapide, supports & son', img: '/img/prod/trepied-1.webp', to: '/boutique?cat=accessoires', bg: 'bg-[#DCE3E6]', items: ['p25', 'p01'] },
]

function PromoBlocks() {
  return (
    <section className="grid gap-3 md:grid-cols-3">
      {promoBlocks.map((b) => (
        <div key={b.title} className={cn('flex gap-2.5 rounded-xl p-2.5', b.bg)}>
          <Link to={b.to} className="group relative w-[42%] shrink-0 overflow-hidden rounded-lg">
            <Img src={b.img} alt={b.title} className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-3 text-white">
              <p className="font-display text-xl font-semibold leading-none">{b.title}</p>
              <p className="mt-1 text-[10px] text-white/80">{b.sub}</p>
              <span className="mt-2 inline-block rounded-full bg-white px-3 py-1 text-[10px] font-black tracking-wider text-ink group-hover:bg-gold">ACHETER</span>
            </div>
          </Link>
          <div className="grid flex-1 grid-cols-2 gap-2">
            {b.items.map((id) => { const p = byId(id); return (
              <Link key={id} to={`/produit/${p.slug}`} className="group flex flex-col rounded-lg bg-white p-1.5">
                <div className="relative aspect-[3/4] overflow-hidden rounded-md bg-ivory-200">
                  <Img src={p.images[0]} alt={p.name} className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:opacity-0" />
                  <Img src={p.images[1]} alt="" className="absolute inset-0 h-full w-full object-cover opacity-0 transition duration-500 group-hover:opacity-100" />
                  {p.compareAt && <span className="absolute left-0 top-1.5 rounded-r bg-red-600 px-1.5 py-0.5 text-[10px] font-bold text-white">-{Math.round((1 - p.price / p.compareAt) * 100)}%</span>}
                </div>
                <p className="mt-1.5 truncate text-[11.5px] text-ink-700">{p.name}</p>
                <p className={cn('text-[13px] font-extrabold', !!p.compareAt && 'text-red-600')}>{fcfa(p.price)}</p>
              </Link>) })}
          </div>
        </div>
      ))}
    </section>
  )
}

/* ───────────────────────── Top tendances ───────────────────────── */
function TopTrends() {
  const trend = useMemo(() => products.filter((p) => p.hashtag).sort((a, b) => (b.sold ?? 0) - (a.sold ?? 0)), [])
  const [tag, setTag] = useState<string | null>(null)
  const list = tag ? trend.filter((p) => p.hashtag === tag) : trend
  return (
    <section className="rounded-xl bg-gradient-to-b from-[#FFF4DF] to-white p-4 shadow-sm ring-1 ring-ink/5 sm:p-5">
      <div className="mb-3 flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-base font-black italic sm:text-lg"><Sparkles size={18} className="text-gold" /> TOP TENDANCES</p>
        <Link to="/boutique?tri=populaires" className="flex items-center text-xs font-semibold text-ink-500 hover:text-ink">Voir plus <ChevronRight size={14} /></Link>
      </div>
      <div className="no-scrollbar -mx-4 mb-3 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <button onClick={() => setTag(null)} className={cn('shrink-0 rounded-full px-3 py-1.5 text-xs font-bold transition', !tag ? 'bg-ink text-gold-light' : 'bg-white ring-1 ring-ink/10 hover:ring-ink')}>Tout</button>
        {trend.map((p) => (
          <button key={p.hashtag} onClick={() => setTag(p.hashtag!)} className={cn('flex shrink-0 items-center gap-0.5 rounded-full px-3 py-1.5 text-xs font-bold transition', tag === p.hashtag ? 'bg-ink text-gold-light' : 'bg-white text-gold-dark ring-1 ring-gold/30 hover:ring-gold')}>
            <Hash size={12} />{p.hashtag!.slice(1)}
          </button>
        ))}
      </div>
      <Scroller>
        {list.map((p, k) => <ProductCard key={p.id} p={p} trend rank={!tag && k < 3 ? k + 1 : undefined} className="w-[38%] shrink-0 snap-start sm:w-[23%] lg:w-[15.5%]" />)}
      </Scroller>
    </section>
  )
}

/* ───────────────────────── Récemment consultés ───────────────────────── */
function RecentlyViewed() {
  const ids = useRecent((s) => s.ids)
  const clear = useRecent((s) => s.clear)
  const list = useMemo(() => ids.map((id) => products.find((p) => p.id === id)).filter(Boolean) as Product[], [ids])
  if (!list.length) return null
  return (
    <section className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-ink/5 sm:p-5">
      <div className="mb-3 flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-sm font-extrabold sm:text-base"><Clock size={16} /> Récemment consultés</p>
        <button onClick={clear} className="text-xs font-semibold text-ink-400 hover:text-red-600">Effacer</button>
      </div>
      <Scroller>
        {list.map((p) => <ProductCard key={p.id} p={p} className="w-[30%] shrink-0 snap-start sm:w-[18%] lg:w-[12%]" />)}
      </Scroller>
    </section>
  )
}

/* ───────────────────────── Fil « Pour vous » ───────────────────────── */
const feedTabs: { id: string; label: string; filter?: (p: Product) => boolean; sort?: (a: Product, b: Product) => number }[] = [
  { id: 'reco', label: 'Pour vous', sort: (a, b) => Number(!!b.featured) - Number(!!a.featured) || (b.sold ?? 0) * b.rating - (a.sold ?? 0) * a.rating },
  { id: 'new', label: 'Nouveautés', sort: (a, b) => a.addedDaysAgo - b.addedDaysAgo },
  { id: 'promo', label: 'Promos', filter: (p) => !!p.compareAt },
  ...(['15-25', '25-50', '50-80'] as AgeGroup[]).map((a) => ({ id: a, label: `${a.replace('-', '–')} ans`, filter: (p: Product) => p.ages.includes(a) })),
  { id: 'cheap', label: 'Moins de 10 000 F', filter: (p) => p.price < 10000, sort: (a, b) => a.price - b.price },
]
const PAGE = 15

function ForYouFeed() {
  const [tab, setTab] = useState('reco')
  const [n, setN] = useState(PAGE)
  const sentinel = useRef<HTMLDivElement>(null)
  const t = feedTabs.find((x) => x.id === tab)!
  const list = useMemo(() => { const l = products.filter(t.filter ?? (() => true)); return t.sort ? [...l].sort(t.sort) : l }, [t])
  useEffect(() => setN(PAGE), [tab])
  useEffect(() => {
    const el = sentinel.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) setN((x) => Math.min(x + 10, list.length)) }, { rootMargin: '400px' })
    io.observe(el)
    return () => io.disconnect()
  }, [list.length])

  return (
    <section>
      <div className="sticky top-[96px] z-20 -mx-5 bg-ivory-100/95 px-5 py-2.5 backdrop-blur sm:top-[112px] lg:top-[116px]">
        <div className="no-scrollbar flex gap-2 overflow-x-auto">
          {feedTabs.map((f) => (
            <button key={f.id} onClick={() => setTab(f.id)} className={cn('shrink-0 rounded-full px-4 py-2 text-[13px] font-semibold transition', tab === f.id ? 'bg-ink text-gold-light' : 'bg-white text-ink-700 ring-1 ring-ink/10 hover:ring-ink')}>
              {f.id === 'reco' && '✨ '}{f.label}
            </button>
          ))}
        </div>
      </div>
      <motion.div key={tab} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-3 grid grid-cols-2 gap-x-2.5 gap-y-5 sm:grid-cols-3 sm:gap-x-3 md:grid-cols-4 xl:grid-cols-5">
        {list.slice(0, n).map((p) => <ProductCard key={p.id} p={p} />)}
      </motion.div>
      {n < list.length ? (
        <div ref={sentinel} className="mt-6 flex justify-center">
          <button onClick={() => setN((x) => x + 10)} className="rounded-full border border-ink px-8 py-2.5 text-xs font-bold uppercase tracking-wider hover:bg-ink hover:text-ivory">Voir plus</button>
        </div>
      ) : (
        <div className="mt-8 text-center">
          <p className="text-xs text-ink-400">Vous avez tout vu ✨ — {list.length} articles</p>
          <Link to="/boutique" className="mt-3 inline-block rounded-full bg-ink px-8 py-3 text-xs font-bold uppercase tracking-wider text-ivory hover:bg-gold hover:text-ink">Explorer toute la boutique</Link>
        </div>
      )}
    </section>
  )
}

/* ───────────────────────── Réassurance ───────────────────────── */
function TrustBar() {
  const items = [
    { icon: Truck, t: 'Livraison 24 h', d: 'Abidjan & Agboville' },
    { icon: Wallet, t: 'Paiement à la livraison', d: 'ou Orange, MTN, Wave, Moov' },
    { icon: RotateCcw, t: 'Retours 7 jours', d: 'Échange ou remboursement' },
    { icon: ShieldCheck, t: 'Achat sécurisé', d: 'Produits vérifiés' },
    { icon: MapPin, t: '2 boutiques', d: 'Agboville & Riviera 2' },
    { icon: BadgeCheck, t: '+2 400 avis', d: 'Note moyenne 4,8/5' },
  ]
  return (
    <section className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 sm:mx-0 sm:grid sm:grid-cols-3 sm:px-0 lg:grid-cols-6">
      {items.map((i) => (
        <div key={i.t} className="flex min-w-[170px] items-center gap-2.5 rounded-xl bg-white p-3 ring-1 ring-ink/5">
          <i.icon size={22} className="shrink-0 text-gold-dark" />
          <div className="min-w-0"><p className="text-xs font-bold">{i.t}</p><p className="truncate text-[11px] text-ink-500">{i.d}</p></div>
        </div>
      ))}
    </section>
  )
}

export default function Home() {
  useEffect(() => { document.title = 'YVES STORE — Mode, bijoux, tech & cheveux | Côte d’Ivoire' }, [])
  return (
    <Page>
      <div className="bg-ivory-100">
        <div className="container-x space-y-3 pb-10 pt-3 sm:space-y-4 sm:pt-4">
          <div className="grid gap-3 lg:h-[430px] lg:grid-cols-[1fr_280px] lg:gap-4">
            <HeroCarousel />
            <CampaignTiles />
          </div>
          <CategoryCircles />
          <FlashSale />
          <CouponBar />
          <PromoBlocks />
          <TopTrends />
          <RecentlyViewed />
          <TrustBar />
          <div className="pt-3">
            <h2 className="mb-1 text-center text-lg font-black tracking-tight sm:text-xl">✦ Pour vous ✦</h2>
            <ForYouFeed />
          </div>
        </div>
      </div>
    </Page>
  )
}
