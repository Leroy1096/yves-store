import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown, Crown, Heart, LayoutGrid, Loader2, LogOut, Mail, Package, Phone, ShieldCheck, ShoppingBag, User as UserIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { FormAlert, MatchHint, PasswordField, PasswordMeter, TextField } from '../components/AuthFields'
import ProductCard from '../components/ProductCard'
import { Img, Page } from '../components/ui'
import { products } from '../data/products'
import { formatPhone, initials, normalizePhone, passwordRules } from '../lib/auth-utils'
import { BirthDateField, joinDate, PhoneInput, splitDate } from '../components/ProfileFields'
import { cn, fcfa, SHIPPING, type ShippingId } from '../lib/format'
import { supabase } from '../lib/supabase'
import { useOrders, useWishlist } from '../store'
import SearchSelect from '../components/SearchSelect'
import { ABIDJAN_COMMUNES, CITIES, POPULAR_CITIES } from '../data/cities'
import CancelOrder, { CancelBadge } from '../components/CancelOrder'
import WaRequestButton from '../components/WaRequest'
import { cancelOrderRemote } from '../lib/orders'
import { useAuth, type Profile } from '../store/auth'

interface DbOrder {
  id: string; status: string; created_at: string; shipping: ShippingId; payment: string
  lines: { name: string; qty: number; price: number; image: string; size?: string; color?: string }[]
  address: { city: string; commune: string; details: string }
  subtotal: number; discount: number; shipping_cost: number; total: number
  cancelled_at?: string | null; cancel_reason?: string | null
  customer?: { firstName?: string; lastName?: string; phone?: string; email?: string }
}

const TABS = [
  { id: 'apercu', label: 'Aperçu', icon: LayoutGrid },
  { id: 'commandes', label: 'Mes commandes', icon: Package },
  { id: 'favoris', label: 'Mes favoris', icon: Heart },
  { id: 'profil', label: 'Mon profil', icon: UserIcon },
  { id: 'securite', label: 'Sécurité', icon: ShieldCheck },
] as const
type TabId = (typeof TABS)[number]['id']

const STATUS: Record<string, { label: string; cls: string; step: number }> = {
  confirmee: { label: 'Confirmée', cls: 'bg-gold/15 text-gold-dark', step: 1 },
  preparation: { label: 'En préparation', cls: 'bg-blue-50 text-blue-700', step: 2 },
  expediee: { label: 'Expédiée', cls: 'bg-violet-50 text-violet-700', step: 3 },
  livree: { label: 'Livrée', cls: 'bg-emerald-50 text-emerald-700', step: 4 },
  annulee: { label: 'Annulée', cls: 'bg-red-50 text-red-700', step: 0 },
}
const dateFr = (d: string, long = false) => new Date(d).toLocaleDateString('fr-FR', long ? { day: 'numeric', month: 'long', year: 'numeric' } : { day: 'numeric', month: 'short', year: 'numeric' })

function useOrdersFromDb(uid?: string) {
  const [orders, setOrders] = useState<DbOrder[] | null>(null)
  useEffect(() => {
    if (!uid) return
    supabase.from('orders').select('*').order('created_at', { ascending: false }).then(({ data }) => setOrders((data as DbOrder[]) ?? []))
  }, [uid])
  return [orders, setOrders] as const
}

