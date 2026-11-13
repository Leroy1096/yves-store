import { Check, Clock, KeyRound, Loader2, Mail, ShieldCheck, Package, RefreshCw, Trash2, XCircle } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Social } from '../../components/ui'
import { formatPhone } from '../../lib/auth-utils'
import { cn } from '../../lib/format'
import { supabase } from '../../lib/supabase'
import { clientWaLink, KIND_FR, ORDER_STATUS_FR, orderMessage, resetMessage, type WaRequest } from '../../lib/whatsapp'
import { fetchResetLog, PageHead, RESET_CHANNEL_FR, RESET_EVENT_FR, type ResetLog } from './shared'

type Tab = 'en_attente' | 'envoye' | 'tout' | 'journal'
const TABS: { id: Tab; label: string }[] = [
  { id: 'en_attente', label: 'À envoyer' },
  { id: 'envoye', label: 'Envoyés' },
  { id: 'tout', label: 'Tout' },
  { id: 'journal', label: '🔑 Mots de passe' },
]
const KIND_STYLE: Record<string, string> = {
  reset_password: 'bg-amber-50 text-amber-800',
  order_tracking: 'bg-sky-50 text-sky-800',
  order_cancel: 'bg-red-50 text-red-700',
}
const STATUS_STYLE: Record<string, string> = {
  en_attente: 'bg-orange-100 text-orange-800', envoye: 'bg-emerald-100 text-emerald-800', traite: 'bg-ink/10 text-ink-500', annule: 'bg-ink/5 text-ink-400',
}
const STATUS_LABEL: Record<string, string> = { en_attente: 'À envoyer', envoye: 'Envoyé', traite: 'Traité', annule: 'Ignoré' }

