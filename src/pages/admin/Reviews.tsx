import { BadgeCheck, Eye, EyeOff, Loader2, MessageSquareReply, Star } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { allProducts } from '../../lib/catalog'
import { cn } from '../../lib/format'
import { refreshReviewStats } from '../../lib/reviews'
import { supabase } from '../../lib/supabase'
import { Badge, Empty, ErrorBox, errMsg, Loading, PageHead, Pills, SearchInput, Stat, dateTime } from './shared'

export interface AdminReview {
  id: number; product_id: string; product_name: string; author: string; rating: number; title: string | null; comment: string
  status: 'publie' | 'masque'; reply: string | null; replied_at: string | null; created_at: string; seen: boolean; verified: boolean
}
type F = 'tous' | 'a_lire' | 'negatifs' | 'sans_reponse' | 'masques'
export async function fetchAdminReviews() {
  const { data, error } = await supabase.rpc('admin_list_reviews')
  if (error) throw new Error(error.message)
  return (data ?? []) as AdminReview[]
}
const Stars = ({ n }: { n: number }) => <span className="inline-flex gap-0.5" aria-label={`${n} étoiles sur 5`}>{[1, 2, 3, 4, 5].map((i) => <Star key={i} size={13} className={i <= n ? 'fill-gold text-gold' : 'text-ink/15'} />)}</span>
const TEMPLATES = [
  'Merci beaucoup pour votre avis et votre confiance ! À très bientôt chez YVES STORE 🙏',
  'Merci pour votre retour. Nous sommes désolés de ce désagrément : écrivez-nous sur WhatsApp au 01 40 81 04 15, nous allons trouver une solution ensemble.',
]

