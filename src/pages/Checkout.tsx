import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, Check, ChevronDown, CreditCard, Loader2, Lock, ShoppingBag, Store, Tag, Truck, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { Img, Logo, Social } from '../components/ui'
import { waLink } from '../lib/contact'
import { cn, fcfa, FREE_SHIPPING, PROMOS, SHIPPING, type ShippingId } from '../lib/format'
import { cartDetailed, cartSubtotal, useCart, useOrders, type Order } from '../store'
import { useAuth } from '../store/auth'
import { supabase } from '../lib/supabase'
import { formatPhone } from '../lib/auth-utils'

import SearchSelect from '../components/SearchSelect'
import { ABIDJAN_COMMUNES, CITIES, isExpressCity, POPULAR_CITIES } from '../data/cities'
const PAYMENTS = [
  { id: 'cod', label: 'Paiement à la livraison', sub: 'Espèces ou Mobile Money à la réception', color: '#B8893B', mm: false },
  { id: 'orange', label: 'Orange Money', sub: 'Confirmation par code USSD', color: '#FF7900', mm: true },
  { id: 'mtn', label: 'MTN Mobile Money', sub: 'Confirmation sur votre téléphone', color: '#FFCB05', mm: true },
  { id: 'wave', label: 'Wave', sub: 'Sans frais — lien de paiement par SMS', color: '#1DC3F0', mm: true },
  { id: 'moov', label: 'Moov Money', sub: 'Flooz — confirmation par code', color: '#0066B3', mm: true },
  { id: 'card', label: 'Carte bancaire', sub: 'Visa, Mastercard — 3D Secure', color: '#1A1F71', mm: false },
]
/** Messages clairs pour les refus du serveur (stock, produit retiré, session…) */
function orderErrorMessage(msg: string) {
  const [code, name, left] = msg.split('|')
  if (code.includes('OUT_OF_STOCK')) return Number(left) > 0 ? `Stock insuffisant pour « ${name} » : ${Number(left) === 1 ? 'il n’en reste qu’un seul' : `il n’en reste que ${left}`}. Modifiez la quantité dans votre panier.` : `« ${name} » vient d’être épuisé. Retirez-le de votre panier pour continuer.`
  if (code.includes('PRODUCT_UNAVAILABLE')) return `« ${name} » n’est plus disponible. Retirez-le de votre panier pour continuer.`
  if (code.includes('OPTION_REQUIRED')) return `Les options de « ${name} » ont changé (${left}). Retirez l’article du panier puis rajoutez-le en choisissant à nouveau.`
  if (code.includes('INVALID_QTY')) return 'Une quantité de votre panier est invalide (1 à 99 par article).'
  if (code.includes('INVALID_SHIPPING')) return 'Mode de livraison invalide. Choisissez-en un à nouveau.'
  if (/jwt|auth|permission|row-level|policy/i.test(msg)) return 'Votre session a expiré. Reconnectez-vous pour valider la commande.'
  return 'La commande n’a pas pu être enregistrée. Vérifiez votre connexion puis réessayez.'
}
const phoneOk = (v: string) => /^(\+?225)?\s?(01|05|07|27|25|21)\d{8}$/.test(v.replace(/[\s.-]/g, ''))

function Field({ id, label, value, error, onValue, format, ...rest }: { id: string; label: string; value: string; error?: string; onValue: (v: string) => void; format?: (v: string) => string } & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'id'>) {
  return (
    <div>
      <label className="label" htmlFor={id}>{label}</label>
      <input id={id} {...rest} className={cn('input', error && 'border-red-500 focus:border-red-500 focus:ring-red-500/15')} value={value} onChange={(e) => onValue(format ? format(e.target.value) : e.target.value)} />
      {error && <p className="mt-1 text-xs text-red-700">{error}</p>}
    </div>
  )
}

