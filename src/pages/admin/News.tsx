import { Check, CheckCircle2, Copy, Download, ExternalLink, Loader2, Mail, Megaphone, RefreshCw, Search, Send, UserX, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Img, Social } from '../../components/ui'
import { cn, fcfa } from '../../lib/format'
import { buildMessage, personalize, productTitle, toItem, waTo, weekTitle, type Announcement, type NewsKind, type Subscriber } from '../../lib/news'
import { DEMO, supabase } from '../../lib/supabase'
import { Badge, Card, dateTime, downloadCsv, Empty, ErrorBox, errMsg, fetchCatalog, Loading, PageHead, Pills, productInfo, Stat, type CatalogRow } from './shared'

type Tab = 'produit' | 'hebdo' | 'historique' | 'abonnes'
const MAX = 12
const isNewThisWeek = (r: CatalogRow) => {
  if (!r.active) return false
  if (r.custom && r.created_at && Date.now() - new Date(r.created_at).getTime() <= 7 * 864e5) return true
  // Aperçu de démonstration : les articles du catalogue marqués « ajoutés il y a ≤ 7 jours »
  return DEMO && (productInfo(r.id)?.addedDaysAgo ?? 99) <= 7
}
const firstName = (n?: string | null) => (n ?? '').trim().split(/\s+/)[0] || ''
const phoneFr = (p: string) => p.replace(/^\+225(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/, '$1 $2 $3 $4 $5')

async function fetchAudience() {
  const { data, error } = await supabase.rpc('admin_news_audience')
  if (error) throw error
  return (data ?? []) as Subscriber[]
}
async function fetchAnnouncements() {
  const { data, error } = await supabase.from('announcements').select('*').order('created_at', { ascending: false }).limit(60)
  if (error) throw error
  return (data ?? []) as Announcement[]
}

/* ───────── Choix des articles ───────── */
function ProductPicker({ rows, selected, onToggle, only }: { rows: CatalogRow[]; selected: string[]; onToggle: (id: string) => void; only?: (r: CatalogRow) => boolean }) {
  const [q, setQ] = useState('')
  const list = useMemo(() => {
    const s = q.trim().toLowerCase()
    const base = rows.filter((r) => r.active && (!only || only(r)))
    const sorted = [...base].sort((a, b) => Number(selected.includes(b.id)) - Number(selected.includes(a.id)) || (productInfo(a.id)?.addedDaysAgo ?? 999) - (productInfo(b.id)?.addedDaysAgo ?? 999))
    return sorted.filter((r) => !s || r.name.toLowerCase().includes(s)).slice(0, 40)
  }, [rows, q, selected, only])
  return (
    <div>
      {!only && (
        <div className="relative mb-3">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un article à annoncer…" className="w-full rounded-xl border border-ink/15 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-gold" data-testid="news-search" />
        </div>
      )}
      <div className="grid max-h-[340px] grid-cols-1 gap-2 overflow-y-auto overflow-x-hidden pr-1 sm:grid-cols-2">
        {list.map((r) => {
          const info = productInfo(r.id); const on = selected.includes(r.id)
          return (
            <button key={r.id} type="button" onClick={() => onToggle(r.id)} data-testid={`pick-${r.id}`}
              className={cn('flex min-w-0 items-center gap-3 rounded-xl border p-2 text-left transition', on ? 'border-gold bg-gold/10 ring-1 ring-gold' : 'border-ink/10 bg-white hover:border-ink/30')}>
              {info ? <Img src={info.images[0]} alt="" className="h-12 w-10 shrink-0 rounded-lg object-cover" /> : <span className="h-12 w-10 shrink-0 rounded-lg bg-ivory-200" />}
              <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{r.name}</span><span className="text-xs text-ink-500">{fcfa(r.price)}{info?.badge === 'Nouveau' && <span className="ml-1.5 font-semibold text-gold-dark">· Nouveau</span>}</span></span>
              <span className={cn('grid h-6 w-6 shrink-0 place-items-center rounded-full border', on ? 'border-gold bg-gold text-ink' : 'border-ink/20 text-transparent')}><Check size={14} /></span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ───────── Rédaction + « Annoncer aux abonnés » ───────── */
function Composer({ kind, rows, audience, initial, draft, onPublished }: {
  kind: NewsKind; rows: CatalogRow[]; audience: Subscriber[]; initial: string[]; draft: Announcement | null
  onPublished: (a: Announcement) => void
}) {
  const [sel, setSel] = useState<string[]>(initial)
  const [title, setTitle] = useState(draft?.title ?? ''); const [msg, setMsg] = useState(draft?.message ?? ''); const [edited, setEdited] = useState(!!draft)
  const [busy, setBusy] = useState(false); const [err, setErr] = useState(''); const [confirm, setConfirm] = useState(false)
  useEffect(() => { setSel(initial) }, [initial])
  const items = useMemo(() => sel.map((id) => productInfo(id)).filter(Boolean).map((p) => toItem(p!)), [sel])
  useEffect(() => { if (edited) return; setTitle(items.length ? (kind === 'hebdo' ? weekTitle() : productTitle(items)) : ''); setMsg(items.length ? buildMessage(kind, items) : '') }, [items, kind, edited])
  const toggle = (id: string) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : s.length >= MAX ? s : [...s, id]))
  const nEmail = audience.filter((a) => a.email).length, nWa = audience.filter((a) => a.phone).length

  const publish = async () => {
    setErr(''); setBusy(true)
    const { data, error } = await supabase.rpc('admin_publish_announcement', { p_kind: kind, p_product_ids: sel, p_title: title.trim() || productTitle(items), p_message: msg, p_items: items, p_draft_id: draft?.id ?? null })
    if (error) { setBusy(false); return setErr(errMsg(error)) }
    const a = data as Announcement
    const r = await supabase.functions.invoke('announce-news', { body: { action: 'send', id: a.id } })
    const { data: fresh } = await supabase.from('announcements').select('*').eq('id', a.id).maybeSingle()
    setBusy(false); setConfirm(false)
    if (r.error) setErr('Annonce enregistrée, mais l’e-mail n’a pas pu partir. Réessayez depuis l’historique.')
    onPublished((fresh as Announcement) ?? a)
  }

  const only = kind === 'hebdo' ? isNewThisWeek : undefined
  const weekRows = kind === 'hebdo' ? rows.filter(isNewThisWeek) : []
  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      <Card className="min-w-0 p-5">
        <p className="mb-1 font-semibold">{kind === 'hebdo' ? '1. Articles ajoutés ces 7 derniers jours' : '1. Choisissez le ou les articles'}</p>
        <p className="mb-4 text-xs text-ink-500">{kind === 'hebdo' ? 'Décochez ceux que vous ne voulez pas mettre dans le résumé.' : `Jusqu’à ${MAX} articles par annonce.`} {sel.length > 0 && <b className="text-ink">{sel.length} sélectionné{sel.length > 1 ? 's' : ''}</b>}</p>
        {kind === 'hebdo' && !weekRows.length && !draft
          ? <Empty>Aucun nouvel article cette semaine.<br />Ajoutez-en dans <Link to="/gerant/stock" className="font-semibold underline">Stock → Nouveau produit</Link>, ou utilisez « Annoncer un produit ».</Empty>
          : <ProductPicker rows={rows} selected={sel} onToggle={toggle} only={only} />}
      </Card>
      <Card className="min-w-0 p-5">
        <div className="mb-3 flex items-center justify-between gap-3"><p className="font-semibold">2. Relisez le message</p>
          {edited && <button type="button" onClick={() => setEdited(false)} className="inline-flex items-center gap-1 text-xs font-semibold text-gold-dark hover:underline"><RefreshCw size={12} /> Texte automatique</button>}</div>
        <label className="label" htmlFor="news-title">Titre (objet de l’e-mail)</label>
        <input id="news-title" value={title} onChange={(e) => { setTitle(e.target.value); setEdited(true) }} className="mb-3 w-full rounded-xl border border-ink/15 px-3 py-2.5 text-sm outline-none focus:border-gold" placeholder="Ex. Nouveau : Sac cabas en cuir" />
        <label className="label" htmlFor="news-msg">Message WhatsApp</label>
        <textarea id="news-msg" value={msg} onChange={(e) => { setMsg(e.target.value); setEdited(true) }} rows={9} className="w-full rounded-xl border border-ink/15 px-3 py-2.5 font-mono text-[12.5px] leading-relaxed outline-none focus:border-gold" data-testid="news-msg" />
        <p className="mt-1 text-[11px] text-ink-400">« {'{prénom}'} » est remplacé par le prénom de chaque client. L’e-mail reprend les photos, prix et liens des articles.</p>
        {err && <div className="mt-3"><ErrorBox msg={err} /></div>}
        {!confirm ? (
          <button type="button" disabled={!sel.length || msg.trim().length < 10} onClick={() => setConfirm(true)} className="btn-dark mt-4 w-full disabled:opacity-40" data-testid="news-announce"><Megaphone size={16} /> Annoncer aux abonnés</button>
        ) : (
          <div className="mt-4 rounded-2xl border border-gold/40 bg-gold/10 p-4 text-sm" data-testid="news-confirm">
            <p className="font-semibold">Confirmer l’annonce ?</p>
            <ul className="mt-1.5 space-y-0.5 text-ink-600"><li>📧 E-mail automatique : <b>{nEmail}</b> abonné{nEmail > 1 ? 's' : ''}</li><li>💬 WhatsApp : <b>{nWa}</b> abonné{nWa > 1 ? 's' : ''} (vous envoyez en 1 clic chacun à l’étape suivante)</li></ul>
            <div className="mt-3 flex gap-2">
              <button type="button" onClick={publish} disabled={busy} className="btn-dark flex-1" data-testid="news-confirm-yes">{busy ? <Loader2 size={16} className="animate-spin" /> : <Send size={15} />} Oui, annoncer</button>
              <button type="button" onClick={() => setConfirm(false)} disabled={busy} className="rounded-full border border-ink/15 bg-white px-4 text-sm font-semibold">Annuler</button>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}

/* ───────── Suivi d’une annonce : e-mail + envoi WhatsApp 1 clic ───────── */
function SendPanel({ a, audience, onClose, onChange, onUnsub }: { a: Announcement; audience: Subscriber[]; onClose: () => void; onChange: (a: Announcement) => void; onUnsub: (key: string) => void }) {
  const [busy, setBusy] = useState(''); const [copied, setCopied] = useState(false); const [err, setErr] = useState('')
  const wa = audience.filter((s) => s.phone)
  const sent = wa.filter((s) => a.wa_sent.includes(s.key)).length
  const nEmail = audience.filter((s) => s.email).length
  const mark = async (key: string, on: boolean) => {
    const { data, error } = await supabase.rpc('admin_mark_announcement_wa', { p_id: a.id, p_key: key, p_sent: on })
    if (error) return setErr(errMsg(error))
    onChange({ ...a, wa_sent: (data as string[]) ?? [] })
  }
  const retryEmail = async () => {
    setBusy('mail'); setErr('')
    const r = await supabase.functions.invoke('announce-news', { body: { action: 'send', id: a.id } })
    const { data } = await supabase.from('announcements').select('*').eq('id', a.id).maybeSingle()
    setBusy(''); if (r.error) setErr('Envoi impossible pour le moment.'); if (data) onChange(data as Announcement)
  }
  const copy = async () => { try { await navigator.clipboard.writeText(personalize(a.message, null)); setCopied(true); setTimeout(() => setCopied(false), 2000) } catch { setErr('Copie impossible : sélectionnez le texte à la main.') } }
  const mail: Record<Announcement['email_status'], React.ReactNode> = {
    envoye: <><CheckCircle2 size={16} className="text-emerald-600" /> E-mail envoyé à <b>{a.email_count}</b> abonné{a.email_count > 1 ? 's' : ''}.</>,
    test: <><Mail size={16} className="text-gold-dark" /><span>Aperçu envoyé sur <b>votre e-mail</b>. Les <b>{nEmail}</b> abonnés e-mail le recevront automatiquement dès que votre domaine (yvesstore.com) sera vérifié.</span></>,
    aucun: <><Mail size={16} className="text-ink-400" /> Aucun abonné par e-mail pour le moment.</>,
    erreur: <><X size={16} className="text-red-600" /><span>L’e-mail n’est pas parti{a.email_error ? ` (${a.email_error.slice(0, 80)})` : ''}.</span></>,
    a_envoyer: <><Mail size={16} className="text-ink-400" /> E-mail pas encore envoyé.</>,
  }
  return (
    <Card className="min-w-0 p-5">
      <div data-testid="news-panel">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="flex flex-wrap items-center gap-2 text-xs text-ink-500"><Badge cls={a.kind === 'hebdo' ? 'bg-violet-100 text-violet-800' : 'bg-gold/20 text-gold-dark'}>{a.kind === 'hebdo' ? 'Résumé de la semaine' : 'Annonce produit'}</Badge>{dateTime(a.published_at ?? a.created_at)}</p>
            <h3 className="h-display mt-1.5 text-2xl">{a.title}</h3>
          </div>
          <button onClick={onClose} className="grid h-9 w-9 shrink-0 place-items-center rounded-full hover:bg-ivory-200" aria-label="Fermer"><X size={18} /></button>
        </div>
        <div className="mt-4 flex items-start gap-2 rounded-xl bg-ivory-100 p-3 text-sm" data-testid="news-mail-status">
          {mail[a.email_status]}
          {(a.email_status === 'erreur' || a.email_status === 'a_envoyer') && <button onClick={retryEmail} disabled={!!busy} className="ml-auto shrink-0 rounded-lg bg-ink px-3 py-1.5 text-xs font-bold text-ivory">{busy === 'mail' ? <Loader2 size={13} className="animate-spin" /> : 'Envoyer l’e-mail'}</button>}
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <p className="flex items-center gap-2 font-semibold"><Social.WhatsApp size={18} /> WhatsApp : {sent} / {wa.length} envoyé{sent > 1 ? 's' : ''}</p>
          <button onClick={copy} className="inline-flex items-center gap-1.5 rounded-lg border border-ink/15 bg-white px-3 py-2 text-xs font-bold hover:border-ink/40">{copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />} {copied ? 'Copié !' : 'Copier le message'}</button>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-ink/10"><div className="h-full rounded-full bg-[#25D366] transition-all" style={{ width: `${wa.length ? (sent / wa.length) * 100 : 0}%` }} /></div>
        {err && <div className="mt-3"><ErrorBox msg={err} /></div>}
        {!wa.length ? <div className="mt-4"><Empty>Aucun abonné avec un numéro WhatsApp pour le moment.</Empty></div> : (
          <ul className="mt-4 divide-y divide-ink/5 rounded-2xl border border-ink/10 bg-white">
            {wa.map((s) => {
              const done = a.wa_sent.includes(s.key)
              return (
                <li key={s.key} className="flex flex-wrap items-center gap-3 px-3 py-2.5 sm:flex-nowrap" data-testid="news-wa-row">
                  <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{s.name || 'Abonné(e)'} <span className="ml-1 text-[10px] font-bold uppercase tracking-wider text-ink-400">{s.source === 'client' ? 'client' : 'site'}</span></p><p className="text-xs text-ink-500">{phoneFr(s.phone!)}</p></div>
                  <button onClick={() => { if (confirmStop(s)) onUnsub(s.key) }} className="rounded-lg p-2 text-ink-400 hover:bg-red-50 hover:text-red-600" title="A répondu STOP : désabonner" aria-label={`Désabonner ${s.name ?? ''}`}><UserX size={15} /></button>
                  {done ? (
                    <button onClick={() => mark(s.key, false)} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-100 px-3 py-2 text-xs font-bold text-emerald-700" title="Cliquer pour annuler">✓ Envoyé</button>
                  ) : (
                    <a href={waTo(s.phone!, personalize(a.message, firstName(s.name)))} target="_blank" rel="noopener noreferrer" onClick={() => void mark(s.key, true)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[#25D366] px-3 py-2 text-xs font-bold text-white hover:bg-[#1ebe5a]" data-testid="news-wa-send"><Social.WhatsApp size={14} /> Envoyer <ExternalLink size={12} /></a>
                  )}
                </li>
              )
            })}
          </ul>
        )}
        <p className="mt-3 text-xs text-ink-400">Chaque bouton ouvre WhatsApp avec le message prêt (et le prénom du client) : il vous reste à appuyer sur « Envoyer ». Astuce : avec WhatsApp Business, « Copier le message » puis collez-le dans une <b>liste de diffusion</b> pour tout envoyer d’un coup.</p>
      </div>
    </Card>
  )
}
const confirmStop = (s: Subscriber) => window.confirm(`Désabonner ${s.name || 'cet abonné'} ? (par exemple s’il a répondu STOP)`)

/* ───────── Page ───────── */
export default function News() {
  const [sp, setSp] = useSearchParams()
  const pre = useMemo(() => (sp.get('produits') ?? '').split(',').filter(Boolean), [sp])
  const [tab, setTab] = useState<Tab>(pre.length ? 'produit' : 'produit')
  const [rows, setRows] = useState<CatalogRow[] | null>(null)
  const [audience, setAudience] = useState<Subscriber[] | null>(null)
  const [anns, setAnns] = useState<Announcement[] | null>(null)
  const [open, setOpen] = useState<Announcement | null>(null)
  const [useDraft, setUseDraft] = useState<Announcement | null>(null)
  const [err, setErr] = useState('')
  const load = useCallback(() => {
    Promise.all([fetchCatalog(), fetchAudience(), fetchAnnouncements()]).then(([r, a, n]) => { setRows(r); setAudience(a); setAnns(n) }).catch((e) => setErr(errMsg(e)))
  }, [])
  useEffect(load, [load])
  useEffect(() => { document.title = 'Nouveautés — Espace gérant' }, [])

  const draft = anns?.find((x) => x.status === 'brouillon' && x.kind === 'hebdo') ?? null
  const published = anns?.filter((x) => x.status === 'publiee') ?? []
  const weekIds = useMemo(() => (rows ?? []).filter(isNewThisWeek).slice(0, MAX).map((r) => r.id), [rows])
  const productInit = useMemo(() => pre.filter((id) => rows?.some((r) => r.id === id)), [pre, rows])
  const hebdoInit = useMemo(() => (useDraft ? useDraft.product_ids : weekIds), [useDraft, weekIds])

  const published1 = (a: Announcement) => {
    setOpen(a); setUseDraft(null); setSp({}, { replace: true })
    setAnns((l) => [a, ...(l ?? []).filter((x) => x.id !== a.id)])
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const unsub = async (key: string) => {
    const { error } = await supabase.rpc('admin_news_unsubscribe', { p_key: key })
    if (error) return setErr(errMsg(error))
    setAudience((l) => (l ?? []).filter((s) => s.key !== key))
  }

  if (err) return <ErrorBox msg={err} />
  if (!rows || !audience || !anns) return <Loading />
  const nEmail = audience.filter((a) => a.email).length, nWa = audience.filter((a) => a.phone).length

  return (
    <>
      <PageHead title="Nouveautés" sub={<>Prévenez vos clients de vos nouveaux articles : <b>e-mail automatique</b> + <b>WhatsApp en 1 clic</b>. Le résumé de la semaine est préparé chaque <b>lundi à 9 h</b>.</>} />
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Abonnés" value={audience.length} icon={<Megaphone size={18} />} tone="gold" />
        <Stat label="Par e-mail" value={nEmail} icon={<Mail size={18} />} />
        <Stat label="Par WhatsApp" value={nWa} icon={<Social.WhatsApp size={18} />} tone="green" />
        <Stat label="Annonces envoyées" value={published.length} icon={<Send size={18} />} />
      </div>

      {open && <div className="mb-6"><SendPanel a={open} audience={audience} onClose={() => setOpen(null)} onUnsub={unsub} onChange={(a) => { setOpen(a); setAnns((l) => (l ?? []).map((x) => (x.id === a.id ? a : x))) }} /></div>}

      {draft && !useDraft && (
        <div className="mb-5 flex flex-wrap items-center gap-3 rounded-2xl border border-violet-200 bg-violet-50 p-4 text-sm" data-testid="news-draft">
          <span className="text-xl">🗓️</span>
          <p className="min-w-0 flex-1"><b>Résumé de la semaine prêt</b> ({draft.product_ids.length} article{draft.product_ids.length > 1 ? 's' : ''}) — préparé le {dateTime(draft.created_at)}. Il n’est pas encore envoyé.</p>
          <button onClick={() => { setUseDraft(draft); setTab('hebdo') }} className="rounded-lg bg-ink px-3.5 py-2 text-xs font-bold text-ivory">Relire et envoyer</button>
        </div>
      )}

      <div className="mb-5"><Pills value={tab} onChange={(t) => setTab(t)} options={[
        { id: 'produit', label: 'Annoncer un produit' },
        { id: 'hebdo', label: 'Résumé de la semaine', count: draft ? draft.product_ids.length : weekIds.length },
        { id: 'historique', label: 'Historique', count: published.length },
        { id: 'abonnes', label: 'Abonnés', count: audience.length },
      ]} /></div>

      {tab === 'produit' && <Composer key="p" kind="produit" rows={rows} audience={audience} initial={productInit} draft={null} onPublished={published1} />}
      {tab === 'hebdo' && <Composer key={`h${useDraft?.id ?? ''}`} kind="hebdo" rows={rows} audience={audience} initial={hebdoInit} draft={useDraft} onPublished={published1} />}

      {tab === 'historique' && (published.length === 0 ? <Empty>Aucune annonce envoyée pour le moment.</Empty> : (
        <div className="space-y-2.5">
          {published.map((a) => {
            const wa = audience.filter((s) => s.phone); const sent = wa.filter((s) => a.wa_sent.includes(s.key)).length
            return (
              <button key={a.id} onClick={() => { setOpen(a); window.scrollTo({ top: 0, behavior: 'smooth' }) }} className="flex w-full flex-wrap items-center gap-3 rounded-2xl border border-ink/10 bg-white p-4 text-left hover:border-ink/30" data-testid="news-history-row">
                <span className="text-xl">{a.kind === 'hebdo' ? '🗓️' : '✨'}</span>
                <span className="min-w-0 flex-1"><span className="block truncate font-semibold">{a.title}</span><span className="text-xs text-ink-500">{dateTime(a.published_at ?? a.created_at)} · {a.product_ids.length} article{a.product_ids.length > 1 ? 's' : ''}</span></span>
                <Badge cls={a.email_status === 'envoye' ? 'bg-emerald-100 text-emerald-700' : a.email_status === 'erreur' ? 'bg-red-100 text-red-700' : 'bg-ivory-200 text-ink-600'}>📧 {a.email_status === 'envoye' ? `${a.email_count} envoyés` : a.email_status === 'test' ? 'aperçu' : a.email_status === 'erreur' ? 'erreur' : '—'}</Badge>
                <Badge cls={sent && sent === wa.length ? 'bg-emerald-100 text-emerald-700' : 'bg-[#25D366]/15 text-[#128C4B]'}>💬 {sent}/{wa.length}</Badge>
              </button>
            )
          })}
        </div>
      ))}

      {tab === 'abonnes' && (
        <>
          <div className="mb-3 flex justify-end"><button onClick={() => downloadCsv('abonnes-nouveautes', [['Nom', 'E-mail', 'WhatsApp', 'Origine', 'Depuis'], ...audience.map((s) => [s.name, s.email, s.phone, s.source === 'client' ? 'Client inscrit' : 'Formulaire du site', s.since.slice(0, 10)])])} className="inline-flex items-center gap-1.5 rounded-lg border border-ink/15 bg-white px-3 py-2 text-xs font-bold"><Download size={14} /> Exporter (Excel)</button></div>
          {audience.length === 0 ? <Empty>Aucun abonné pour le moment. Les clients s’abonnent à l’inscription, dans « Mon compte », ou en bas de chaque page du site.</Empty> : (
            <ul className="divide-y divide-ink/5 rounded-2xl border border-ink/10 bg-white" data-testid="news-subs">
              {audience.map((s) => (
                <li key={s.key} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{s.name || 'Abonné(e)'}</p><p className="truncate text-xs text-ink-500">{[s.email, s.phone && phoneFr(s.phone)].filter(Boolean).join(' · ')}</p></div>
                  <Badge cls={s.source === 'client' ? 'bg-sky-100 text-sky-800' : 'bg-ivory-200 text-ink-600'}>{s.source === 'client' ? 'Client inscrit' : 'Formulaire du site'}</Badge>
                  <button onClick={() => { if (confirmStop(s)) void unsub(s.key) }} className="rounded-lg p-2 text-ink-400 hover:bg-red-50 hover:text-red-600" aria-label="Désabonner"><UserX size={15} /></button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </>
  )
}
