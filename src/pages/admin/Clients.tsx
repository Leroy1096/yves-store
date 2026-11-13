import { Ban, Crown, Download, Loader2, Mail, MapPin, Phone, RefreshCw, ShieldCheck, ShoppingBag, Trash2, Unlock } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Social } from '../../components/ui'
import { formatPhone, initials } from '../../lib/auth-utils'
import { cn, fcfa } from '../../lib/format'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../store/auth'
import { Badge, Card, dateOnly, dateTime, downloadCsv, Empty, ErrorBox, errMsg, fetchClients, Loading, PageHead, Pills, SearchInput, Stat, type Client } from './shared'

type Filter = 'tous' | 'acheteurs' | 'sans' | 'bloques' | 'gerants'
const fullName = (c: Client) => `${c.first_name ?? ''} ${c.last_name ?? ''}`.trim() || 'Sans nom'
const waNumber = (c: Client) => c.contact_phone ?? c.phone

function ClientCard({ c, me, onChanged, onDeleted }: { c: Client; me: boolean; onChanged: (p: Partial<Client>) => void; onDeleted: () => void }) {
  const [busy, setBusy] = useState('')
  const [err, setErr] = useState('')
  const [confirmDel, setConfirmDel] = useState(false)
  const run = async (key: string, fn: () => PromiseLike<{ error: { message: string } | null }>, patch?: Partial<Client>) => {
    setBusy(key); setErr('')
    const { error } = await fn()
    setBusy('')
    if (error) return setErr(errMsg(error))
    if (key === 'delete') onDeleted(); else if (patch) onChanged(patch)
  }
  const wa = waNumber(c)
  return (
    <Card className={cn('p-4 sm:p-5', c.blocked && 'border-red-200 bg-red-50/30')}>
      <div className="flex flex-wrap items-start gap-4">
        <span className={cn('grid h-12 w-12 shrink-0 place-items-center rounded-full text-sm font-bold', c.is_admin ? 'bg-ink text-gold-light' : 'bg-gradient-to-br from-gold-light to-gold-dark text-ink')}>{initials(c.first_name ?? undefined, c.last_name ?? undefined)}</span>
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2 font-semibold">
            {fullName(c)}
            {c.is_admin && <Badge cls="bg-ink text-gold-light"><Crown size={11} className="mr-1" />Gérant</Badge>}
            {c.blocked && <Badge cls="bg-red-100 text-red-700">Bloqué</Badge>}
            {me && <Badge cls="bg-gold/15 text-gold-dark">Vous</Badge>}
          </p>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-500">
            {c.email && <span className="flex items-center gap-1"><Mail size={12} />{c.email}</span>}
            {c.phone && <span className="flex items-center gap-1"><Phone size={12} />{formatPhone(c.phone)}</span>}
            {c.contact_phone && c.contact_phone !== c.phone && <span className="flex items-center gap-1"><Social.WhatsApp size={12} />{formatPhone(c.contact_phone)}</span>}
            {(c.city || c.commune) && <span className="flex items-center gap-1"><MapPin size={12} />{[c.commune, c.city].filter(Boolean).join(', ')}</span>}
          </div>
          <p className="mt-1 text-xs text-ink-400">Inscrit le {dateOnly(c.created_at)} · par {c.signup_method === 'phone' ? 'téléphone' : 'e-mail'} · dernière connexion : {c.last_sign_in_at ? dateTime(c.last_sign_in_at) : 'jamais'}</p>
        </div>
        <div className="text-right">
          <p className="font-display text-xl font-semibold tabular-nums">{fcfa(c.total_spent)}</p>
          <p className="text-xs text-ink-400">{c.orders_count} commande{c.orders_count > 1 ? 's' : ''}{c.last_order_at ? ` · dernière le ${dateOnly(c.last_order_at)}` : ''}</p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {c.orders_count > 0 && <Link to={`/gerant/commandes?client=${c.id}`} className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-xs font-semibold ring-1 ring-ink/15 hover:ring-ink"><ShoppingBag size={13} /> Ses commandes</Link>}
        {wa && <a href={`https://wa.me/${wa.replace(/\D/g, '')}?text=${encodeURIComponent(`Bonjour ${c.first_name ?? ''} 👋\n\n`)}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-full bg-[#25D366] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#1ebe5a]"><Social.WhatsApp size={13} /> WhatsApp</a>}
        {!me && !c.is_admin && (c.blocked ? (
          <button onClick={() => run('block', () => supabase.rpc('admin_set_client_blocked', { p_user: c.id, p_blocked: false }), { blocked: false })} className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200 hover:bg-emerald-50">
            {busy === 'block' ? <Loader2 size={13} className="animate-spin" /> : <Unlock size={13} />} Débloquer
          </button>
        ) : (
          <button onClick={() => run('block', () => supabase.rpc('admin_set_client_blocked', { p_user: c.id, p_blocked: true }), { blocked: true })} className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-xs font-semibold text-orange-700 ring-1 ring-orange-200 hover:bg-orange-50">
            {busy === 'block' ? <Loader2 size={13} className="animate-spin" /> : <Ban size={13} />} Bloquer
          </button>
        ))}
        {/* « Nommer gérant » retiré des fiches clients : seul le retrait des droits reste, sur les fiches gérant */}
        {!me && c.is_admin && (
          <button onClick={() => run('admin', () => supabase.rpc('admin_set_admin', { p_user: c.id, p_admin: !c.is_admin }), { is_admin: !c.is_admin })} className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-xs font-semibold ring-1 ring-ink/15 hover:ring-ink">
            {busy === 'admin' ? <Loader2 size={13} className="animate-spin" /> : <ShieldCheck size={13} />} Retirer les droits gérant
          </button>
        )}
        {!me && !c.is_admin && (confirmDel ? (
          <span className="inline-flex flex-wrap items-center gap-2 rounded-full bg-red-50 px-3 py-1 text-xs text-red-800">
            Supprimer définitivement l’inscription ?
            <button onClick={() => run('delete', () => supabase.rpc('admin_delete_client', { p_user: c.id }))} className="rounded-full bg-red-600 px-3 py-1 font-bold text-white hover:bg-red-700">{busy === 'delete' ? '…' : 'Oui, supprimer'}</button>
            <button onClick={() => setConfirmDel(false)} className="font-semibold underline">Non</button>
          </span>
        ) : (
          <button onClick={() => setConfirmDel(true)} className="ml-auto inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-ink-400 hover:text-red-600"><Trash2 size={13} /> Supprimer l’inscription</button>
        ))}
      </div>
      {confirmDel && <p className="mt-2 text-xs text-ink-400">Le compte et le profil sont supprimés. Ses commandes restent dans l’historique (sans compte).</p>}
      {err && <p className="mt-2 text-xs font-medium text-red-600">{err}</p>}
    </Card>
  )
}

export default function Clients() {
  const me = useAuth((s) => s.user?.id)
  const [clients, setClients] = useState<Client[] | null>(null)
  const [err, setErr] = useState('')
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<Filter>('tous')
  const [loading, setLoading] = useState(false)
  const load = useCallback(() => {
    setLoading(true)
    fetchClients().then(setClients).catch((e) => setErr(errMsg(e))).finally(() => setLoading(false))
  }, [])
  useEffect(load, [load])

  const stats = useMemo(() => {
    const cs = clients ?? []
    const monthAgo = Date.now() - 30 * 86400000
    return { total: cs.length, buyers: cs.filter((c) => c.orders_count > 0).length, month: cs.filter((c) => new Date(c.created_at).getTime() > monthAgo).length, blocked: cs.filter((c) => c.blocked).length, admins: cs.filter((c) => c.is_admin).length }
  }, [clients])
  const list = useMemo(() => {
    const s = q.trim().toLowerCase(); const d = s.replace(/\D/g, '')
    return (clients ?? []).filter((c) =>
      (filter === 'tous' || (filter === 'acheteurs' && c.orders_count > 0) || (filter === 'sans' && c.orders_count === 0) || (filter === 'bloques' && c.blocked) || (filter === 'gerants' && c.is_admin)) &&
      (!s || fullName(c).toLowerCase().includes(s) || (c.email ?? '').toLowerCase().includes(s) || (c.city ?? '').toLowerCase().includes(s) ||
        (d.length >= 4 && `${c.phone ?? ''} ${c.contact_phone ?? ''}`.replace(/\D/g, '').includes(d))))
  }, [clients, q, filter])

  const exportCsv = () => downloadCsv(`clients-yves-store-${new Date().toISOString().slice(0, 10)}.csv`, [
    ['Prénom', 'Nom', 'E-mail', 'Téléphone', 'WhatsApp', 'Ville', 'Commune', 'Inscrit le', 'Commandes', 'Total dépensé (FCFA)', 'Statut'],
    ...list.map((c) => [c.first_name, c.last_name, c.email, c.phone ? formatPhone(c.phone) : '', c.contact_phone ? formatPhone(c.contact_phone) : '', c.city, c.commune, new Date(c.created_at).toLocaleDateString('fr-FR'), c.orders_count, c.total_spent, c.is_admin ? 'Gérant' : c.blocked ? 'Bloqué' : 'Actif']),
  ])

  if (err) return <ErrorBox msg={err} />
  return (
    <>
      <PageHead title="Clients inscrits" sub="Toutes les personnes inscrites sur le site."
        actions={<>
          <button onClick={exportCsv} className="inline-flex items-center gap-1.5 rounded-full border border-ink/15 bg-white px-4 py-2 text-xs font-semibold hover:border-ink"><Download size={14} /> Exporter (Excel)</button>
          <button onClick={load} className="inline-flex items-center gap-1.5 rounded-full border border-ink/15 bg-white px-4 py-2 text-xs font-semibold hover:border-ink"><RefreshCw size={14} className={cn(loading && 'animate-spin')} /> Actualiser</button>
        </>} />
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Inscrits" value={stats.total} />
        <Stat label="Ont commandé" value={stats.buyers} hint={stats.total ? `${Math.round((stats.buyers / stats.total) * 100)} % des inscrits` : undefined} />
        <Stat label="Nouveaux (30 j)" value={stats.month} />
        <Stat label="Bloqués" value={stats.blocked} tone="red" />
      </div>
      <div className="mb-4 flex flex-wrap items-center gap-3"><SearchInput value={q} onChange={setQ} placeholder="Nom, e-mail, téléphone ou ville…" /></div>
      <div className="mb-5"><Pills value={filter} onChange={setFilter} options={[
        { id: 'tous', label: 'Tous', count: stats.total }, { id: 'acheteurs', label: 'Ont commandé', count: stats.buyers },
        { id: 'sans', label: 'Sans commande', count: stats.total - stats.buyers }, { id: 'bloques', label: 'Bloqués', count: stats.blocked }, { id: 'gerants', label: 'Gérants', count: stats.admins },
      ]} /></div>
      {!clients ? <Loading /> : list.length === 0 ? <Empty>Aucun inscrit {q ? `pour « ${q} »` : 'dans cette catégorie'}.</Empty> : (
        <div className="space-y-3">
          {list.map((c) => <ClientCard key={c.id} c={c} me={c.id === me}
            onChanged={(p) => setClients((cs) => cs?.map((x) => (x.id === c.id ? { ...x, ...p } : x)) ?? null)}
            onDeleted={() => setClients((cs) => cs?.filter((x) => x.id !== c.id) ?? null)} />)}
        </div>
      )}
    </>
  )
}