export default function Checkout() {
  const { lines, promo, setPromo, clear } = useCart()
  const addOrder = useOrders((s) => s.add)
  const nav = useNavigate()
  const items = cartDetailed(lines)
  const subtotal = cartSubtotal(lines)
  const [step, setStep] = useState(1)
  const [summaryOpen, setSummaryOpen] = useState(false)
  const [code, setCode] = useState('')
  const [codeErr, setCodeErr] = useState('')
  const [processing, setProcessing] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [f, setF] = useState({
    firstName: '', lastName: '', phone: '', email: '',
    city: 'Abidjan', commune: 'Cocody', details: '', shipping: 'abidjan' as ShippingId,
    payment: 'cod', mmPhone: '', card: '', exp: '', cvc: '', note: '',
  })
  const user = useAuth((s) => s.user)
  const profile = useAuth((s) => s.profile)
  const authReady = useAuth((s) => s.ready)
  const [placeErr, setPlaceErr] = useState('')
  const [prefilled, setPrefilled] = useState(false)
  useEffect(() => {
    if (!profile || prefilled) return
    setPrefilled(true)
    const city = profile.city || 'Abidjan'
    setF((s) => ({
      ...s,
      firstName: s.firstName || profile.first_name, lastName: s.lastName || profile.last_name,
      phone: s.phone || ((profile.contact_phone || profile.phone) ? formatPhone(profile.contact_phone || profile.phone).replace('+225 ', '') : ''),
      email: s.email || profile.email || '',
      city, commune: profile.commune || s.commune, details: s.details || profile.address || '',
      shipping: isExpressCity(city) ? 'abidjan' : 'interieur',
    }))
  }, [profile, prefilled])
  const set = (k: keyof typeof f, v: string) => { setF((s) => ({ ...s, [k]: v })); setErrors((e) => ({ ...e, [k]: '' })) }

  const discount = promo && PROMOS[promo] ? PROMOS[promo].apply(subtotal) : 0
  const shippingCost = f.shipping === 'retrait' || subtotal - discount >= FREE_SHIPPING ? 0 : SHIPPING[f.shipping].price
  const total = Math.max(0, subtotal - discount + shippingCost)
  const payment = PAYMENTS.find((p) => p.id === f.payment)!
  // Commande sur WhatsApp — réservée aux clients connectés (la page Commande exige un compte)
  const waOrderMessage = () => {
    const list = items.map((l) => `• ${l.qty} × ${l.product.name}${l.variant ? ` (${l.variant.replace(/ · /g, ', ')})` : ''} — ${fcfa(l.qty * l.unit)}`).join('\n')
    const where = f.shipping === 'retrait' ? 'Retrait en boutique' : [f.details, f.city === 'Abidjan' ? f.commune : '', f.city].filter(Boolean).join(', ')
    return [
      'Bonjour YVES STORE 👋',
      'Je souhaite finaliser ma commande sur WhatsApp :',
      list,
      `Sous-total : ${fcfa(subtotal)}${discount ? `\nRéduction${promo ? ` (${promo})` : ''} : −${fcfa(discount)}` : ''}`,
      `Livraison (${SHIPPING[f.shipping].label}) : ${shippingCost ? fcfa(shippingCost) : 'offerte'}`,
      `Total : ${fcfa(total)}`,
      `Paiement souhaité : ${payment.label}`,
      '',
      `Client : ${[f.firstName, f.lastName].filter(Boolean).join(' ')}${profile?.email && !profile.email.endsWith('@tel.yvesstore.ci') ? ` (${profile.email})` : ''}`,
      `Téléphone : ${f.phone}`,
      `Adresse : ${where}`,
    ].join('\n')
  }

  const validate = (s: number) => {
    const e: Record<string, string> = {}
    if (s === 1) {
      if (f.firstName.trim().length < 2) e.firstName = 'Prénom requis'
      if (f.lastName.trim().length < 2) e.lastName = 'Nom requis'
      if (!phoneOk(f.phone)) e.phone = 'Numéro ivoirien invalide (ex. 07 00 00 00 00)'
      if (f.email && !/\S+@\S+\.\S+/.test(f.email)) e.email = 'E-mail invalide'
    }
    if (s === 2 && f.shipping !== 'retrait') {
      if (f.details.trim().length < 5) e.details = 'Précisez votre adresse (quartier, repère…)'
    }
    if (s === 3) {
      if (payment.mm && !phoneOk(f.mmPhone || f.phone)) e.mmPhone = 'Numéro Mobile Money invalide'
      if (f.payment === 'card') {
        if (f.card.replace(/\s/g, '').length < 16) e.card = 'Numéro de carte incomplet'
        if (!/^\d{2}\/\d{2}$/.test(f.exp)) e.exp = 'MM/AA'
        if (f.cvc.length < 3) e.cvc = 'CVC'
      }
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }
  const next = () => { if (validate(step)) { setStep(step + 1); window.scrollTo({ top: 0, behavior: 'smooth' }) } }

  const applyCode = () => {
    const c = code.trim().toUpperCase()
    if (!PROMOS[c]) return setCodeErr('Code invalide')
    if (PROMOS[c].apply(subtotal) === 0) return setCodeErr('Montant minimum non atteint')
    setPromo(c); setCode(''); setCodeErr('')
  }

  const place = async () => {
    if (!validate(3)) return
    setProcessing(true)
    await new Promise((r) => setTimeout(r, 1800))
    const order: Order = {
      id: `YS-${Date.now().toString(36).slice(-4).toUpperCase()}${Math.random().toString(36).slice(2, 5).toUpperCase()}`,
      createdAt: new Date().toISOString(),
      customer: { firstName: f.firstName.trim(), lastName: f.lastName.trim(), phone: f.phone, email: f.email },
      address: { city: f.city, commune: f.city === 'Abidjan' ? f.commune : '', details: f.details },
      shipping: f.shipping, payment: payment.label,
      lines: items.map((l) => ({ id: l.product.id, name: l.product.name, qty: l.qty, price: l.unit, image: l.product.images[0], size: l.size, color: l.color, ...(l.options ? { options: l.options } : {}) })),
      subtotal, discount, shippingCost, total,
    }
    // Seuls les clients inscrits et connectés peuvent commander (vérifié aussi par le serveur)
    if (!user) { setProcessing(false); nav('/compte?redirect=/commande&raison=commande'); return }
    setPlaceErr('')
    // Le serveur recalcule prix, remise, livraison et total, et vérifie le stock
    const { data: saved, error } = await supabase.from('orders').insert({
      id: order.id, user_id: user.id, customer: order.customer, address: order.address, shipping: order.shipping, payment: order.payment,
      lines: order.lines, subtotal, discount, shipping_cost: shippingCost, total, promo_code: promo || null,
    }).select('lines, subtotal, discount, shipping_cost, total').single()
    if (error) {
      setProcessing(false)
      setPlaceErr(orderErrorMessage(error.message))
      return
    }
    if (saved) {
      const sl = (saved.lines ?? []) as { name: string; qty: number; price: number }[]
      order.lines = order.lines.map((l, i) => (sl[i] ? { ...l, name: sl[i].name, qty: sl[i].qty, price: sl[i].price } : l))
      order.subtotal = saved.subtotal; order.discount = saved.discount; order.shippingCost = saved.shipping_cost; order.total = saved.total
    }
    {
      if (profile && !profile.address && order.address.details) useAuth.getState().updateProfile({ address: order.address.details, city: f.city, commune: f.city === 'Abidjan' ? f.commune : null })
    }
    addOrder(order); clear()
    nav(`/commande/confirmation/${order.id}`, { replace: true })
  }

  const steps = ['Informations', 'Livraison', 'Paiement']
  const fp = (k: keyof typeof f) => ({ id: k, value: f[k], error: errors[k], onValue: (v: string) => set(k, v) })

  // Commande réservée aux personnes inscrites : connexion obligatoire avant de commander
  if (authReady && !user) return <Navigate to="/compte?redirect=/commande&raison=commande" replace />
  if (!authReady) return <main className="grid min-h-screen place-items-center"><Loader2 className="animate-spin text-gold" size={30} /></main>

  if (items.length === 0) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-ivory px-5 text-center">
        <Link to="/"><Logo /></Link>
        <ShoppingBag size={36} className="mt-12 text-gold" />
        <h1 className="h-display mt-4 text-4xl">Votre panier est vide</h1>
        <p className="mt-2 text-ink-500">Ajoutez quelques pièces avant de passer commande.</p>
        <Link to="/boutique" className="btn-dark mt-8">Découvrir la boutique</Link>
      </main>
    )
  }

  const summary = (
    <div>
      <ul className="space-y-4">
        {items.map((l) => (
          <li key={l.key} className="flex items-center gap-4">
            <div className="relative shrink-0">
              <Img src={l.product.images[0]} alt={l.product.name} className="h-20 w-16 rounded-xl object-cover" />
              <span className="absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full bg-ink text-[11px] font-bold text-ivory">{l.qty}</span>
            </div>
            <div className="min-w-0 flex-1"><p className="truncate font-medium">{l.product.name}</p><p className="text-xs text-ink-400">{l.variant}</p></div>
            <p className="text-sm font-semibold">{fcfa(l.qty * l.unit)}</p>
          </li>
        ))}
      </ul>
      <div className="mt-6 border-t border-ink/10 pt-5">
        {promo ? (
          <div className="flex items-center justify-between rounded-xl bg-gold/10 px-4 py-3 text-sm">
            <span className="flex items-center gap-2"><Tag size={15} className="text-gold-dark" /><b>{promo}</b> — {PROMOS[promo]?.label}</span>
            <button onClick={() => setPromo(null)} aria-label="Retirer le code"><X size={15} /></button>
          </div>
        ) : (
          <div>
            <div className="flex gap-2">
              <input value={code} onChange={(e) => { setCode(e.target.value); setCodeErr('') }} onKeyDown={(e) => e.key === 'Enter' && applyCode()} placeholder="Code promo" className="input uppercase" />
              <button onClick={applyCode} className="rounded-xl bg-ink px-5 text-xs font-semibold uppercase tracking-[0.12em] text-ivory hover:bg-gold hover:text-ink">Appliquer</button>
            </div>
            {codeErr ? <p className="mt-1.5 text-xs text-red-700">{codeErr}</p> : <p className="mt-1.5 text-xs text-ink-400">Essayez <b>YVES10</b> ou <b>BIENVENUE</b></p>}
          </div>
        )}
      </div>
      <dl className="mt-5 space-y-2.5 border-t border-ink/10 pt-5 text-sm">
        <div className="flex justify-between"><dt className="text-ink-500">Sous-total</dt><dd>{fcfa(subtotal)}</dd></div>
        {discount > 0 && <div className="flex justify-between text-gold-dark"><dt>Réduction</dt><dd>-{fcfa(discount)}</dd></div>}
        <div className="flex justify-between"><dt className="text-ink-500">Livraison</dt><dd>{shippingCost === 0 ? <span className="font-semibold text-emerald-700">Offerte</span> : fcfa(shippingCost)}</dd></div>
        <div className="flex items-baseline justify-between border-t border-ink/10 pt-4"><dt className="font-semibold">Total</dt><dd className="font-display text-3xl font-semibold">{fcfa(total)}</dd></div>
      </dl>
    </div>
  )

  return (
    <main className="min-h-screen bg-ivory">
      <header className="border-b border-ink/10 bg-ivory">
        <div className="container-x flex h-[72px] items-center justify-between">
          <Link to="/boutique" className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-ink-500 hover:text-ink"><ArrowLeft size={16} /><span className="hidden sm:inline">Continuer mes achats</span></Link>
          <Link to="/"><Logo /></Link>
          <span className="flex items-center gap-1.5 text-xs font-medium text-ink-500"><Lock size={14} className="text-gold" /><span className="hidden sm:inline">Paiement sécurisé</span></span>
        </div>
      </header>

      <div className="border-b border-ink/10 bg-ivory-100 lg:hidden">
        <button onClick={() => setSummaryOpen(!summaryOpen)} className="container-x flex w-full items-center justify-between py-4 text-sm">
          <span className="flex items-center gap-2 font-medium"><ShoppingBag size={16} className="text-gold" />{summaryOpen ? 'Masquer' : 'Afficher'} le récapitulatif <ChevronDown size={15} className={cn('transition', summaryOpen && 'rotate-180')} /></span>
          <span className="font-semibold">{fcfa(total)}</span>
        </button>
        <AnimatePresence>{summaryOpen && <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden"><div className="container-x pb-6">{summary}</div></motion.div>}</AnimatePresence>
      </div>

      <div className="container-x grid gap-12 py-10 lg:grid-cols-[1fr_440px] lg:gap-16">
        <div>
          <ol className="mb-10 flex items-center gap-2">
            {steps.map((s, i) => (
              <li key={s} className="flex flex-1 items-center gap-2">
                <button onClick={() => i + 1 < step && setStep(i + 1)} disabled={i + 1 > step} className="flex items-center gap-2.5">
                  <span className={cn('grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold transition', step > i + 1 ? 'bg-gold text-ink' : step === i + 1 ? 'bg-ink text-ivory' : 'bg-ink/10 text-ink-400')}>{step > i + 1 ? <Check size={14} /> : i + 1}</span>
                  <span className={cn('hidden text-xs font-semibold uppercase tracking-[0.12em] sm:block', step >= i + 1 ? 'text-ink' : 'text-ink-400')}>{s}</span>
                </button>
                {i < 2 && <span className="h-px flex-1 bg-ink/10"><motion.span className="block h-px bg-gold" animate={{ width: step > i + 1 ? '100%' : '0%' }} /></span>}
              </li>
            ))}
          </ol>

          <AnimatePresence mode="wait">
            <motion.div key={step} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.35 }}>
              {step === 1 && (
                <section>
                  <h1 className="h-display text-4xl">Vos informations</h1>
                  <p className="mt-2 text-sm text-ink-500">Nous vous appellerons pour confirmer la livraison.</p>
                  <p className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">Connecté{profile ? ` en tant que ${profile.first_name}` : ''} — vos informations ont été pré-remplies et la commande sera ajoutée à votre historique.</p>
                  <div className="mt-8 grid gap-5 sm:grid-cols-2">
                    <Field {...fp('firstName')} label="Prénom *" autoComplete="given-name" placeholder="Yves" />
                    <Field {...fp('lastName')} label="Nom *" autoComplete="family-name" placeholder="Kouamé" />
                    <Field {...fp('phone')} label="Téléphone *" type="tel" autoComplete="tel" placeholder="07 00 00 00 00" />
                    <Field {...fp('email')} label="E-mail (facultatif)" type="email" autoComplete="email" placeholder="vous@exemple.ci" />
                  </div>
                  <button onClick={next} className="btn-dark mt-10 w-full sm:w-auto">Continuer vers la livraison</button>
                </section>
              )}

              {step === 2 && (
                <section>
                  <h1 className="h-display text-4xl">Livraison</h1>
                  <div className="mt-8 space-y-3">
                    {(Object.keys(SHIPPING) as ShippingId[]).map((id) => {
                      const s = SHIPPING[id]; const free = id !== 'retrait' && subtotal - discount >= FREE_SHIPPING
                      const disabled = (id === 'abidjan' && !isExpressCity(f.city)) || (id === 'interieur' && isExpressCity(f.city))
                      return (
                        <label key={id} className={cn('flex cursor-pointer items-center gap-4 rounded-2xl border p-5 transition', f.shipping === id ? 'border-ink bg-white shadow-sm' : 'border-ink/10 hover:border-ink/30', disabled && 'pointer-events-none opacity-40')}>
                          <input type="radio" name="ship" className="sr-only" checked={f.shipping === id} onChange={() => set('shipping', id)} />
                          <span className={cn('grid h-5 w-5 place-items-center rounded-full border-2', f.shipping === id ? 'border-ink' : 'border-ink/25')}>{f.shipping === id && <span className="h-2.5 w-2.5 rounded-full bg-ink" />}</span>
                          {id === 'retrait' ? <Store size={20} className="text-gold" /> : <Truck size={20} className="text-gold" />}
                          <span className="flex-1"><span className="block font-medium">{s.label}</span><span className="text-xs text-ink-500">{s.eta}</span></span>
                          <span className="text-sm font-semibold">{s.price === 0 || free ? <span className="text-emerald-700">Gratuit</span> : fcfa(s.price)}</span>
                        </label>
                      )
                    })}
                  </div>
                  <div className="mt-8 grid gap-5 sm:grid-cols-2">
                    <div>
                      <label className="label" htmlFor="city">Ville *</label>
                      <SearchSelect id="city" value={f.city} options={CITIES} popular={POPULAR_CITIES} allowCustom searchPlaceholder="Rechercher une ville (ex. Bouaké)"
                        onChange={(c) => setF((s) => ({ ...s, city: c, shipping: s.shipping === 'retrait' ? 'retrait' : isExpressCity(c) ? 'abidjan' : 'interieur' }))} />
                    </div>
                    {f.city === 'Abidjan' && (
                      <div>
                        <label className="label" htmlFor="commune">Commune *</label>
                        <SearchSelect id="commune" value={f.commune} options={ABIDJAN_COMMUNES} onChange={(c) => set('commune', c)} searchPlaceholder="Rechercher une commune" noun={{ one: 'commune', many: 'communes' }} />
                      </div>
                    )}
                    {f.shipping !== 'retrait' && <div className="sm:col-span-2"><Field {...fp('details')} label="Adresse précise *" placeholder="Quartier, rue, repère (ex. près de la pharmacie…)" /></div>}
                    <div className="sm:col-span-2"><Field {...fp('note')} label="Instructions pour le livreur (facultatif)" placeholder="Appeler avant d’arriver, portail bleu…" /></div>
                  </div>
                  <div className="mt-10 flex flex-col-reverse gap-3 sm:flex-row">
                    <button onClick={() => setStep(1)} className="btn-outline">Retour</button>
                    <button onClick={next} className="btn-dark">Continuer vers le paiement</button>
                  </div>
                </section>
              )}

              {step === 3 && (
                <section>
                  <h1 className="h-display text-4xl">Paiement</h1>
                  <p className="mt-2 text-sm text-ink-500">Toutes les transactions sont chiffrées et sécurisées.</p>
                  <div className="mt-8 grid gap-3 sm:grid-cols-2">
                    {PAYMENTS.map((p) => (
                      <label key={p.id} className={cn('flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition', f.payment === p.id ? 'border-ink bg-white shadow-sm' : 'border-ink/10 hover:border-ink/30')}>
                        <input type="radio" name="pay" className="sr-only" checked={f.payment === p.id} onChange={() => set('payment', p.id)} />
                        <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl text-[11px] font-bold text-white" style={{ background: p.color }}>{p.id === 'card' ? <CreditCard size={16} /> : p.label[0]}</span>
                        <span className="flex-1"><span className="block text-sm font-semibold">{p.label}</span><span className="text-xs text-ink-500">{p.sub}</span></span>
                        <span className={cn('mt-1 grid h-5 w-5 shrink-0 place-items-center rounded-full border-2', f.payment === p.id ? 'border-ink bg-ink' : 'border-ink/25')}>{f.payment === p.id && <Check size={11} className="text-ivory" />}</span>
                      </label>
                    ))}
                  </div>
                  <AnimatePresence mode="wait">
                    <motion.div key={f.payment} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                      <div className="mt-6 rounded-2xl bg-ivory-200/70 p-5">
                        {payment.mm && (
                          <>
                            <Field {...fp('mmPhone')} label={`Numéro ${payment.label}`} type="tel" placeholder={f.phone || '07 00 00 00 00'} />
                            <p className="mt-3 text-xs text-ink-500">Après validation, vous recevrez une demande de paiement de <b>{fcfa(total)}</b> à confirmer sur votre téléphone.</p>
                          </>
                        )}
                        {f.payment === 'cod' && <p className="text-sm text-ink-600">Vous réglerez <b>{fcfa(total)}</b> au livreur, en espèces ou par Mobile Money. Préparez l’appoint si possible 🙏</p>}
                        {f.payment === 'card' && (
                          <div className="grid gap-4 sm:grid-cols-[1fr_110px_90px]">
                            <Field {...fp('card')} label="Numéro de carte" inputMode="numeric" placeholder="4242 4242 4242 4242" maxLength={19} format={(v) => v.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim()} />
                            <Field {...fp('exp')} label="Expiration" placeholder="MM/AA" maxLength={5} format={(v) => v.replace(/\D/g, '').slice(0, 4).replace(/^(\d{2})(\d)/, '$1/$2')} />
                            <Field {...fp('cvc')} label="CVC" inputMode="numeric" placeholder="123" maxLength={4} format={(v) => v.replace(/\D/g, '')} />
                          </div>
                        )}
                      </div>
                    </motion.div>
                  </AnimatePresence>

                  <div className="mt-8 rounded-2xl border border-ink/10 p-5 text-sm">
                    <div className="flex justify-between gap-4"><span className="text-ink-500">Contact</span><span className="text-right">{f.firstName} {f.lastName} · {f.phone}</span><button onClick={() => setStep(1)} className="text-xs font-semibold text-gold-dark">Modifier</button></div>
                    <div className="mt-3 flex justify-between gap-4 border-t border-ink/10 pt-3"><span className="text-ink-500">Livraison</span><span className="text-right">{f.shipping === 'retrait' ? 'Retrait en boutique' : `${f.details}, ${f.city === 'Abidjan' ? f.commune + ', ' : ''}${f.city}`}</span><button onClick={() => setStep(2)} className="text-xs font-semibold text-gold-dark">Modifier</button></div>
                  </div>

                  <div className="mt-10 flex flex-col-reverse gap-3 sm:flex-row">
                    <button onClick={() => setStep(2)} className="btn-outline" disabled={processing}>Retour</button>
                    <button onClick={place} disabled={processing} className="btn-gold flex-1">
                      {processing ? <><Loader2 size={17} className="animate-spin" /> Traitement en cours…</> : <><Lock size={15} /> Confirmer la commande • {fcfa(total)}</>}
                    </button>
                  </div>
                  {placeErr && <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{placeErr}</p>}
                  <div className="mt-6 flex flex-col items-center gap-3 rounded-2xl border border-[#25D366]/30 bg-[#25D366]/5 p-4 text-center sm:flex-row sm:text-left">
                    <span className="shrink-0 text-[#25D366]"><Social.WhatsApp size={26} /></span>
                    <p className="flex-1 text-sm text-ink-500"><b className="text-ink">Vous préférez commander avec un conseiller ?</b> Envoyez votre panier, votre adresse et le total sur notre WhatsApp : nous confirmons la commande avec vous.</p>
                    <a href={waLink(waOrderMessage())} target="_blank" rel="noopener noreferrer" className="inline-flex shrink-0 items-center gap-2 rounded-full bg-[#25D366] px-4 py-2.5 text-xs font-bold uppercase tracking-[0.1em] text-white hover:brightness-95">
                      <Social.WhatsApp size={16} /> Commander sur WhatsApp
                    </a>
                  </div>
                  <p className="mt-4 text-center text-xs text-ink-400">En confirmant, vous acceptez nos conditions générales de vente.</p>
                </section>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <aside className="hidden lg:block">
          <div className="sticky top-8 rounded-3xl border border-ink/10 bg-white p-7">
            <h2 className="mb-6 font-display text-2xl">Récapitulatif</h2>
            {summary}
          </div>
        </aside>
      </div>
    </main>
  )
}