const ago = (d: string) => {
  const m = Math.round((Date.now() - new Date(d).getTime()) / 60000)
  if (m < 1) return 'à l’instant'
  if (m < 60) return `il y a ${m} min`
  if (m < 1440) return `il y a ${Math.floor(m / 60)} h`
  return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function RequestCard({ r, onChanged }: { r: WaRequest; onChanged: (patch: Partial<WaRequest>) => void }) {
  const [code, setCode] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [orderStatus, setOrderStatus] = useState(r.payload.status ?? 'confirmee')
  const isReset = r.kind === 'reset_password'
  const defaultMsg = useMemo(() => (isReset ? (code ? resetMessage(r.customer_name, code) : '') : orderMessage(r, orderStatus)), [r, code, orderStatus, isReset])
  const [msg, setMsg] = useState(defaultMsg)
  useEffect(() => setMsg(defaultMsg), [defaultMsg])
  const closed = r.status === 'traite' || r.status === 'annule'

  const setStatus = async (status: WaRequest['status']) => {
    setErr('')
    const { error } = await supabase.rpc('admin_set_request_status', { p_request: r.id, p_status: status })
    if (error) setErr('Action impossible : ' + error.message); else onChanged({ status })
  }
  const prepareCode = async () => {
    setBusy(true); setErr('')
    const { data, error } = await supabase.rpc('admin_prepare_reset', { p_request: r.id })
    setBusy(false)
    if (error) return setErr(error.message.includes('ALREADY') ? 'Demande déjà traitée.' : 'Impossible de générer le code.')
    setCode(data.code)
    onChanged({ status: 'envoye', code_expires_at: data.expires_at, sent_at: new Date().toISOString() })
  }
  const changeOrderStatus = async (s: string) => {
    setOrderStatus(s)
    if (r.payload.source !== 'compte' || !r.order_id) return
    const { error } = await supabase.rpc('admin_set_order_status', { p_order: r.order_id, p_status: s })
    if (error) setErr('Statut non enregistré : ' + error.message)
  }

  return (
    <article className={cn('rounded-2xl border bg-white p-4 sm:p-5', r.status === 'en_attente' ? 'border-orange-200 shadow-sm' : 'border-ink/10', closed && 'opacity-70')}>
      <div className="flex flex-wrap items-center gap-2">
        <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide', KIND_STYLE[r.kind])}>
          {isReset ? <KeyRound size={12} /> : r.kind === 'order_cancel' ? <XCircle size={12} /> : <Package size={12} />}
          {KIND_FR[r.kind]}{r.kind === 'order_cancel' && r.payload.motif === 'aide' ? ' · aide' : r.kind === 'order_cancel' ? ' · confirmation' : ''}
        </span>
        <span className={cn('rounded-full px-2.5 py-1 text-[11px] font-semibold', STATUS_STYLE[r.status])}>{STATUS_LABEL[r.status]}</span>
        <span className="ml-auto inline-flex items-center gap-1 text-xs text-ink-400"><Clock size={12} />{ago(r.created_at)}</span>
      </div>
      <div className="mt-3 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-3">
        <p><span className="text-ink-400">Client : </span><b>{r.customer_name || '—'}</b></p>
        <p><span className="text-ink-400">WhatsApp : </span><b className="whitespace-nowrap">{formatPhone(r.phone)}</b></p>
        {r.order_id && <p><span className="text-ink-400">Commande : </span><b>{r.order_id}</b>{r.payload.source === 'invite' && <span className="ml-1 text-xs text-ink-400">(invité)</span>}</p>}
      </div>

      {!closed && (
        <div className="mt-4">
          {isReset && !code && (
            <div className="flex flex-wrap items-center gap-3">
              <button onClick={prepareCode} disabled={busy} className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-sm font-bold text-ivory hover:bg-ink-700 disabled:opacity-60">
                {busy ? <Loader2 size={15} className="animate-spin" /> : <KeyRound size={15} />} {r.status === 'envoye' ? 'Générer un nouveau code' : 'Générer le code'}
              </button>
              <p className="text-xs text-ink-400">{r.status === 'envoye' ? 'Un code a déjà été généré ; en créer un nouveau annule l’ancien.' : 'Code à 6 chiffres, valable 30 min, stocké chiffré.'}</p>
            </div>
          )}
          {isReset && code && (
            <p className="mb-3 text-sm">Code généré : <b className="rounded-lg bg-amber-50 px-2 py-1 font-mono text-lg tracking-[0.3em] text-amber-900">{code}</b> <span className="text-xs text-ink-400">(affiché une seule fois)</span></p>
          )}
          {!isReset && r.kind === 'order_tracking' && (
            <label className="mb-3 flex flex-wrap items-center gap-2 text-sm">
              <span className="text-ink-500">Statut à annoncer :</span>
              <select value={orderStatus} onChange={(e) => changeOrderStatus(e.target.value)} className="rounded-lg border border-ink/15 bg-white px-3 py-1.5 text-sm">
                {Object.entries(ORDER_STATUS_FR).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              {r.payload.source === 'compte' && <span className="text-xs text-ink-400">(met aussi à jour la commande du client)</span>}
            </label>
          )}
          {(msg || !isReset) && (
            <>
              <textarea value={msg} onChange={(e) => setMsg(e.target.value)} rows={Math.min(14, msg.split('\n').length + 1)} className="w-full resize-y rounded-xl border border-ink/10 bg-ivory-100/60 p-3 font-mono text-[12.5px] leading-relaxed" aria-label="Message WhatsApp" />
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <a href={clientWaLink(r.phone, msg)} target="_blank" rel="noreferrer" onClick={() => { if (r.status === 'en_attente') void setStatus('envoye') }}
                  className="inline-flex items-center gap-2 rounded-full bg-[#25D366] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#1ebe5a]">
                  <Social.WhatsApp size={16} /> Envoyer sur le WhatsApp du client
                </a>
                {r.status === 'envoye' && <button onClick={() => setStatus('traite')} className="inline-flex items-center gap-1.5 rounded-full border border-ink/15 px-4 py-2 text-xs font-semibold hover:border-ink"><Check size={14} /> Marquer traité</button>}
              </div>
            </>
          )}
          <button onClick={() => setStatus('annule')} className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-ink-400 hover:text-red-600"><Trash2 size={13} /> Ignorer cette demande</button>
        </div>
      )}
      {err && <p className="mt-2 text-xs font-medium text-red-600">{err}</p>}
    </article>
  )
}

const EV_STYLE: Record<ResetLog['event'], string> = {
  demande: 'bg-ink/5 text-ink-600', envoye: 'bg-sky-50 text-sky-800', reussi: 'bg-emerald-100 text-emerald-800', echec: 'bg-amber-100 text-amber-800', limite: 'bg-red-100 text-red-700',
}
const fmtWhen = (d: string) => new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })

