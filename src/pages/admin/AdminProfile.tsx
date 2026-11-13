import { Check, ExternalLink, Loader2, LogOut, Mail, ShieldCheck, User } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FormAlert, MatchHint, PasswordField, PasswordMeter, TextField } from '../../components/AuthFields'
import { PhoneInput } from '../../components/ProfileFields'
import { formatPhone, initials, normalizePhone, passwordRules } from '../../lib/auth-utils'
import { useAuth } from '../../store/auth'
import { Card, PageHead } from './shared'

export default function AdminProfile() {
  const { user, profile, updateProfile, changePassword, signOut } = useAuth()
  const nav = useNavigate()
  const [first, setFirst] = useState('')
  const [last, setLast] = useState('')
  const [wa, setWa] = useState('')
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null)
  const [saving, setSaving] = useState(false)
  const [cur, setCur] = useState('')
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; t: string } | null>(null)
  const [pwBusy, setPwBusy] = useState(false)

  useEffect(() => {
    if (!profile) return
    setFirst(profile.first_name ?? ''); setLast(profile.last_name ?? '')
    setWa((profile.contact_phone ?? '').replace('+225', ''))
  }, [profile])

  const save = async (e: React.FormEvent) => {
    e.preventDefault(); setMsg(null)
    if (!first.trim()) return setMsg({ ok: false, t: 'Le prénom est obligatoire.' })
    const phone = wa.trim() ? normalizePhone(wa) : null
    if (wa.trim() && !phone) return setMsg({ ok: false, t: 'Numéro WhatsApp invalide (10 chiffres, ex. 07 08 09 10 11).' })
    setSaving(true)
    const r = await updateProfile({ first_name: first.trim(), last_name: last.trim(), contact_phone: phone })
    setSaving(false)
    setMsg(r.ok ? { ok: true, t: 'Profil enregistré.' } : { ok: false, t: r.error })
  }
  const savePw = async (e: React.FormEvent) => {
    e.preventDefault(); setPwMsg(null)
    if (!cur) return setPwMsg({ ok: false, t: 'Saisissez votre mot de passe actuel.' })
    if (!passwordRules.every((r) => r.test(pw))) return setPwMsg({ ok: false, t: '8 caractères minimum, avec une lettre et un chiffre.' })
    if (pw !== pw2) return setPwMsg({ ok: false, t: 'Les deux mots de passe ne correspondent pas.' })
    setPwBusy(true); const r = await changePassword(cur, pw); setPwBusy(false)
    if (r.ok) { setCur(''); setPw(''); setPw2(''); setPwMsg({ ok: true, t: 'Mot de passe modifié.' }) } else setPwMsg({ ok: false, t: r.error })
  }

  return (
    <>
      <PageHead title="Mon profil gérant" sub="Vos informations de gérant, distinctes de l’espace client." />
      <Card className="mb-5 flex flex-wrap items-center gap-4 bg-ink p-5 text-ivory">
        <span className="grid h-16 w-16 place-items-center rounded-full bg-gradient-to-br from-gold-light to-gold-dark font-display text-2xl font-semibold text-ink">{initials(profile?.first_name, profile?.last_name)}</span>
        <div className="min-w-0 flex-1">
          <p className="font-display text-2xl font-semibold">{[profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || 'Gérant'}</p>
          <p className="flex items-center gap-2 text-sm text-ivory/60"><ShieldCheck size={14} className="text-gold-light" /> Gérant YVES STORE · {user?.email}</p>
          {profile?.contact_phone && <p className="text-sm text-ivory/60">WhatsApp : {formatPhone(profile.contact_phone)}</p>}
        </div>
      </Card>
      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="p-5 sm:p-6">
          <p className="font-semibold">Informations</p>
          <form onSubmit={save} className="mt-4 space-y-4">
            {msg && <FormAlert tone={msg.ok ? 'success' : 'error'}>{msg.t}</FormAlert>}
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField id="ap-first" label="Prénom" value={first} onChange={(e) => setFirst(e.target.value)} icon={<User size={16} />} />
              <TextField id="ap-last" label="Nom" value={last} onChange={(e) => setLast(e.target.value)} />
            </div>
            <TextField id="ap-email" label="E-mail de connexion" value={user?.email ?? ''} disabled icon={<Mail size={16} />} />
            <PhoneInput id="ap-wa" label="Mon numéro WhatsApp" value={wa} onChange={setWa} hint="Pour recevoir un code si vous oubliez votre mot de passe." />
            <button disabled={saving} className="btn-dark w-full">{saving ? <Loader2 size={16} className="animate-spin" /> : <><Check size={16} /> Enregistrer</>}</button>
          </form>
        </Card>
        <Card className="p-5 sm:p-6">
          <p className="font-semibold">Changer mon mot de passe</p>
          <form onSubmit={savePw} className="mt-4 space-y-4">
            {pwMsg && <FormAlert tone={pwMsg.ok ? 'success' : 'error'}>{pwMsg.t}</FormAlert>}
            <PasswordField id="ap-cur" label="Mot de passe actuel" value={cur} onChange={setCur} autoComplete="current-password" />
            <div><PasswordField id="ap-pw" label="Nouveau mot de passe" value={pw} onChange={setPw} autoComplete="new-password" /><PasswordMeter password={pw} /></div>
            <div><PasswordField id="ap-pw2" label="Répéter le mot de passe" value={pw2} onChange={setPw2} autoComplete="new-password" /><MatchHint a={pw} b={pw2} /></div>
            <button disabled={pwBusy} className="btn-dark w-full">{pwBusy ? <Loader2 size={16} className="animate-spin" /> : 'Modifier le mot de passe'}</button>
          </form>
        </Card>
      </div>
      <div className="mt-5 flex flex-wrap gap-3">
        <Link to="/" className="btn-outline"><ExternalLink size={16} /> Voir la boutique</Link>
        <button onClick={async () => { await signOut(); nav('/') }} className="btn-outline !border-red-200 !text-red-600 hover:!bg-red-600 hover:!text-white"><LogOut size={16} /> Se déconnecter</button>
      </div>
    </>
  )
}
