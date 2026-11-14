import { AnimatePresence, motion } from 'framer-motion'
import { BadgeCheck, ChevronDown, Heart, Minus, Plus, RotateCcw, Share2, ShieldCheck, Truck, Wallet, X } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import ProductCard from '../components/ProductCard'
import { Img, Page, Reveal, Stars } from '../components/ui'
import { getCategory, getProduct, products, type Product } from '../data/products'
import { cn, discount, fcfa, FREE_SHIPPING } from '../lib/format'
import { useCart, useRecent, useUI, useWishlist } from '../store'
import { useAuth } from '../store/auth'
import { deleteMyReview, fetchReviews, reviewDate, reviewStat, submitReview, type PublicReview } from '../lib/reviews'
import { defaultPick, priceRange, unitPrice, visibleSizes, type OptionPick } from '../lib/options'
import OptionPicker from '../components/OptionPicker'
import NotFound from './NotFound'
import { allProducts, useCatalogVersion } from '../lib/catalog'

function Gallery({ p }: { p: Product }) {
  const [i, setI] = useState(0)
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null)
  const [lightbox, setLightbox] = useState(false)
  useEffect(() => setI(0), [p.id])
  return (
    <div className="lg:sticky lg:top-[136px] lg:self-start">
      <div className="flex flex-col-reverse gap-3 lg:flex-row">
        <div className="no-scrollbar flex gap-3 overflow-x-auto lg:flex-col">
          {p.images.map((src, k) => (
            <button key={src} onClick={() => setI(k)} className={cn('relative h-24 w-20 shrink-0 overflow-hidden rounded-xl border-2 transition', i === k ? 'border-ink' : 'border-transparent opacity-60 hover:opacity-100')} aria-label={`Image ${k + 1}`}>
              <Img src={src} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
        <div
          className="relative aspect-[4/5] flex-1 cursor-zoom-in overflow-hidden rounded-3xl bg-ivory-200"
          onMouseMove={(e) => { const r = e.currentTarget.getBoundingClientRect(); setZoom({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 }) }}
          onMouseLeave={() => setZoom(null)}
          onClick={() => setLightbox(true)}
          onTouchStart={(e) => ((e.currentTarget as HTMLElement).dataset.x = String(e.touches[0].clientX))}
          onTouchEnd={(e) => {
            const dx = e.changedTouches[0].clientX - Number((e.currentTarget as HTMLElement).dataset.x)
            if (Math.abs(dx) > 40) setI((v) => (v + (dx < 0 ? 1 : -1) + p.images.length) % p.images.length)
          }}
        >
          <AnimatePresence mode="wait">
            <motion.img
              key={p.images[i]} src={p.images[i]} alt={p.name}
              initial={{ opacity: 0, scale: 1.03 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-200"
              style={zoom ? { transform: 'scale(1.8)', transformOrigin: `${zoom.x}% ${zoom.y}%` } : undefined}
            />
          </AnimatePresence>
          <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-1.5 lg:hidden">
            {p.images.map((_, k) => <span key={k} className={cn('h-1.5 rounded-full bg-white transition-all', i === k ? 'w-6' : 'w-1.5 opacity-60')} />)}
          </div>
        </div>
      </div>
      <AnimatePresence>
        {lightbox && (
          <motion.div className="fixed inset-0 z-[90] flex items-center justify-center bg-ink/95 p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setLightbox(false)}>
            <button className="absolute right-5 top-5 rounded-full bg-ivory/10 p-3 text-ivory" aria-label="Fermer"><X /></button>
            <motion.img initial={{ scale: 0.92 }} animate={{ scale: 1 }} src={p.images[i]} alt={p.name} className="max-h-[90vh] max-w-full rounded-2xl object-contain" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function Accordion({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [o, setO] = useState(defaultOpen)
  return (
    <div className="border-b border-ink/10">
      <button onClick={() => setO(!o)} className="flex w-full items-center justify-between py-5 text-left text-sm font-semibold uppercase tracking-[0.14em]">{title}<ChevronDown size={18} className={cn('transition duration-300', o && 'rotate-180')} /></button>
      <AnimatePresence initial={false}>
        {o && <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden"><div className="pb-6 text-sm leading-relaxed text-ink-500">{children}</div></motion.div>}
      </AnimatePresence>
    </div>
  )
}

function Reviews({ p }: { p: Product }) {
  const user = useAuth((st) => st.user)
  const isAdmin = useAuth((st) => st.isAdmin)
  const [list, setList] = useState<PublicReview[] | null>(null)
  const [loadErr, setLoadErr] = useState(false)
  const [filter, setFilter] = useState(0)
  const [writing, setWriting] = useState(false)
  const [form, setForm] = useState({ rating: 5, title: '', body: '' })
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  useCatalogVersion((st) => st.v) // note moyenne rafraîchie après publication

  const load = useCallback(() => { fetchReviews(p.id).then((r) => { setList(r); setLoadErr(false) }).catch(() => setLoadErr(true)) }, [p.id])
  useEffect(() => { setList(null); setWriting(false); setFilter(0); setDone(false); load() }, [load, user?.id])

  const mine = list?.find((r) => r.mine)
  const others = (list ?? []).filter((r) => !r.mine)
  const stat = reviewStat(p.id)
  const total = stat?.review_count ?? 0
  const dist = (stat?.dist ?? [0, 0, 0, 0, 0]).map((n) => (total ? Math.round((n / total) * 100) : 0))
  const shown = filter ? others.filter((r) => r.rating === filter) : others
  const loginHref = `/compte?redirect=${encodeURIComponent(`/produit/${p.slug}#avis`)}`

  const open = () => {
    if (writing) return setWriting(false)
    setForm(mine ? { rating: mine.rating, title: mine.title ?? '', body: mine.comment } : { rating: 5, title: '', body: '' })
    setErr(''); setDone(false); setWriting(true)
  }
  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (form.body.trim().length < 10) return setErr('Votre avis doit contenir au moins 10 caractères.')
    setBusy(true); setErr('')
    const r = await submitReview(p.id, form.rating, form.title, form.body)
    setBusy(false)
    if (!r.ok) return setErr(r.error)
    setWriting(false); setDone(true); load()
  }
  const remove = async () => {
    if (!confirm('Supprimer votre avis ?')) return
    if (await deleteMyReview(p.id)) { setDone(false); load() }
  }

  const card = (r: PublicReview, k: number) => (
    <motion.li key={r.id} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: (k % 4) * 0.05 }} className="py-7" data-testid="review">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-ink font-display text-lg text-gold-light">{r.author[0]}</span>
          <div>
            <p className="text-sm font-semibold">{r.author}{r.mine && <span className="ml-2 rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gold-dark">Votre avis</span>}</p>
            <p className="text-xs text-ink-400">{[r.city, reviewDate(r.created_at)].filter(Boolean).join(' · ')}</p>
          </div>
        </div>
        {r.verified && <span className="flex items-center gap-1 text-xs font-medium text-emerald-700"><BadgeCheck size={14} /> Achat vérifié</span>}
      </div>
      <Stars value={r.rating} className="mt-4" />
      {r.title && <p className="mt-2 font-display text-xl">{r.title}</p>}
      <p className="mt-1.5 whitespace-pre-line text-[15px] leading-relaxed text-ink-500">{r.comment}</p>
      {r.reply && (
        <div className="mt-4 rounded-2xl border-l-4 border-gold bg-ivory-200/70 px-4 py-3" data-testid="review-reply">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-gold-dark">Réponse de YVES STORE</p>
          <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-ink-700">{r.reply}</p>
        </div>
      )}
      {r.mine && r.hidden && <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">Votre avis a été masqué par la boutique : il n’est visible que par vous.</p>}
      {r.mine && (
        <div className="mt-3 flex gap-4 text-xs font-semibold">
          <button type="button" onClick={open} className="text-ink-500 underline-offset-4 hover:text-ink hover:underline">Modifier</button>
          <button type="button" onClick={remove} className="text-ink-400 underline-offset-4 hover:text-red-700 hover:underline">Supprimer</button>
        </div>
      )}
    </motion.li>
  )

  return (
    <section id="avis" className="container-x scroll-mt-24 py-20">
      <div className="grid gap-12 lg:grid-cols-[340px_1fr]">
        <div>
          <p className="eyebrow">Avis clients</p>
          <h2 className="h-display mt-3 text-5xl">Ce qu’ils en pensent</h2>
          <div className="mt-8 flex items-end gap-4">
            <span className="font-display text-7xl leading-none" data-testid="review-avg">{total ? p.rating.toFixed(1).replace('.', ',') : '—'}</span>
            <div className="pb-2"><Stars value={total ? p.rating : 0} size={18} /><p className="mt-1 text-sm text-ink-500">{total ? `${total} avis client${total > 1 ? 's' : ''}` : 'Aucun avis pour le moment'}</p></div>
          </div>
          <div className="mt-6 space-y-2">
            {dist.map((pct, k) => {
              const star = 5 - k
              return (
                <button key={star} onClick={() => setFilter(filter === star ? 0 : star)} disabled={!total} className={cn('flex w-full items-center gap-3 rounded-lg px-2 py-1 text-sm transition hover:bg-ivory-200 disabled:cursor-default disabled:hover:bg-transparent', filter === star && 'bg-ivory-200')}>
                  <span className="w-8 text-left">{star} ★</span>
                  <span className="h-2 flex-1 overflow-hidden rounded-full bg-ink/10"><motion.span className="block h-full rounded-full bg-gold" initial={{ width: 0 }} whileInView={{ width: `${pct}%` }} viewport={{ once: true }} transition={{ duration: 1, delay: k * 0.08 }} /></span>
                  <span className="w-9 text-right text-xs text-ink-400">{pct}%</span>
                </button>
              )
            })}
          </div>
          {isAdmin ? (
            <p className="mt-8 rounded-2xl bg-ivory-200/70 p-4 text-sm text-ink-500">Vous êtes connecté en gérant : répondez aux avis depuis <Link to="/gerant/avis" className="font-semibold text-ink underline underline-offset-4">Espace gérant → Avis clients</Link>.</p>
          ) : user ? (
            <button onClick={open} className="btn-dark mt-8 w-full" data-testid="review-write">{writing ? 'Annuler' : mine ? 'Modifier mon avis' : 'Écrire un avis'}</button>
          ) : (
            <div className="mt-8 rounded-2xl border border-ink/10 bg-white p-5 text-center">
              <p className="text-sm text-ink-500">Vous avez acheté cet article ? Donnez votre avis aux autres clients.</p>
              <Link to={loginHref} className="btn-dark mt-4 w-full" data-testid="review-login">Se connecter pour donner un avis</Link>
            </div>
          )}
          {done && <p className="mt-3 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800" data-testid="review-done">Merci ! Votre avis est publié. 🙏</p>}
        </div>

        <div>
          <AnimatePresence>
            {writing && (
              <motion.form onSubmit={submit} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="mb-8 overflow-hidden" data-testid="review-form">
                <div className="grid gap-4 rounded-3xl border border-ink/10 bg-white p-6">
                  <div>
                    <span className="label">Votre note</span>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button type="button" key={n} onClick={() => setForm({ ...form, rating: n })} className={cn('text-3xl transition hover:scale-110', n <= form.rating ? 'text-gold' : 'text-ink/15')} aria-label={`${n} étoile${n > 1 ? 's' : ''}`}>★</button>
                      ))}
                      <span className="ml-2 self-center text-sm text-ink-500">{['', 'Décevant', 'Moyen', 'Bien', 'Très bien', 'Excellent'][form.rating]}</span>
                    </div>
                  </div>
                  <div><label className="label" htmlFor="rv-title">Titre (facultatif)</label><input id="rv-title" className="input" maxLength={80} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Résumez votre expérience" /></div>
                  <div>
                    <label className="label" htmlFor="rv-body">Votre avis *</label>
                    <textarea id="rv-body" rows={4} maxLength={1000} className="input resize-none" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} placeholder="Qualité, taille, livraison…" />
                    <p className="mt-1 text-right text-[11px] text-ink-400">{form.body.trim().length} / 1000</p>
                  </div>
                  <p className="text-xs text-ink-400">Publié avec votre prénom et l’initiale de votre nom. Le badge « Achat vérifié » s’affiche si vous avez commandé cet article.</p>
                  {err && <p className="text-sm text-red-700">{err}</p>}
                  <button className="btn-gold" disabled={busy}>{busy ? 'Publication…' : mine ? 'Enregistrer les modifications' : 'Publier mon avis'}</button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          {mine && !writing && <ul className="mb-2 rounded-3xl border border-gold/30 bg-gold/5 px-5">{card(mine, 0)}</ul>}
          {filter > 0 && <button onClick={() => setFilter(0)} className="chip mb-4 border-ink/15 bg-white">Avis {filter} ★ <X size={12} /></button>}
          <ul className="divide-y divide-ink/10">
            {list === null && !loadErr && <li className="py-10 text-ink-400">Chargement des avis…</li>}
            {loadErr && <li className="py-10 text-ink-500">Les avis n’ont pas pu être chargés. <button onClick={load} className="font-semibold underline">Réessayer</button></li>}
            {list !== null && shown.length === 0 && !mine && <li className="py-10 text-ink-500">{filter ? 'Aucun avis avec cette note pour le moment.' : 'Soyez le premier à donner votre avis sur cet article ✨'}</li>}
            {shown.map((r, k) => card(r, k))}
          </ul>
        </div>
      </div>
    </section>
  )
}

export default function ProductPage() {
  const { slug = '' } = useParams()
  const p = getProduct(slug)
  const nav = useNavigate()
  const add = useCart((s) => s.add)
  const { openCart, notify } = useUI()
  const wished = useWishlist((s) => (p ? s.ids.includes(p.id) : false))
  const toggleWish = useWishlist((s) => s.toggle)
  const [size, setSize] = useState<string | undefined>()
  const [color, setColor] = useState<string | undefined>()
  const [qty, setQty] = useState(1)
  const [sizeErr, setSizeErr] = useState(false)
  const [pick, setPick] = useState<OptionPick>({})
  const pushRecent = useRecent((s) => s.push)
  useEffect(() => { if (p) pushRecent(p.id) }, [p, pushRecent])

  useEffect(() => {
    setSize(p?.sizes?.length === 1 ? p.sizes[0] : undefined); setColor(p?.colors?.[0]?.name); setQty(1); setSizeErr(false); setPick(p ? defaultPick(p) : {})
    if (p) document.title = `${p.name} — YVES STORE`
    return () => { document.title = 'YVES STORE — Mode, Bijoux, Chaussures & Accessoires | Côte d’Ivoire' }
  }, [p])

  if (!p) {
    const gone = allProducts.find((x) => x.slug === slug)
    if (!gone) return <NotFound />
    const alt = products.filter((x) => x.category === gone.category).slice(0, 5)
    return (
      <Page>
        <section className="container-x flex flex-col items-center py-20 text-center">
          <Img src={gone.images[0]} alt="" className="h-40 w-32 rounded-xl object-cover opacity-50 grayscale" />
          <h1 className="h-display mt-6 text-3xl sm:text-4xl">Article retiré de la vente</h1>
          <p className="mt-3 max-w-md text-ink-500">« {gone.name} » n’est plus proposé pour le moment. Découvrez nos autres articles de la même catégorie.</p>
          <Link to={`/boutique?cat=${gone.category}`} className="btn-dark mt-7">Voir la catégorie</Link>
        </section>
        {alt.length > 0 && (
          <section className="container-x pb-20">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">{alt.map((x) => <ProductCard key={x.id} p={x} />)}</div>
          </section>
        )}
      </Page>
    )
  }
  const cat = getCategory(p.category)
  const off = discount(p.price, p.compareAt)
  const related = products.filter((x) => x.category === p.category && x.id !== p.id).concat(products.filter((x) => x.category !== p.category && x.featured)).slice(0, 10)
  const delivery = new Date(Date.now() + 86400000 * (new Date().getHours() < 14 ? 1 : 2)).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })

  const soldOut = p.stock <= 0
  const price = unitPrice(p, pick)
  const sizes = visibleSizes(p)
  const range = priceRange(p)
  const doAdd = (buyNow = false) => {
    if (soldOut) return
    if (sizes && sizes.length > 1 && !size) { setSizeErr(true); return }
    add({ productId: p.id, size: sizes ? size : undefined, color, options: p.priceOptions?.length ? pick : undefined }, qty)
    if (buyNow) return nav('/commande')
    notify(`${p.name} ajouté au panier`, p.images[0]); openCart()
  }
  const share = async () => {
    const data = { title: p.name, text: `${p.name} — ${fcfa(range.min)} sur YVES STORE`, url: location.href }
    if (navigator.share) { try { await navigator.share(data) } catch { /* cancelled */ } } else { await navigator.clipboard?.writeText(location.href); notify('Lien copié !') }
  }

  return (
    <Page>
      <div className="container-x pt-6">
        <nav className="text-xs text-ink-400"><Link to="/" className="hover:text-ink">Accueil</Link><span className="mx-2">/</span><Link to={`/boutique?cat=${cat.id}`} className="hover:text-ink">{cat.name}</Link><span className="mx-2">/</span><span className="text-ink">{p.name}</span></nav>
      </div>
      <section className="container-x grid gap-10 py-8 lg:grid-cols-[1.15fr_1fr] lg:gap-16">
        <Gallery p={p} />
        <div>
          <div className="flex flex-wrap items-center gap-2">
            {!!p.previousPrice && <span className="rounded-full bg-emerald-600 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white">Nouveau prix</span>}
            {p.badge && <span className="rounded-full bg-ink px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-ivory">{p.badge}</span>}
            {off > 0 && <span className="rounded-full bg-gold px-3 py-1 text-[10px] font-bold text-ink">-{off}%</span>}
            <span className="text-xs font-medium uppercase tracking-[0.14em] text-ink-400">{cat.name}</span>
          </div>
          <h1 className="h-display mt-4 text-4xl sm:text-5xl lg:text-[56px]">{p.name}</h1>
          {p.reviewCount > 0
            ? <a href="#avis" className="mt-4 inline-flex items-center gap-2 text-sm"><Stars value={p.rating} size={15} /><b>{p.rating.toFixed(1).replace('.', ',')}</b><span className="text-ink-400 underline-offset-4 hover:underline">{p.reviewCount} avis</span></a>
            : <a href="#avis" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-gold-dark">✨ Soyez le premier à donner votre avis</a>}
          <div className="mt-6 flex items-baseline gap-3">
            <span className="text-3xl font-semibold" data-testid="product-price">{fcfa(price)}</span>
            {p.compareAt && <span className="text-lg text-ink-400 line-through">{fcfa(p.compareAt + (price - p.price))}</span>}
            {p.compareAt && <span className="text-sm font-semibold text-gold-dark">Économisez {fcfa(p.compareAt - p.price)}</span>}
          </div>
          {!!p.previousPrice && (
            <p className="mt-2 inline-flex flex-wrap items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-sm text-emerald-800" data-testid="new-price-note">
              <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">Nouveau prix</span>
              Avant <s>{fcfa(p.previousPrice + (price - p.price))}</s> — vous économisez {fcfa(p.previousPrice - p.price)}
            </p>
          )}
          {range.min !== range.max && <p className="mt-2 text-xs text-ink-500">Prix selon les options choisies : de {fcfa(range.min)} à {fcfa(range.max)}.</p>}
          <p className="mt-5 text-[15px] leading-relaxed text-ink-500">{p.short}</p>

          <OptionPicker p={p} pick={pick} onPick={setPick} />

          {p.colors && (
            <div className="mt-8">
              <p className="label">Couleur : <span className="normal-case tracking-normal text-ink">{color}</span></p>
              <div className="flex gap-2.5">
                {p.colors.map((c) => (
                  <button key={c.name} onClick={() => setColor(c.name)} title={c.name} className={cn('grid h-10 w-10 place-items-center rounded-full border-2 transition', color === c.name ? 'border-ink' : 'border-transparent')}>
                    <span className="h-7 w-7 rounded-full border border-ink/10" style={{ background: c.hex }} />
                  </button>
                ))}
              </div>
            </div>
          )}

          {sizes && (
            <div className="mt-7">
              <div className="flex items-center justify-between">
                <p className={cn('label', sizeErr && 'text-red-700')}>{p.sizeLabel ?? 'Taille'}{size && <span className="normal-case tracking-normal text-ink"> : {size}</span>}</p>
                {['vetements', 'chaussures', 'bijoux'].includes(p.category) && <span className="text-xs text-ink-500 underline underline-offset-4">Guide des tailles</span>}
              </div>
              <motion.div animate={sizeErr ? { x: [0, -6, 6, -4, 4, 0] } : {}} transition={{ duration: 0.4 }} className="flex flex-wrap gap-2">
                {sizes.map((s) => (
                  <button key={s} onClick={() => { setSize(s); setSizeErr(false) }} className={cn('min-w-[52px] rounded-xl border px-4 py-3 text-sm font-medium transition', size === s ? 'border-ink bg-ink text-ivory' : 'border-ink/15 bg-white hover:border-ink')}>{s}</button>
                ))}
              </motion.div>
              {sizeErr && <p className="mt-2 text-xs text-red-700">Veuillez choisir : {p.sizeLabel?.toLowerCase() ?? 'une taille'}.</p>}
            </div>
          )}

          <div className="mt-8 flex gap-3">
            <div className="flex items-center rounded-full border border-ink/15 bg-white">
              <button onClick={() => setQty(Math.max(1, qty - 1))} className="p-4 hover:text-gold" aria-label="Diminuer"><Minus size={15} /></button>
              <span className="w-6 text-center font-semibold">{qty}</span>
              <button onClick={() => setQty(Math.min(p.stock, qty + 1))} className="p-4 hover:text-gold" aria-label="Augmenter"><Plus size={15} /></button>
            </div>
            <button onClick={() => doAdd()} disabled={soldOut} className="btn-dark flex-1 disabled:cursor-not-allowed disabled:opacity-50">{soldOut ? 'Épuisé' : 'Ajouter au panier'}</button>
            <button onClick={() => toggleWish(p.id)} className={cn('grid w-14 shrink-0 place-items-center rounded-full border transition', wished ? 'border-gold bg-gold/10' : 'border-ink/15 hover:border-ink')} aria-label="Favoris">
              <Heart size={19} className={wished ? 'fill-gold text-gold' : ''} />
            </button>
          </div>
          {!soldOut && <button onClick={() => doAdd(true)} className="btn-gold mt-3 w-full">Acheter maintenant</button>}

          <div className="mt-5 flex items-center justify-between text-sm">
            <p className={cn('flex items-center gap-2', p.stock < 10 ? 'text-red-700' : 'text-emerald-700')}>
              <span className="relative flex h-2 w-2"><span className={cn('absolute inline-flex h-full w-full animate-ping rounded-full opacity-60', p.stock < 10 ? 'bg-red-600' : 'bg-emerald-600')} /><span className={cn('relative inline-flex h-2 w-2 rounded-full', p.stock < 10 ? 'bg-red-600' : 'bg-emerald-600')} /></span>
              {soldOut ? 'Épuisé — bientôt de retour' : p.stock < 10 ? `Plus que ${p.stock} en stock — commandez vite` : 'En stock, prêt à être expédié'}
            </p>
            <button onClick={share} className="flex items-center gap-1.5 text-ink-500 hover:text-ink"><Share2 size={15} /> Partager</button>
          </div>

          <div className="mt-7 grid gap-3 rounded-2xl bg-ivory-200/70 p-5 text-sm sm:grid-cols-2">
            <p className="flex gap-3"><Truck size={18} className="shrink-0 text-gold" /><span>Livré à Abidjan dès <b className="capitalize">{delivery}</b></span></p>
            <p className="flex gap-3"><Wallet size={18} className="shrink-0 text-gold" /><span>Paiement à la livraison ou Mobile Money</span></p>
            <p className="flex gap-3"><RotateCcw size={18} className="shrink-0 text-gold" /><span>Retours & échanges sous 7 jours</span></p>
            <p className="flex gap-3"><ShieldCheck size={18} className="shrink-0 text-gold" /><span>Livraison offerte dès {fcfa(FREE_SHIPPING)}</span></p>
          </div>

          <div className="mt-8 border-t border-ink/10">
            <Accordion title="Description" defaultOpen><p>{p.description}</p></Accordion>
            <Accordion title="Détails & composition"><ul className="space-y-2">{p.details.map((d) => <li key={d} className="flex gap-2"><span className="text-gold">✦</span>{d}</li>)}</ul></Accordion>
            <Accordion title="Livraison & retours">
              <p><b>Abidjan :</b> 2 000 FCFA, livraison sous 24 h (commande avant 14 h).<br /><b>Intérieur du pays :</b> 3 500 FCFA, 48 – 72 h (Agboville, Bouaké, Yamoussoukro, San-Pédro, Korhogo, Daloa…).<br /><b>Retrait gratuit</b> en boutique à Agboville ou Cocody.<br />Livraison offerte dès {fcfa(FREE_SHIPPING)}. Retours et échanges gratuits sous 7 jours.</p>
            </Accordion>
            <Accordion title="Pour qui ?"><p>{p.gender} · Idéal pour les {p.ages.map((a) => `${a} ans`).join(', ')}.</p></Accordion>
          </div>
        </div>
      </section>

      <Reviews p={p} />

      <section className="container-x">
        <Reveal className="mb-10 flex items-end justify-between">
          <div><p className="eyebrow">Vous aimerez aussi</p><h2 className="h-display mt-3 text-4xl sm:text-5xl">Complétez le look</h2></div>
          <Link to={`/boutique?cat=${cat.id}`} className="link-underline hidden text-sm font-semibold uppercase tracking-[0.14em] sm:block">Voir {cat.name.toLowerCase()}</Link>
        </Reveal>
        <div className="grid grid-cols-2 gap-x-2.5 gap-y-5 sm:grid-cols-3 sm:gap-x-3 lg:grid-cols-5">{related.map((x) => <ProductCard key={x.id} p={x} />)}</div>
      </section>

      <div className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-3 border-t border-ink/10 bg-ivory/95 p-3 backdrop-blur-xl lg:hidden">
        <Img src={p.images[0]} alt="" className="h-12 w-10 rounded-lg object-cover" />
        <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{p.name}</p><p className="text-sm font-semibold">{fcfa(price)}</p></div>
        <button onClick={() => { if (sizes && sizes.length > 1 && !size) { setSizeErr(true); window.scrollTo({ top: 300, behavior: 'smooth' }) } else doAdd() }} className="btn-dark px-5 py-3">Ajouter</button>
      </div>
    </Page>
  )
}