/** Journal « mot de passe oublié » : qui, quand, par quel canal, résultat — jamais de code ni de mot de passe */
function ResetJournal({ rows }: { rows: ResetLog[] | null }) {
  if (rows === null) return <Loader2 className="animate-spin text-gold" />
  const month = rows.filter((r) => Date.now() - new Date(r.created_at).getTime() < 30 * 86400000)
  const n = (ev: ResetLog['event'], ch?: ResetLog['channel']) => month.filter((r) => r.event === ev && (!ch || r.channel === ch)).length
  const stats = [
    { l: 'Demandes', v: n('demande'), s: `${n('demande', 'email')} e-mail · ${n('demande', 'whatsapp')} WhatsApp` },
    { l: 'Liens e-mail automatiques', v: n('envoye', 'email'), s: 'envoyés sans intervention' },
    { l: 'Réinitialisés', v: n('reussi'), s: `${n('reussi', 'email')} e-mail · ${n('reussi', 'whatsapp')} WhatsApp` },
    { l: 'Alertes', v: n('echec') + n('limite'), s: `${n('echec')} code faux · ${n('limite')} bloquée(s)` },
  ]
  return (
    <div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((x) => (
          <div key={x.l} className="rounded-2xl bg-white p-4"><p className="text-xs font-semibold uppercase tracking-[0.1em] text-ink-400">{x.l}</p><p className="mt-1 font-display text-3xl">{x.v}</p><p className="text-xs text-ink-500">{x.s}</p></div>
        ))}
      </div>
      <p className="mt-2 text-xs text-ink-400">30 derniers jours.</p>
      <div className="mt-4 overflow-hidden rounded-3xl bg-white">
        {rows.length === 0 ? <p className="px-6 py-14 text-center text-sm text-ink-500">Aucune demande de réinitialisation pour le moment.</p> : (
          <ul className="divide-y divide-ink/5">
            {rows.slice(0, 120).map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-5 py-3 text-sm">
                <span className="w-28 shrink-0 text-xs tabular-nums text-ink-400">{fmtWhen(r.created_at)}</span>
                <span className="min-w-[7rem] font-semibold">{r.customer_name ?? 'Client'}</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-ivory-200 px-2 py-0.5 text-xs">{r.channel === 'email' ? <Mail size={12} /> : <Social.WhatsApp size={12} />}{RESET_CHANNEL_FR[r.channel]}</span>
                <span className={cn('rounded-full px-2 py-0.5 text-xs font-semibold', EV_STYLE[r.event])}>{RESET_EVENT_FR[r.event]}</span>
                {r.detail && <span className="text-xs text-ink-500">{r.detail}</span>}
              </li>
            ))}
          </ul>
        )}
      </div>
      <p className="mt-4 flex items-start gap-2 text-xs text-ink-500"><ShieldCheck size={15} className="mt-px shrink-0 text-emerald-700" /> Les codes et mots de passe ne sont jamais enregistrés dans ce journal. Les liens par e-mail partent automatiquement (valables 1 heure) ; vous recevez un e-mail « 🔑 Mot de passe réinitialisé » à chaque réinitialisation par e-mail.</p>
    </div>
  )
}

