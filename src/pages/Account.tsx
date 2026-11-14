import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, Gift, Heart, Loader2, Mail, MapPin, Package, Phone, Sparkles, User } from 'lucide-react'
import { requestResetCode } from '../lib/whatsapp'
import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { FormAlert, MatchHint, PasswordField, PasswordMeter, TextField } from '../components/AuthFields'
import { Logo, Social } from '../components/ui'
import { isEmail, normalizePhone, passwordRules } from '../lib/auth-utils'
import { cn } from '../lib/format'
import { DEMO, supabaseReady } from '../lib/supabase'
import { resetDemo } from '../lib/demo-backend'
import { useAuth } from '../store/auth'

type Mode = 'connexion' | 'inscription'

const perks = [
  { i: Package, t: 'Suivi de vos commandes', d: 'Historique et statut en temps réel' },
  { i: MapPin, t: 'Commande express', d: 'Adresse et coordonnées pré-remplies' },
  { i: Gift, t: '-5 000 FCFA offerts', d: 'Code BIENVENUE sur la 1re commande' },
  { i: Heart, t: 'Offres membres', d: 'Ventes privées et nouveautés en avant-première' },
]

function LoginForm({ onDone, switchTo }: { onDone: () => void; switchTo: () => void }) {
  const signIn = useAuth((s) => s.signIn)
  const requestReset = useAuth((s) => s.requestReset)
  const [id, setId] = useState('')
  const [pw, setPw] = useState('')
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)
  const [forgot, setForgot] = useState(false)
  const [resetMsg, setResetMsg] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setErr('')
    if (!id.trim() || !pw) return setErr('Renseignez votre identifiant et votre mot de passe.')
    setLoading(true)
    const r = await signIn(id, pw)
    setLoading(false)
    if (r.ok) onDone(); else setErr(r.error)
  }
  const sendReset = async () => {
    setErr(''); setResetMsg('')
    if (!isEmail(id)) return setErr('Saisissez l’adresse e-mail de votre compte ci-dessus.')
    setLoading(true); const r = await requestReset(id); setLoading(false)
    if (r.ok) setResetMsg('Si un compte existe pour cette adresse, un lien sécurisé (valable 1 heure) vient d’être envoyé. Pensez à vérifier vos courriers indésirables.'); else setErr(r.error)
  }
  const sendWaCode = async () => {
    setErr(''); setResetMsg('')
    if (!id.trim()) return setErr('Saisissez d’abord votre e-mail ou votre numéro de téléphone ci-dessus.')
    if (!isEmail(id) && !normalizePhone(id)) return setErr('Numéro invalide. Exemple : 07 08 09 10 11')
    setLoading(true); const r = await requestResetCode(id); setLoading(false)
    if (!r.ok) return setErr(r.error)
    setResetMsg('Demande reçue ! Si un compte existe, votre code arrive sur le WhatsApp enregistré dans votre compte en quelques minutes (8 h – 20 h). Cliquez ensuite sur « J’ai déjà reçu mon code ».')
  }

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      {err && <FormAlert>{err}</FormAlert>}
      {resetMsg && <FormAlert tone="success">{resetMsg}</FormAlert>}
      <TextField id="login-id" label="E-mail ou numéro de téléphone" icon={<User size={17} />} value={id} onChange={(e) => setId(e.target.value)} autoComplete="username" placeholder="vous@exemple.ci ou 07 08 09 10 11" />
      <PasswordField id="login-pw" label="Mot de passe" value={pw} onChange={setPw} autoComplete="current-password"
        right={<button type="button" onClick={() => setForgot(!forgot)} className="mb-1.5 text-xs font-semibold text-gold-dark hover:underline">Mot de passe oublié ?</button>} />
      <AnimatePresence>
        {forgot && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="rounded-2xl bg-ivory-200/80 p-4 text-sm">
              <p className="font-semibold">Réinitialiser votre mot de passe</p>
              <p className="mt-1 text-ink-500">Saisissez votre <b>e-mail ou numéro</b> ci-dessus : vous recevez un <b>code à 6 chiffres sur votre WhatsApp</b> (le numéro enregistré sur votre compte).</p>
              <button type="button" onClick={sendWaCode} disabled={loading} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#25D366] px-4 py-2.5 text-xs font-bold uppercase tracking-[0.1em] text-white transition hover:bg-[#1ebe5a] disabled:opacity-60">
                {loading ? <Loader2 size={15} className="animate-spin" /> : <Social.WhatsApp size={15} />} Recevoir un code sur WhatsApp
              </button>
              <Link to={`/reinitialiser${id.trim() ? `?id=${encodeURIComponent(id.trim())}` : ''}`} className="mt-2.5 block text-center text-xs font-semibold text-ink underline-offset-4 hover:underline">J’ai déjà reçu mon code →</Link>
              {isEmail(id) && (
                <div className="mt-3 border-t border-ink/10 pt-3">
                  <button type="button" onClick={sendReset} disabled={loading} className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-ink/15 bg-white px-4 py-2.5 text-xs font-bold uppercase tracking-[0.1em] text-ink transition hover:border-ink/40 disabled:opacity-60">
                    {loading ? <Loader2 size={15} className="animate-spin" /> : <Mail size={15} />} Recevoir un lien par e-mail
                  </button>
                  <p className="mt-1.5 text-center text-[11px] text-ink-500">Envoi automatique, immédiat, 24 h/24 — lien sécurisé valable 1 heure.</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <button disabled={loading} className="btn-dark w-full">{loading ? <><Loader2 size={17} className="animate-spin" /> Connexion…</> : 'Se connecter'}</button>
      {DEMO && (
        <div className="rounded-2xl border border-dashed border-gold/50 bg-gold/5 p-4 text-sm" data-testid="demo-logins">
          <p className="font-semibold">Aperçu de démonstration</p>
          <p className="mt-1 text-xs text-ink-500">Cliente fictive : <b>aya.kone@exemple.ci</b> · mot de passe <b>Client2026</b></p>
          <button type="button" data-testid="demo-aya" disabled={loading}
            onClick={async () => { setId('aya.kone@exemple.ci'); setPw('Client2026'); setErr(''); setLoading(true); const r = await signIn('aya.kone@exemple.ci', 'Client2026'); setLoading(false); if (r.ok) onDone(); else setErr(r.error) }}
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full border border-ink/15 bg-white px-4 py-2.5 text-xs font-bold uppercase tracking-[0.1em] text-ink transition hover:border-ink/40 disabled:opacity-60">
            <User size={15} /> Se connecter en tant qu’Aya (cliente)
          </button>
          <button type="button" data-testid="demo-reset" onClick={() => { if (confirm('Remettre la démonstration à zéro ? (commandes et comptes fictifs d’origine)')) { resetDemo(); location.reload() } }}
            className="mt-2 block w-full text-center text-[11px] font-semibold text-ink-500 underline-offset-4 hover:underline">Réinitialiser la démonstration</button>
        </div>
      )}
      <p className="text-center text-sm text-ink-500">Pas encore de compte ? <button type="button" onClick={switchTo} className="font-semibold text-ink underline-offset-4 hover:underline">Créer un compte</button></p>
    </form>
  )
}

function SignupForm({ onDone, switchTo, onHold }: { onDone: () => void; switchTo: () => void; onHold: (v: boolean) => void }) {
  const signUp = useAuth((s) => s.signUp)
  const [method, setMethod] = useState<'email' | 'phone'>('email')
  const [f, setF] = useState({ firstName: '', lastName: '', email: '', phone: '', pw: '', pw2: '', terms: false, newsletter: true })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => { setF((s) => ({ ...s, [k]: v })); setErrors((e) => ({ ...e, [k]: '' })) }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setErr('')
    const x: Record<string, string> = {}
    if (f.firstName.trim().length < 2) x.firstName = 'Prénom requis'
    if (f.lastName.trim().length < 2) x.lastName = 'Nom requis'
    if (method === 'email' && !isEmail(f.email)) x.email = 'Adresse e-mail invalide'
    if (method === 'phone' && !normalizePhone(f.phone)) x.phone = 'Numéro ivoirien invalide (10 chiffres, ex. 07 08 09 10 11)'
    if (!passwordRules.every((r) => r.test(f.pw))) x.pw = 'Le mot de passe ne respecte pas les critères'
    if (!f.pw2) x.pw2 = 'Répétez votre mot de passe'
    else if (f.pw !== f.pw2) x.pw2 = 'Les deux mots de passe ne correspondent pas'
    if (!f.terms) x.terms = 'Vous devez accepter les conditions'
    setErrors(x)
    if (Object.keys(x).length) return
    setLoading(true); onHold(true)
    const r = await signUp({ method, identifier: method === 'email' ? f.email : f.phone, password: f.pw, firstName: f.firstName, lastName: f.lastName, newsletter: f.newsletter })
    setLoading(false)
    if (r.ok) onDone(); else { onHold(false); setErr(r.error) }
  }

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      {err && <FormAlert>{err}</FormAlert>}
      <div>
        <span className="label">S’inscrire avec</span>
        <div className="relative grid grid-cols-2 rounded-xl bg-ivory-200 p-1">
          {(['email', 'phone'] as const).map((m) => (
            <button key={m} type="button" onClick={() => { setMethod(m); setErrors({}) }} className={cn('relative z-10 flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition', method === m ? 'text-ink' : 'text-ink-500 hover:text-ink')}>
              {method === m && <motion.span layoutId="method" className="absolute inset-0 -z-10 rounded-lg bg-white shadow-sm" transition={{ type: 'spring', damping: 30, stiffness: 400 }} />}
              {m === 'email' ? <Mail size={16} /> : <Phone size={16} />}{m === 'email' ? 'E-mail' : 'Téléphone'}
            </button>
          ))}
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField id="su-first" label="Prénom" value={f.firstName} onChange={(e) => set('firstName', e.target.value)} error={errors.firstName} autoComplete="given-name" placeholder="Yves" />
        <TextField id="su-last" label="Nom" value={f.lastName} onChange={(e) => set('lastName', e.target.value)} error={errors.lastName} autoComplete="family-name" placeholder="Kouamé" />
      </div>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={method} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.2 }}>
          {method === 'email' ? (
            <TextField id="su-email" label="Adresse e-mail" type="email" icon={<Mail size={17} />} value={f.email} onChange={(e) => set('email', e.target.value)} error={errors.email} autoComplete="email" placeholder="vous@exemple.ci" />
          ) : (
            <TextField id="su-phone" label="Numéro de téléphone" type="tel" inputMode="tel" icon={<span className="text-sm font-semibold text-ink-500">🇨🇮</span>} value={f.phone} onChange={(e) => set('phone', e.target.value)} error={errors.phone} autoComplete="tel" placeholder="07 08 09 10 11" hint="Orange, MTN ou Moov — vous vous connecterez avec ce numéro." />
          )}
        </motion.div>
      </AnimatePresence>
      <div>
        <PasswordField id="su-pw" label="Mot de passe" value={f.pw} onChange={(v) => set('pw', v)} error={errors.pw} autoComplete="new-password" />
        <PasswordMeter password={f.pw} />
      </div>
      <div>
        <PasswordField id="su-pw2" label="Répéter le mot de passe" value={f.pw2} onChange={(v) => set('pw2', v)} error={errors.pw2} autoComplete="new-password" />
        {!errors.pw2 && <MatchHint a={f.pw} b={f.pw2} />}
      </div>
      <div className="space-y-2.5">
        <label className="flex cursor-pointer items-start gap-3 text-sm">
          <input type="checkbox" checked={f.terms} onChange={(e) => set('terms', e.target.checked)} className="mt-0.5 h-4 w-4 accent-[#0E0D0B]" />
          <span className={cn(errors.terms ? 'text-red-700' : 'text-ink-600')}>J’accepte les <span className="underline">conditions générales</span> et la <span className="underline">politique de confidentialité</span>.</span>
        </label>
        <label className="flex cursor-pointer items-start gap-3 text-sm text-ink-600">
          <input type="checkbox" checked={f.newsletter} onChange={(e) => set('newsletter', e.target.checked)} className="mt-0.5 h-4 w-4 accent-[#0E0D0B]" />
          Recevoir les nouveautés YVES STORE (e-mail / WhatsApp).
        </label>
      </div>
      <button disabled={loading} className="btn-gold w-full">{loading ? <><Loader2 size={17} className="animate-spin" /> Création du compte…</> : 'Créer mon compte'}</button>
      <p className="text-center text-sm text-ink-500">Déjà membre ? <button type="button" onClick={switchTo} className="font-semibold text-ink underline-offset-4 hover:underline">Se connecter</button></p>
    </form>
  )
}