function ReviewCard({ r, onChanged }: { r: AdminReview; onChanged: (p: Partial<AdminReview>) => void }) {
  const [replying, setReplying] = useState(false)
  const [text, setText] = useState(r.reply ?? '')
  const [busy, setBusy] = useState('')
  const [err, setErr] = useState('')
  const slug = allProducts.find((p) => p.id === r.product_id)?.slug
  const act = async (key: string, args: { p_status?: string; p_reply?: string }, patch: Partial<AdminReview>) => {
    setBusy(key); setErr('')
    const { error } = await supabase.rpc('admin_review_action', { p_id: r.id, p_status: args.p_status ?? null, p_reply: args.p_reply ?? null })
    setBusy('')
    if (error) return setErr(errMsg(error))
    onChanged({ ...patch, seen: true }); void refreshReviewStats()
  }
  return (
    <article className={cn('rounded-2xl border bg-white p-4 sm:p-5', !r.seen ? 'border-gold/50 shadow-sm' : 'border-ink/10', r.status === 'masque' && 'opacity-70')} data-testid="admin-review">
      <div className="flex flex-wrap items-center gap-2">
        <Stars n={r.rating} />
        {!r.seen && <Badge cls="bg-gold text-ink">Nouveau</Badge>}
        {r.rating <= 2 && <Badge cls="bg-red-100 text-red-700">Avis négatif</Badge>}
        {r.verified && <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700"><BadgeCheck size={13} /> Achat vérifié</span>}
        {r.status === 'masque' && <Badge cls="bg-ink/10 text-ink-600">Masqué du site</Badge>}
        <span className="ml-auto text-xs text-ink-400">{dateTime(r.created_at)}</span>
      </div>
      <p className="mt-2 text-sm"><b>{r.author}</b> <span className="text-ink-400">sur</span> {slug ? <Link to={`/produit/${slug}#avis`} target="_blank" className="font-semibold underline-offset-4 hover:underline">{r.product_name}</Link> : <b>{r.product_name}</b>}</p>
      {r.title && <p className="mt-2 font-semibold">« {r.title} »</p>}
      <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-ink-700">{r.comment}</p>
      {r.reply && !replying && (
        <div className="mt-3 rounded-xl border-l-4 border-gold bg-ivory-200/60 px-3 py-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-gold-dark">Votre réponse publiée {r.replied_at && `· ${dateTime(r.replied_at)}`}</p>
          <p className="mt-1 whitespace-pre-line text-sm">{r.reply}</p>
        </div>
      )}
      {replying && (
        <div className="mt-3">
          <div className="mb-2 flex flex-wrap gap-1.5">{TEMPLATES.map((t, i) => <button key={i} type="button" onClick={() => setText(t)} className="rounded-full border border-gold/40 bg-gold/5 px-2.5 py-1 text-[11px] font-semibold text-gold-dark hover:bg-gold/15">{i === 0 ? 'Remerciement' : 'Excuses + WhatsApp'}</button>)}</div>
          <textarea value={text} onChange={(e) => setText(e.target.value.slice(0, 600))} rows={3} className="w-full rounded-xl border border-ink/15 p-3 text-sm outline-none focus:border-gold" placeholder="Votre réponse, visible par tous sous l’avis…" aria-label="Réponse" />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button type="button" disabled={!!busy || text.trim().length < 2} onClick={() => void act('reply', { p_reply: text.trim() }, { reply: text.trim(), replied_at: new Date().toISOString() }).then(() => setReplying(false))} className="inline-flex items-center gap-1.5 rounded-lg bg-ink px-3.5 py-2 text-xs font-bold text-ivory hover:bg-gold hover:text-ink disabled:opacity-40" data-testid="review-reply-send">
              {busy === 'reply' ? <Loader2 size={13} className="animate-spin" /> : <MessageSquareReply size={13} />} Publier la réponse
            </button>
            {r.reply && <button type="button" onClick={() => void act('reply', { p_reply: '' }, { reply: null, replied_at: null }).then(() => { setReplying(false); setText('') })} className="text-xs font-semibold text-red-600 hover:underline">Supprimer la réponse</button>}
            <button type="button" onClick={() => setReplying(false)} className="text-xs text-ink-400 hover:text-ink">Annuler</button>
            <span className="ml-auto text-[11px] text-ink-400">{text.length} / 600</span>
          </div>
        </div>
      )}
      {!replying && (
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" onClick={() => { setText(r.reply ?? ''); setReplying(true) }} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold text-gold-dark ring-1 ring-gold/40 hover:bg-gold/10" data-testid="review-reply-open"><MessageSquareReply size={13} /> {r.reply ? 'Modifier la réponse' : 'Répondre'}</button>
          {r.status === 'publie'
            ? <button type="button" disabled={!!busy} onClick={() => void act('hide', { p_status: 'masque' }, { status: 'masque' })} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold text-ink-600 ring-1 ring-ink/15 hover:ring-ink">{busy === 'hide' ? <Loader2 size={13} className="animate-spin" /> : <EyeOff size={13} />} Masquer</button>
            : <button type="button" disabled={!!busy} onClick={() => void act('show', { p_status: 'publie' }, { status: 'publie' })} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold text-emerald-700 ring-1 ring-emerald-200 hover:bg-emerald-50">{busy === 'show' ? <Loader2 size={13} className="animate-spin" /> : <Eye size={13} />} Republier</button>}
          {!r.seen && <button type="button" disabled={!!busy} onClick={() => void act('seen', {}, {})} className="rounded-lg px-3 py-1.5 text-xs font-semibold text-ink-400 hover:text-ink">Marquer comme lu</button>}
        </div>
      )}
      {err && <p className="mt-2 text-xs font-medium text-red-600">{err}</p>}
    </article>
  )
}

export default function Reviews({ onChange }: { onChange?: () => void }) {
  const [rows, setRows] = useState<AdminReview[] | null>(null)
  const [err, setErr] = useState('')
  const [f, setF] = useState<F>('tous')
  const [q, setQ] = useState('')
  const load = useCallback(() => { fetchAdminReviews().then((r) => { setRows(r); setErr('') }).catch((e) => setErr(errMsg(e))) }, [])
  useEffect(load, [load])

  const pub = (rows ?? []).filter((r) => r.status === 'publie')
  const avg = pub.length ? pub.reduce((a, r) => a + r.rating, 0) / pub.length : 0
  const counts = {
    tous: rows?.length ?? 0, a_lire: (rows ?? []).filter((r) => !r.seen).length, negatifs: (rows ?? []).filter((r) => r.rating <= 2).length,
    sans_reponse: (rows ?? []).filter((r) => !r.reply && r.status === 'publie').length, masques: (rows ?? []).filter((r) => r.status === 'masque').length,
  }
  const list = useMemo(() => {
    const s = q.trim().toLowerCase()
    return (rows ?? []).filter((r) => (f === 'tous' || (f === 'a_lire' && !r.seen) || (f === 'negatifs' && r.rating <= 2) || (f === 'sans_reponse' && !r.reply && r.status === 'publie') || (f === 'masques' && r.status === 'masque'))
      && (!s || `${r.product_name} ${r.author} ${r.comment} ${r.title ?? ''}`.toLowerCase().includes(s)))
  }, [rows, f, q])
  const patch = (id: number) => (p: Partial<AdminReview>) => { setRows((rs) => rs?.map((x) => (x.id === id ? { ...x, ...p } : x)) ?? null); onChange?.() }
  const markAll = async () => { await supabase.rpc('admin_mark_reviews_seen'); setRows((rs) => rs?.map((x) => ({ ...x, seen: true })) ?? null); onChange?.() }

  if (err) return <ErrorBox msg={err} />
  return (
    <>
      <PageHead title="Avis clients" sub={<>Les avis sont publiés <b>immédiatement</b> sur la fiche produit. Vous recevez un e-mail à chaque nouvel avis. Répondez publiquement ou masquez un avis abusif.</>}
        actions={counts.a_lire > 0 ? <button type="button" onClick={markAll} className="rounded-full border border-ink/15 bg-white px-4 py-2 text-xs font-semibold hover:border-ink">Tout marquer comme lu</button> : undefined} />
      {rows && (
        <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="Note moyenne" value={pub.length ? `${avg.toFixed(1).replace('.', ',')} / 5` : '—'} tone="gold" />
          <Stat label="Avis publiés" value={pub.length} />
          <Stat label="À lire" value={counts.a_lire} tone={counts.a_lire ? 'orange' : 'default'} />
          <Stat label="Sans réponse" value={counts.sans_reponse} hint={counts.negatifs ? `${counts.negatifs} négatif${counts.negatifs > 1 ? 's' : ''} (1–2 ★)` : undefined} tone={counts.negatifs ? 'red' : 'default'} />
        </div>
      )}
      <div className="mb-4 flex flex-wrap items-center gap-3"><SearchInput value={q} onChange={setQ} placeholder="Rechercher (article, client, mot)…" /></div>
      <div className="mb-5"><Pills value={f} onChange={setF} options={[{ id: 'tous', label: 'Tous', count: counts.tous }, { id: 'a_lire', label: 'À lire', count: counts.a_lire }, { id: 'negatifs', label: 'Négatifs', count: counts.negatifs }, { id: 'sans_reponse', label: 'Sans réponse', count: counts.sans_reponse }, { id: 'masques', label: 'Masqués', count: counts.masques }]} /></div>
      {!rows ? <Loading /> : list.length === 0 ? <Empty>{rows.length ? 'Aucun avis dans ce filtre.' : 'Aucun avis pour le moment. Ils apparaîtront ici dès qu’un client notera un article.'}</Empty> : (
        <div className="space-y-3">{list.map((r) => <ReviewCard key={r.id} r={r} onChanged={patch(r.id)} />)}</div>
      )}
    </>
  )
}
