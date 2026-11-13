import { KeyRound, Loader2, User } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { FormAlert, MatchHint, PasswordField, PasswordMeter, TextField } from '../components/AuthFields'
import { Logo, Social } from '../components/ui'
import { isEmail, normalizePhone, passwordRules } from '../lib/auth-utils'
import { requestResetCode, resetPasswordWithCode } from '../lib/whatsapp'
import { useAuth } from '../store/auth'

/** Formulaire : identifiant + code WhatsApp + nouveau mot de passe */
function CodeForm({ initialId }: { initialId: string }) {
  const signIn = useAuth((s) => s.signIn)
  const nav = useNavigate()
  const [id, setId] = useState(initialId)
  const [code, setCode] = useState('')
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [err, setErr] = useState('')
  const [info, setInfo] = useState('')
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)

  const validId = () => isEmail(id) || !!normalizePhone(id)
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(''); setInfo('')
    if (!validId()) return setErr('Saisissez l’e-mail ou le numéro de votre compte.')
    if (!/^\d{6}$/.test(code)) return setErr('Le code reçu sur WhatsApp contient 6 chiffres.')
    if (!passwordRules.every((r) => r.test(pw))) return setErr('8 caractères minimum, avec une lettre et un chiffre.')
    if (pw !== pw2) return setErr('Les deux mots de passe ne correspondent pas.')
    setLoading(true)
    const r = await resetPasswordWithCode(id, code, pw)
    if (!r.ok) { setLoading(false); return setErr(r.error) }
    const s = await signIn(id, pw)
    setLoading(false)
    if (s.ok) nav('/mon-compte', { replace: true })
    else { setInfo('Mot de passe modifié ! Vous pouvez vous connecter.'); setTimeout(() => nav('/compte', { replace: true }), 1500) }
  }
  const resend = async () => {
    setErr(''); setInfo('')
    if (!validId()) return setErr('Saisissez d’abord l’e-mail ou le numéro de votre compte.')
    setResending(true); const r = await requestResetCode(id); setResending(false)
    if (r.ok) setInfo('Nouvelle demande envoyée. Le code arrive sur votre WhatsApp en quelques minutes (8 h – 20 h).'); else setErr(r.error)
  }

  return (
    <form onSubmit={submit} className="mt-6 space-y-5" noValidate>
      <div className="flex items-start gap-3 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-900">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#25D366] text-white"><Social.WhatsApp size={17} /></span>
        <p>Saisissez le <b>code à 6 chiffres</b> reçu sur votre WhatsApp, puis choisissez un nouveau mot de passe. Le code est valable 30 minutes.</p>
      </div>
      {err && <FormAlert>{err}</FormAlert>}
      {info && <FormAlert tone="success">{info}</FormAlert>}
      <TextField id="rc-id" label="E-mail ou numéro du compte" icon={<User size={17} />} value={id} onChange={(e) => setId(e.target.value)} autoComplete="username" placeholder="vous@exemple.ci ou 07 08 09 10 11" />
      <TextField id="rc-code" label="Code WhatsApp" icon={<KeyRound size={17} />} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
        inputMode="numeric" autoComplete="one-time-code" placeholder="••••••" className="tracking-[0.5em] tabular-nums" />
      <div><PasswordField id="rc-1" label="Nouveau mot de passe" value={pw} onChange={setPw} autoComplete="new-password" /><PasswordMeter password={pw} /></div>
      <div><PasswordField id="rc-2" label="Répéter le mot de passe" value={pw2} onChange={setPw2} autoComplete="new-password" /><MatchHint a={pw} b={pw2} /></div>
      <button disabled={loading} className="btn-dark w-full">{loading ? <Loader2 size={16} className="animate-spin" /> : 'Changer mon mot de passe'}</button>
      <p className="text-center text-sm text-ink-500">Pas reçu de code ? <button type="button" onClick={resend} disabled={resending} className="font-semibold text-emerald-700 hover:underline">{resending ? 'Envoi…' : 'Redemander un code'}</button></p>
    </form>
  )
}

/** Formulaire classique (arrivée via le lien e-mail de réinitialisation) */
function SessionForm() {
  const setNewPassword = useAuth((s) => s.setNewPassword)
  const reportEmailResetDone = useAuth((s) => s.reportEmailResetDone)
  const nav = useNavigate()
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setErr('')
    if (!passwordRules.every((r) => r.test(pw))) return setErr('8 caractères minimum, avec une lettre et un chiffre.')
    if (pw !== pw2) return setErr('Les deux mots de passe ne correspondent pas.')
    setLoading(true); const r = await setNewPassword(pw); setLoading(false)
    if (r.ok) { void reportEmailResetDone(); nav('/mon-compte', { replace: true }) } else setErr(r.error)
  }
  return (
    <form onSubmit={submit} className="mt-6 space-y-5">
      {err && <FormAlert>{err}</FormAlert>}
      <div><PasswordField id="rp-1" label="Nouveau mot de passe" value={pw} onChange={setPw} autoComplete="new-password" /><PasswordMeter password={pw} /></div>
      <div><PasswordField id="rp-2" label="Répéter le mot de passe" value={pw2} onChange={setPw2} autoComplete="new-password" /><MatchHint a={pw} b={pw2} /></div>
      <button disabled={loading} className="btn-dark w-full">{loading ? <Loader2 size={16} className="animate-spin" /> : 'Enregistrer'}</button>
    </form>
  )
}

export default function ResetPassword() {
  const { user, ready } = useAuth()
  const [params] = useSearchParams()
  const idParam = params.get('id') ?? ''
  // Session active (lien e-mail) et pas de demande explicite par code → formulaire classique
  const sessionMode = ready && !!user && !params.has('id') && !params.has('code-wa')
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-ivory px-5 py-12">
      <Link to="/"><Logo /></Link>
      <div className="mt-10 w-full max-w-md rounded-3xl border border-ink/10 bg-white p-7 sm:p-9">
        <h1 className="h-display text-4xl">Nouveau mot de passe</h1>
        {!ready ? <Loader2 className="mt-6 animate-spin text-gold" /> : sessionMode ? <SessionForm /> : <CodeForm initialId={idParam} />}
        <Link to="/compte" className="mt-6 block text-center text-xs font-semibold uppercase tracking-[0.12em] text-ink-500 hover:text-ink">← Retour à la connexion</Link>
      </div>
    </main>
  )
}