function OrderCard({ o, defaultOpen = false, onChange }: { o: DbOrder; defaultOpen?: boolean; onChange: (o: DbOrder) => void }) {
  const [open, setOpen] = useState(defaultOpen)
  const cancelLocal = useOrders((s) => s.cancel)
  const doCancel = async (reason: string) => {
    const r = await cancelOrderRemote(o.id, reason)
    cancelLocal(o.id, reason, r.cancelled_at)
    onChange({ ...o, status: r.status, cancelled_at: r.cancelled_at, cancel_reason: r.cancel_reason })
  }
  const st = STATUS[o.status] ?? STATUS.confirmee
  const count = o.lines.reduce((a, l) => a + l.qty, 0)
  return (
    <div className="overflow-hidden rounded-2xl border border-ink/10 bg-white">
      <button onClick={() => setOpen(!open)} className="flex w-full items-start gap-3 p-4 text-left sm:items-center sm:gap-4 sm:p-5">
        <div className="flex shrink-0 -space-x-3">
          {o.lines.slice(0, 3).map((l, i) => <Img key={i} src={l.image} alt="" className="h-14 w-11 rounded-lg border-2 border-white object-cover" />)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="whitespace-nowrap text-[15px] font-semibold sm:text-base">Commande {o.id}</p>
          <p className="text-xs text-ink-400">{dateFr(o.created_at)} · {new Date(o.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} · {count} article{count > 1 ? 's' : ''}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <span className={cn('rounded-full px-3 py-1 text-xs font-semibold sm:hidden', st.cls)}>{st.label}</span>
            <CancelBadge status={o.status} createdAt={o.created_at} />
          </div>
        </div>
        <span className={cn('hidden shrink-0 rounded-full px-3 py-1 text-xs font-semibold sm:inline', st.cls)}>{st.label}</span>
        <span className="shrink-0 whitespace-nowrap font-display text-lg font-semibold sm:text-xl">{fcfa(o.total)}</span>
        <ChevronDown size={18} className={cn('mt-1 shrink-0 text-ink-400 transition sm:mt-0', open && 'rotate-180')} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
            <div className="border-t border-ink/10 p-5">
              <div className="mb-5"><CancelOrder orderId={o.id} status={o.status} createdAt={o.created_at} cancelledAt={o.cancelled_at} cancelReason={o.cancel_reason} onCancel={doCancel} waPhone={o.customer?.phone} compact /></div>
              {st.step > 0 && (
                <div className="mb-6 grid grid-cols-4 gap-2">
                  {['Confirmée', 'Préparation', 'Expédiée', 'Livrée'].map((s, i) => (
                    <div key={s}>
                      <div className={cn('h-1.5 rounded-full', i < st.step ? 'bg-gold' : 'bg-ink/10')} />
                      <p className={cn('mt-1.5 text-[11px]', i < st.step ? 'font-semibold text-ink' : 'text-ink-400')}>{s}</p>
                    </div>
                  ))}
                </div>
              )}
              <ul className="divide-y divide-ink/5">
                {o.lines.map((l, i) => (
                  <li key={i} className="flex items-center gap-3 py-2.5 text-sm">
                    <Img src={l.image} alt={l.name} className="h-12 w-10 rounded-md object-cover" />
                    <span className="flex-1">{l.name} <span className="text-ink-400">{[l.color, l.size].filter(Boolean).join(' · ')} × {l.qty}</span></span>
                    <span className="font-medium">{fcfa(l.price * l.qty)}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-4 grid gap-4 rounded-xl bg-ivory-200/60 p-4 text-sm sm:grid-cols-3">
                <div><p className="label">Livraison</p><p>{o.shipping === 'retrait' ? 'Retrait en boutique' : `${o.address.details}, ${o.address.commune ? o.address.commune + ', ' : ''}${o.address.city}`}</p><p className="text-xs text-ink-400">{SHIPPING[o.shipping]?.label}</p></div>
                <div><p className="label">Paiement</p><p>{o.payment}</p></div>
                <div className="space-y-1">
                  <p className="flex justify-between"><span className="text-ink-500">Sous-total</span>{fcfa(o.subtotal)}</p>
                  {o.discount > 0 && <p className="flex justify-between text-gold-dark"><span>Réduction</span>-{fcfa(o.discount)}</p>}
                  <p className="flex justify-between"><span className="text-ink-500">Livraison</span>{o.shipping_cost ? fcfa(o.shipping_cost) : 'Offerte'}</p>
                  <p className="flex justify-between font-semibold"><span>Total</span>{fcfa(o.total)}</p>
                </div>
              </div>
              {o.status !== 'annulee' && (
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <WaRequestButton kind="order_tracking" motif="suivi" orderId={o.id} phone={o.customer?.phone} label="Suivre ma commande sur WhatsApp" />
                  <p className="text-xs text-ink-400">Le statut détaillé vous est envoyé sur votre propre WhatsApp.</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function Empty({ icon: I, title, text, cta }: { icon: typeof Package; title: string; text: string; cta: { to: string; label: string } }) {
  return (
    <div className="rounded-3xl border border-dashed border-ink/20 px-6 py-16 text-center">
      <I size={30} className="mx-auto text-gold" />
      <p className="mt-4 font-display text-2xl">{title}</p>
      <p className="mt-1 text-sm text-ink-500">{text}</p>
      <Link to={cta.to} className="btn-dark mt-6">{cta.label}</Link>
    </div>
  )
}

function ProfileForm({ profile, authEmail }: { profile: Profile; authEmail?: string }) {
  const updateProfile = useAuth((s) => s.updateProfile)
  const [f, setF] = useState({
    first_name: profile.first_name, last_name: profile.last_name, email: profile.email ?? '',
    city: profile.city ?? 'Abidjan', commune: profile.commune ?? '', address: profile.address ?? '',
    newsletter: profile.newsletter,
    phone: profile.contact_phone ? profile.contact_phone.replace('+225', '') : '',
  })
  const [bd, setBd] = useState(() => splitDate(profile.birth_date))
  const [errs, setErrs] = useState<{ phone?: string; bd?: string }>({})
  const [msg, setMsg] = useState<{ t: 'success' | 'error'; m: string } | null>(null)
  const [saving, setSaving] = useState(false)
  const isPhone = profile.signup_method === 'phone'

  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setMsg(null)
    if (f.first_name.trim().length < 2 || f.last_name.trim().length < 2) return setMsg({ t: 'error', m: 'Prénom et nom sont requis.' })
    if (isPhone && f.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f.email)) return setMsg({ t: 'error', m: 'E-mail de contact invalide.' })
    const birth = joinDate(bd)
    const phone = f.phone ? normalizePhone(f.phone) : null
    const e2 = { bd: birth === 'invalid' ? 'Choisissez le jour, le mois et l’année.' : undefined, phone: f.phone && !phone ? 'Numéro invalide : 10 chiffres commençant par 01, 05, 07, 21, 25 ou 27.' : undefined }
    setErrs(e2)
    if (e2.bd || e2.phone) return setMsg({ t: 'error', m: 'Veuillez corriger les champs en rouge.' })
    setSaving(true)
    const r = await updateProfile({
      first_name: f.first_name.trim(), last_name: f.last_name.trim(), city: f.city, commune: f.city === 'Abidjan' ? f.commune || null : null,
      address: f.address.trim() || null, birth_date: birth as string | null, contact_phone: phone, newsletter: f.newsletter,
      ...(isPhone ? { email: f.email.trim() || null } : {}),
    })
    setSaving(false)
    setMsg(r.ok ? { t: 'success', m: 'Profil enregistré ✓' } : { t: 'error', m: r.error })
  }

  return (
    <form onSubmit={save} className="space-y-8">
      {msg && <FormAlert tone={msg.t}>{msg.m}</FormAlert>}
      <fieldset className="rounded-3xl border border-ink/10 bg-white p-6 sm:p-8">
        <legend className="px-2 font-display text-2xl">Informations personnelles</legend>
        <div className="mt-2 grid gap-5 sm:grid-cols-2">
          <TextField id="pf-first" label="Prénom" value={f.first_name} onChange={(e) => setF({ ...f, first_name: e.target.value })} autoComplete="given-name" />
          <TextField id="pf-last" label="Nom" value={f.last_name} onChange={(e) => setF({ ...f, last_name: e.target.value })} autoComplete="family-name" />
          {isPhone ? (
            <>
              <TextField id="pf-phone" label="Téléphone (identifiant)" value={formatPhone(profile.phone)} disabled icon={<Phone size={16} />} hint="Votre numéro de connexion ne peut pas être modifié ici." />
              <TextField id="pf-email" label="E-mail de contact (facultatif)" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} icon={<Mail size={16} />} placeholder="vous@exemple.ci" />
            </>
          ) : (
            <TextField id="pf-email" label="E-mail (identifiant)" value={authEmail ?? ''} disabled icon={<Mail size={16} />} hint="Votre e-mail de connexion." />
          )}
          <PhoneInput id="pf-contact-phone" label={isPhone ? 'Autre numéro / WhatsApp (facultatif)' : 'Numéro de téléphone'} value={f.phone} onChange={(v) => { setF({ ...f, phone: v }); setErrs({ ...errs, phone: undefined }) }} error={errs.phone}
            hint={isPhone ? 'Un second numéro pour vous joindre en cas d’absence.' : 'Utilisé par le livreur pour vous contacter. Pré-rempli à la commande.'} />
          <BirthDateField value={bd} onChange={(v) => { setBd(v); setErrs({ ...errs, bd: undefined }) }} error={errs.bd} />
        </div>
      </fieldset>
      <fieldset className="rounded-3xl border border-ink/10 bg-white p-6 sm:p-8">
        <legend className="px-2 font-display text-2xl">Adresse de livraison</legend>
        <div className="mt-2 grid gap-5 sm:grid-cols-2">
          <div><label className="label" htmlFor="pf-city">Ville</label><SearchSelect id="pf-city" value={f.city} options={CITIES} popular={POPULAR_CITIES} allowCustom searchPlaceholder="Rechercher une ville (ex. Bouaké)" onChange={(c) => setF({ ...f, city: c, commune: c === 'Abidjan' ? f.commune : '' })} /></div>
          {f.city === 'Abidjan' && <div><label className="label" htmlFor="pf-commune">Commune</label><SearchSelect id="pf-commune" value={f.commune} options={ABIDJAN_COMMUNES} placeholder="Choisir une commune…" onChange={(c) => setF({ ...f, commune: c })} searchPlaceholder="Rechercher une commune" noun={{ one: 'commune', many: 'communes' }} /></div>}
          <div className="sm:col-span-2"><TextField id="pf-address" label="Adresse précise" value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} placeholder="Quartier, rue, repère…" /></div>
        </div>
        <p className="mt-4 text-xs text-ink-400">Elle sera pré-remplie automatiquement lors de vos prochaines commandes.</p>
      </fieldset>
      <label className="flex cursor-pointer items-center justify-between gap-4 rounded-3xl border border-ink/10 bg-white p-6">
        <span><span className="block font-semibold">Recevoir les nouveautés</span><span className="text-sm text-ink-500">Nouveaux articles et résumé de la semaine, par e-mail et/ou WhatsApp (selon vos coordonnées).</span></span>
        <span className={cn('relative h-7 w-12 shrink-0 rounded-full transition', f.newsletter ? 'bg-gold' : 'bg-ink/15')}>
          <input type="checkbox" className="sr-only" checked={f.newsletter} onChange={(e) => setF({ ...f, newsletter: e.target.checked })} />
          <motion.span layout className={cn('absolute top-1 h-5 w-5 rounded-full bg-white shadow', f.newsletter ? 'right-1' : 'left-1')} />
        </span>
      </label>
      <button disabled={saving} className="btn-dark">{saving ? <><Loader2 size={16} className="animate-spin" /> Enregistrement…</> : 'Enregistrer les modifications'}</button>
    </form>
  )
}

function SecurityForm() {
  const changePassword = useAuth((s) => s.changePassword)
  const signOut = useAuth((s) => s.signOut)
  const nav = useNavigate()
  const [f, setF] = useState({ cur: '', pw: '', pw2: '' })
  const [msg, setMsg] = useState<{ t: 'success' | 'error'; m: string } | null>(null)
  const [saving, setSaving] = useState(false)
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setMsg(null)
    if (!f.cur) return setMsg({ t: 'error', m: 'Saisissez votre mot de passe actuel.' })
    if (!passwordRules.every((r) => r.test(f.pw))) return setMsg({ t: 'error', m: 'Le nouveau mot de passe doit contenir 8 caractères, une lettre et un chiffre.' })
    if (f.pw !== f.pw2) return setMsg({ t: 'error', m: 'Les deux nouveaux mots de passe ne correspondent pas.' })
    setSaving(true); const r = await changePassword(f.cur, f.pw); setSaving(false)
    if (r.ok) { setF({ cur: '', pw: '', pw2: '' }); setMsg({ t: 'success', m: 'Mot de passe modifié avec succès ✓' }) } else setMsg({ t: 'error', m: r.error })
  }
  return (
    <div className="space-y-8">
      <form onSubmit={submit} className="space-y-5 rounded-3xl border border-ink/10 bg-white p-6 sm:p-8">
        <h3 className="font-display text-2xl">Changer de mot de passe</h3>
        {msg && <FormAlert tone={msg.t}>{msg.m}</FormAlert>}
        <PasswordField id="sec-cur" label="Mot de passe actuel" value={f.cur} onChange={(v) => setF({ ...f, cur: v })} autoComplete="current-password" />
        <div><PasswordField id="sec-new" label="Nouveau mot de passe" value={f.pw} onChange={(v) => setF({ ...f, pw: v })} autoComplete="new-password" /><PasswordMeter password={f.pw} /></div>
        <div><PasswordField id="sec-new2" label="Répéter le nouveau mot de passe" value={f.pw2} onChange={(v) => setF({ ...f, pw2: v })} autoComplete="new-password" /><MatchHint a={f.pw} b={f.pw2} /></div>
        <button disabled={saving} className="btn-dark">{saving ? <><Loader2 size={16} className="animate-spin" /> Modification…</> : 'Mettre à jour'}</button>
      </form>
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-ink/10 bg-white p-6 sm:p-8">
        <div><h3 className="font-display text-2xl">Déconnexion</h3><p className="text-sm text-ink-500">Fermez votre session sur cet appareil.</p></div>
        <button onClick={async () => { await signOut(); nav('/') }} className="btn-outline"><LogOut size={16} /> Se déconnecter</button>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { user, profile, ready, signOut } = useAuth()
  const isAdminUser = useAuth((s) => s.isAdmin)
  const [sp, setSp] = useSearchParams()
  const nav = useNavigate()
  const loc = useLocation()
  const tab = (TABS.some((t) => t.id === sp.get('onglet')) ? sp.get('onglet') : 'apercu') as TabId
  const setTab = (t: TabId) => { setSp(t === 'apercu' ? {} : { onglet: t }); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  const [orders, setOrders] = useOrdersFromDb(user?.id)
  const updateOrder = (n: DbOrder) => setOrders((list) => (list ?? []).map((x) => (x.id === n.id ? n : x)))
  const wishIds = useWishlist((s) => s.ids)
  const wish = products.filter((p) => wishIds.includes(p.id))

  useEffect(() => { document.title = 'Mon compte — YVES STORE' }, [])

  if (!ready) return <div className="grid min-h-[70vh] place-items-center"><Loader2 className="animate-spin text-gold" size={32} /></div>
  if (!user) return <Navigate to={`/compte?redirect=${encodeURIComponent(loc.pathname + loc.search)}`} replace />
  // Le gérant a son propre espace (back-office), distinct de l’espace client
  if (isAdminUser === null) return <div className="grid min-h-[70vh] place-items-center"><Loader2 className="animate-spin text-gold" size={32} /></div>
  if (isAdminUser) return <Navigate to="/gerant" replace />

  const first = profile?.first_name || 'cher client'
  const spent = (orders ?? []).filter((o) => o.status !== 'annulee').reduce((a, o) => a + o.total, 0)
  const points = Math.floor(spent / 1000)
  const tier = spent >= 250000 ? 'Or' : spent >= 100000 ? 'Argent' : 'Bronze'
  const nextTier = spent >= 250000 ? null : spent >= 100000 ? 250000 : 100000
  const age = profile?.birth_year ? new Date().getFullYear() - profile.birth_year : null
  const group = age === null ? null : age < 25 ? '15-25' : age < 50 ? '25-50' : '50-80'
  const recos = products.filter((p) => !wishIds.includes(p.id) && (!group || p.ages.includes(group as never))).sort((a, b) => b.reviewCount - a.reviewCount).slice(0, 4)

  return (
    <Page>
      {/* En-tête */}
      <section className="relative overflow-hidden bg-ink text-ivory grain">
        <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-gold/20 blur-3xl" />
        <div className="container-x relative flex flex-wrap items-end justify-between gap-6 py-12 sm:py-16">
          <div className="flex min-w-0 items-center gap-4 sm:gap-5">
            <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-gradient-to-br from-gold-light to-gold-dark font-display text-3xl font-semibold text-ink shadow-xl sm:h-24 sm:w-24 sm:text-4xl max-sm:text-2xl">
              {initials(profile?.first_name, profile?.last_name)}
            </motion.div>
            <div>
              <p className="eyebrow text-gold-light">Mon espace</p>
              <h1 className="h-display mt-2 text-4xl sm:text-6xl">Bonjour, {first} !</h1>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-4 py-2 text-sm font-semibold text-gold-light"><Crown size={16} /> Membre {tier}</span>
            <button onClick={async () => { await signOut(); nav('/') }} className="btn-ghost-light px-5 py-2.5"><LogOut size={15} /> <span className="hidden sm:inline">Déconnexion</span></button>
          </div>
        </div>
      </section>

      <div className="container-x grid gap-8 py-10 lg:grid-cols-[250px_1fr] lg:gap-12">
        {/* Navigation */}
        <nav className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 lg:sticky lg:top-[136px] lg:mx-0 lg:flex-col lg:self-start lg:overflow-visible lg:px-0">
          {TABS.map(({ id, label, icon: I }) => (
            <button key={id} onClick={() => setTab(id)} className={cn('relative flex shrink-0 items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition', tab === id ? 'text-ivory' : 'text-ink-500 hover:bg-ink/5 hover:text-ink')}>
              {tab === id && <motion.span layoutId="dash-tab" className="absolute inset-0 rounded-xl bg-ink" transition={{ type: 'spring', damping: 30, stiffness: 350 }} />}
              <I size={17} className="relative" /><span className="relative">{label}</span>
              {id === 'commandes' && orders && orders.length > 0 && <span className="relative ml-auto rounded-full bg-gold px-2 text-[10px] font-bold text-ink">{orders.length}</span>}
              {id === 'favoris' && wish.length > 0 && <span className="relative ml-auto rounded-full bg-gold px-2 text-[10px] font-bold text-ink">{wish.length}</span>}
            </button>
          ))}
        </nav>

        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3 }} className="min-w-0">
            {tab === 'apercu' && (
              <div className="space-y-10">
                <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
                  {[
                    { l: 'Commandes', v: orders === null ? '…' : String(orders.length), i: Package, t: 'commandes' as TabId },
                    { l: 'Total dépensé', v: fcfa(spent), i: ShoppingBag, t: 'commandes' as TabId },
                    { l: 'Favoris', v: String(wish.length), i: Heart, t: 'favoris' as TabId },
                    { l: 'Points fidélité', v: `${points} pts`, i: Crown, t: 'apercu' as TabId },
                  ].map(({ l, v, i: I, t }, k) => (
                    <motion.button key={l} onClick={() => setTab(t)} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: k * 0.06 }} className="rounded-2xl border border-ink/10 bg-white p-5 text-left transition hover:-translate-y-0.5 hover:shadow-lg">
                      <I size={20} className="text-gold" />
                      <p className="mt-4 font-display text-2xl font-semibold sm:text-3xl">{v}</p>
                      <p className="text-xs text-ink-500">{l}</p>
                    </motion.button>
                  ))}
                </div>

                <div className="rounded-3xl bg-gradient-to-br from-ink to-ink-700 p-6 text-ivory sm:p-8">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div><p className="eyebrow text-gold-light">Programme fidélité</p><p className="mt-2 font-display text-3xl">Niveau {tier}</p></div>
                    <p className="text-sm text-ivory/60">1 000 FCFA dépensés = 1 point</p>
                  </div>
                  {nextTier ? (
                    <>
                      <div className="mt-6 h-2 overflow-hidden rounded-full bg-ivory/10"><motion.div className="h-full rounded-full bg-gradient-to-r from-gold-dark to-gold-light" initial={{ width: 0 }} animate={{ width: `${Math.min(100, (spent / nextTier) * 100)}%` }} transition={{ duration: 1 }} /></div>
                      <p className="mt-3 text-sm text-ivory/70">Encore <b className="text-gold-light">{fcfa(nextTier - spent)}</b> pour atteindre le niveau {nextTier === 100000 ? 'Argent (-5 % permanent)' : 'Or (-10 % + livraison offerte)'}.</p>
                    </>
                  ) : <p className="mt-4 text-sm text-ivory/70">Vous profitez de -10 % et de la livraison offerte sur toutes vos commandes. Merci !</p>}
                </div>

                <div>
                  <div className="mb-4 flex items-center justify-between"><h2 className="font-display text-3xl">Dernière commande</h2>{orders && orders.length > 1 && <button onClick={() => setTab('commandes')} className="text-sm font-semibold text-gold-dark hover:underline">Tout voir</button>}</div>
                  {orders === null ? <div className="skeleton h-24 rounded-2xl" /> : orders.length ? <OrderCard o={orders[0]} onChange={updateOrder} /> : <Empty icon={Package} title="Aucune commande pour l’instant" text="Vos achats apparaîtront ici avec leur suivi." cta={{ to: '/boutique', label: 'Commencer mes achats' }} />}
                </div>

                {profile && (!profile.address || !profile.birth_date || !(profile.contact_phone || profile.phone)) && (
                  <button onClick={() => setTab('profil')} className="flex w-full items-center justify-between gap-4 rounded-2xl border border-gold/40 bg-gold/10 p-5 text-left">
                    <span><b>Complétez votre profil</b><span className="block text-sm text-ink-500">Ajoutez votre adresse, votre numéro et votre date de naissance pour commander plus vite et recevoir des suggestions adaptées.</span></span>
                    <span className="btn-dark shrink-0 px-5 py-2.5">Compléter</span>
                  </button>
                )}

                <div>
                  <h2 className="mb-6 font-display text-3xl">{group ? 'Sélectionné pour vous' : 'Les plus aimés'}</h2>
                  <div className="grid grid-cols-2 gap-x-2.5 gap-y-5 sm:grid-cols-3 xl:grid-cols-4">{recos.map((p) => <ProductCard key={p.id} p={p} />)}</div>
                </div>
              </div>
            )}

            {tab === 'commandes' && (
              <div>
                <h2 className="mb-6 font-display text-4xl">Mes commandes</h2>
                {orders === null ? <div className="space-y-3">{[0, 1].map((i) => <div key={i} className="skeleton h-24 rounded-2xl" />)}</div>
                  : orders.length ? <div className="space-y-3">{orders.map((o, i) => <OrderCard key={o.id} o={o} defaultOpen={i === 0} onChange={updateOrder} />)}</div>
                  : <Empty icon={Package} title="Aucune commande" text="Les commandes passées en étant connecté apparaissent ici." cta={{ to: '/boutique', label: 'Découvrir la boutique' }} />}
              </div>
            )}

            {tab === 'favoris' && (
              <div>
                <h2 className="mb-6 font-display text-4xl">Mes favoris</h2>
                {wish.length ? <div className="grid grid-cols-2 gap-x-2.5 gap-y-5 sm:grid-cols-3 xl:grid-cols-4">{wish.map((p) => <ProductCard key={p.id} p={p} />)}</div>
                  : <Empty icon={Heart} title="Aucun favori" text="Touchez le cœur sur un produit pour le retrouver ici." cta={{ to: '/boutique', label: 'Explorer la boutique' }} />}
              </div>
            )}

            {tab === 'profil' && (
              <div>
                <h2 className="mb-6 font-display text-4xl">Mon profil</h2>
                {profile ? <ProfileForm key={profile.id} profile={profile} authEmail={user.email} /> : <div className="skeleton h-80 rounded-3xl" />}
              </div>
            )}

            {tab === 'securite' && (<div><h2 className="mb-6 font-display text-4xl">Sécurité</h2><SecurityForm /></div>)}
          </motion.div>
        </AnimatePresence>
      </div>
    </Page>
  )
}