export default function Messages({ onChange }: { onChange?: () => void }) {
  const [rows, setRows] = useState<WaRequest[] | null>(null)
  const [tab, setTabRaw] = useState<Tab>('en_attente')
  // Les cartes modifiées restent visibles jusqu’au changement d’onglet (le code reste affiché)
  const [touched, setTouched] = useState<string[]>([])
  const setTab = (t: Tab) => { setTabRaw(t); setTouched([]) }
  const [loading, setLoading] = useState(false)
  const [journal, setJournal] = useState<ResetLog[] | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    void fetchResetLog().then(setJournal).catch(() => setJournal([]))
    const { data } = await supabase.from('whatsapp_requests')
      .select('id,kind,user_id,phone,customer_name,order_id,payload,status,code_expires_at,created_at,sent_at')
      .order('created_at', { ascending: false }).limit(200)
    setRows((data as WaRequest[]) ?? [])
    setLoading(false)
  }, [])
  useEffect(() => {
    void load()
    const t = setInterval(load, 30000)
    return () => clearInterval(t)
  }, [load])

  const counts = { en_attente: 0, envoye: 0, tout: rows?.length ?? 0, journal: (journal ?? []).filter((r) => r.event === 'reussi' && Date.now() - new Date(r.created_at).getTime() < 30 * 86400000).length }
  rows?.forEach((r) => { if (r.status === 'en_attente') counts.en_attente++; if (r.status === 'envoye') counts.envoye++ })
  const list = (rows ?? []).filter((r) => tab === 'tout' || r.status === tab || touched.includes(r.id))
  const patch = (id: string) => (p: Partial<WaRequest>) => {
    setTouched((t) => (t.includes(id) ? t : [...t, id]))
    setRows((rs) => rs?.map((x) => (x.id === id ? { ...x, ...p } : x)) ?? null)
    onChange?.()
  }

  return (
    <>
      <PageHead title="Messages WhatsApp" sub={<>Demandes des clients (code mot de passe, suivi, annulation). Cliquez sur <b>« Envoyer sur le WhatsApp du client »</b> : WhatsApp s’ouvre sur <b>son</b> numéro avec le message prêt — il ne reste qu’à appuyer sur Envoyer.</>}
        actions={<button onClick={load} disabled={loading} className="inline-flex items-center gap-1.5 rounded-full border border-ink/15 bg-white px-4 py-2 text-xs font-semibold hover:border-ink"><RefreshCw size={14} className={cn(loading && 'animate-spin')} /> Actualiser</button>} />
      <div className="flex flex-wrap items-center gap-2">
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} className={cn('rounded-full px-4 py-2 text-sm font-semibold transition', tab === t.id ? 'bg-ink text-ivory' : 'bg-white text-ink-500 hover:bg-ivory-200')}>
            {t.label} <span className={cn('ml-1 rounded-full px-1.5 text-xs', tab === t.id ? 'bg-ivory/20' : 'bg-ink/5', t.id === 'en_attente' && counts.en_attente > 0 && tab !== t.id && 'bg-orange-500 text-white')}>{counts[t.id]}</span>
          </button>
        ))}
      </div>
      <div className="mt-5 space-y-4">
        {tab === 'journal' ? <ResetJournal rows={journal} /> : rows === null ? <Loader2 className="animate-spin text-gold" /> : list.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-ink/20 px-6 py-14 text-center text-sm text-ink-500">Aucune demande {tab === 'en_attente' ? 'en attente' : tab === 'envoye' ? 'envoyée' : ''} pour le moment. 🎉</div>
        ) : list.map((r) => <RequestCard key={r.id} r={r} onChanged={patch(r.id)} />)}
      </div>
      <p className="mt-8 text-xs text-ink-400">Actualisation automatique toutes les 30 secondes. Pour un envoi 100 % automatique (sans appuyer sur Envoyer), il faudra un compte WhatsApp Business API (Meta).</p>
    </>
  )
}