export default function Account() {
  const [sp, setSp] = useSearchParams()
  const nav = useNavigate()
  const { user, ready, isAdmin } = useAuth()
  const mode: Mode = sp.get('mode') === 'inscription' ? 'inscription' : 'connexion'
  const asked = sp.get('redirect')?.startsWith('/') ? sp.get('redirect')! : null
  // Le serveur indique le rôle : gérant → espace gérant, client → espace client
  const target = (admin: boolean | null) => {
    if (admin) return asked && asked.startsWith('/gerant') ? asked : asked && !asked.startsWith('/mon-compte') ? asked : '/gerant'
    return asked && !asked.startsWith('/gerant') ? asked : '/mon-compte'
  }
  const redirect = target(isAdmin)
  const goAfterAuth = () => nav(target(useAuth.getState().isAdmin), { replace: true })
  const setMode = (m: Mode) => { const n = new URLSearchParams(sp); n.set('mode', m); setSp(n, { replace: true }) }
  const [justSignedUp, setJustSignedUp] = useState(false)
  const [hold, setHold] = useState(false)

  useEffect(() => { document.title = `${mode === 'inscription' ? 'Créer un compte' : 'Connexion'} — YVES STORE` }, [mode])

  if (ready && user && !justSignedUp && !hold) {
    if (isAdmin === null) return <main className="grid min-h-screen place-items-center bg-ivory"><Loader2 className="animate-spin text-gold" size={30} /></main>
    return <Navigate to={redirect} replace />
  }

  return (
    <main className="grid min-h-screen bg-ivory lg:grid-cols-[1.05fr_1fr]">
      {/* Panneau visuel */}
      <section className="relative hidden overflow-hidden bg-ink text-ivory lg:block">
        <motion.img src="/img/hero.webp" alt="" initial={{ scale: 1.12 }} animate={{ scale: 1.02 }} transition={{ duration: 2.4, ease: [0.22, 1, 0.36, 1] }} className="absolute inset-0 h-full w-full object-cover object-[60%_center]" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/60 to-ink/30" />
        <div className="relative flex h-full flex-col justify-between p-12 xl:p-16">
          <Link to="/"><Logo light /></Link>
          <div>
            <motion.p initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="eyebrow text-gold-light">Espace membre</motion.p>
            <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.8 }} className="h-display mt-4 max-w-lg text-6xl xl:text-7xl">
              Bienvenue dans <em className="italic text-gold-light">la famille</em> YVES.
            </motion.h1>
            <div className="mt-10 grid max-w-xl grid-cols-2 gap-4">
              {perks.map(({ i: I, t, d }, k) => (
                <motion.div key={t} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 + k * 0.08 }} className="rounded-2xl border border-ivory/10 bg-ivory/5 p-4 backdrop-blur-md">
                  <I size={20} className="text-gold-light" />
                  <p className="mt-2 text-sm font-semibold">{t}</p>
                  <p className="text-xs text-ivory/60">{d}</p>
                </motion.div>
              ))}
            </div>
          </div>
          <p className="text-xs text-ivory/40">© {new Date().getFullYear()} YVES STORE · Agboville & Abidjan</p>
        </div>
      </section>

      {/* Formulaires */}
      <section className="flex flex-col">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center px-5 py-5 sm:px-10">
          <Link to="/" className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-ink-500 hover:text-ink"><ArrowLeft size={16} /> Boutique</Link>
          <Link to="/" className="lg:hidden"><Logo /></Link>
          <span />
        </div>
        <div className="flex flex-1 items-center justify-center px-5 pb-12 sm:px-10">
          <div className="w-full max-w-[460px]">
            <AnimatePresence mode="wait">
              {justSignedUp ? (
                <motion.div key="welcome" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
                  <motion.div initial={{ scale: 0, rotate: -30 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', damping: 12 }} className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-gold"><Sparkles size={34} className="text-ink" /></motion.div>
                  <h2 className="h-display mt-6 text-5xl">Compte créé !</h2>
                  <p className="mt-3 text-ink-500">Bienvenue chez YVES STORE. Votre code <b className="text-ink">BIENVENUE</b> vous offre 5 000 FCFA sur votre première commande dès 30 000 FCFA.</p>
                  <div className="mt-8 flex flex-col gap-3">
                    <button onClick={goAfterAuth} className="btn-dark">{redirect === '/mon-compte' ? 'Accéder à mon espace' : redirect.startsWith('/gerant') ? 'Accéder à l’espace gérant' : 'Continuer'}</button>
                    <Link to="/boutique" className="btn-outline">Découvrir la boutique</Link>
                  </div>
                </motion.div>
              ) : (
                <motion.div key="forms" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                  <p className="eyebrow">{mode === 'connexion' ? 'Ravi de vous revoir' : 'Rejoignez-nous'}</p>
                  <h2 className="h-display mt-3 text-5xl">{mode === 'connexion' ? 'Connexion' : 'Créer un compte'}</h2>
                  {sp.get('raison') === 'commande' && (
                    <p className="mt-4 rounded-xl bg-gold/15 px-4 py-3 text-sm text-ink">🛍️ <b>Un compte est nécessaire pour commander.</b> Connectez-vous ou créez votre compte en 1 minute : votre panier est conservé.</p>
                  )}
                  <div className="relative mt-8 grid grid-cols-2 border-b border-ink/10">
                    {(['connexion', 'inscription'] as Mode[]).map((m) => (
                      <button key={m} onClick={() => setMode(m)} className={cn('relative pb-3 text-sm font-semibold uppercase tracking-[0.14em] transition', mode === m ? 'text-ink' : 'text-ink-400 hover:text-ink')}>
                        {m === 'connexion' ? 'Se connecter' : 'S’inscrire'}
                        {mode === m && <motion.span layoutId="authtab" className="absolute inset-x-0 -bottom-px h-0.5 bg-gold" />}
                      </button>
                    ))}
                  </div>
                  {!supabaseReady && <div className="mt-6"><FormAlert>Le service de comptes n’est pas configuré (variables Supabase manquantes).</FormAlert></div>}
                  <div className="mt-7">
                    <AnimatePresence mode="wait">
                      <motion.div key={mode} initial={{ opacity: 0, x: mode === 'inscription' ? 24 : -24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: mode === 'inscription' ? -24 : 24 }} transition={{ duration: 0.3 }}>
                        {mode === 'connexion'
                          ? <LoginForm onDone={goAfterAuth} switchTo={() => setMode('inscription')} />
                          : <SignupForm onDone={() => setJustSignedUp(true)} onHold={setHold} switchTo={() => setMode('connexion')} />}
                      </motion.div>
                    </AnimatePresence>
                  </div>
                  <p className="mt-8 flex items-center justify-center gap-2 text-center text-xs text-ink-400"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Connexion chiffrée · Vos données ne sont jamais revendues</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </section>
    </main>
  )
}
