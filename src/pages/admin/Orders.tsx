import { Ban, ChevronDown, Download, Loader2, MapPin, Phone, RefreshCw, Truck } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Img, Social } from '../../components/ui'
import { cn, fcfa, SHIPPING, type ShippingId } from '../../lib/format'
import { CANCEL_REASONS } from '../../lib/orders'
import { supabase } from '../../lib/supabase'
import {
  Badge, Card, customerName, dateTime, downloadCsv, Empty, ErrorBox, errMsg, fetchOrders, Loading, ORDER_STATUS, orderWaLink, PageHead, Pills, productInfo, SearchInput,
  type AdminOrder,
} from './shared'

type Filter = 'tous' | 'confirmee' | 'preparation' | 'expediee' | 'livree' | 'annulee'
const FLOW = ['confirmee', 'preparation', 'expediee', 'livree'] as const
const ADMIN_REASONS = ['Article en rupture de stock', 'Client injoignable', 'Demande du client', 'Adresse de livraison introuvable', 'Commande en double', ...CANCEL_REASONS.filter((r) => r !== 'Autre raison')]

function OrderRow({ o, onUpdated }: { o: AdminOrder; onUpdated: (o: AdminOrder) => void }) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState('')
  const [err, setErr] = useState('')
  const [cancelOpen, setCancelOpen] = useState(false)
  const [reason, setReason] = useState(ADMIN_REASONS[0])
  const st = ORDER_STATUS[o.status] ?? ORDER_STATUS.confirmee
  const count = o.lines.reduce((a, l) => a + l.qty, 0)
  const waTrack = orderWaLink(o, o.status === 'annulee' ? 'order_cancel' : 'order_tracking')

  const update = async (status: string, why?: string) => {
    setBusy(status); setErr('')
    const { data, error } = await supabase.rpc('admin_update_order', { p_order: o.id, p_status: status, p_reason: why ?? null })
    setBusy('')
    if (error) return setErr(errMsg(error))
    onUpdated(data as AdminOrder); setCancelOpen(false)
  }

  return (
    <Card className={cn('overflow-hidden', o.status === 'confirmee' && 'border-sky-200')}>
      <button onClick={() => setOpen(!open)} className="flex w-full flex-wrap items-center gap-x-4 gap-y-2 p-4 text-left sm:flex-nowrap">
        <div className="flex shrink-0 -space-x-2.5">
          {o.lines.slice(0, 3).map((l, i) => { const img = l.image ?? productInfo(l.id)?.images[0]; return img ? <Img key={i} src={img} alt="" className="h-11 w-9 rounded-md border-2 border-white object-cover" /> : <span key={i} className="h-11 w-9 rounded-md border-2 border-white bg-ivory-200" /> })}
        </div>
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2 font-semibold">{o.id} <Badge cls={st.cls}>{st.label}</Badge>{!o.user_id && <Badge cls="bg-ink/5 text-ink-500">Sans compte</Badge>}</p>
          <p className="truncate text-xs text-ink-400">{customerName(o)} · {o.customer?.phone} · {dateTime(o.created_at)} · {count} article{count > 1 ? 's' : ''}</p>
        </div>
        <span className="font-display text-xl font-semibold tabular-nums">{fcfa(o.total)}</span>
        <ChevronDown size={18} className={cn('shrink-0 text-ink-400 transition', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="border-t border-ink/10 bg-ivory-100/50 p-4 sm:p-5">
          <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
            <div>
              <ul className="divide-y divide-ink/5 rounded-xl bg-white px-3">
                {o.lines.map((l, i) => (
                  <li key={i} className="flex items-center gap-3 py-2.5 text-sm">
                    <span className="flex-1"><b className="font-semibold">{l.name}</b> <span className="text-ink-400">{[l.color, l.size, ...Object.values(l.options ?? {})].filter(Boolean).join(' · ')}</span></span>
                    <span className="text-ink-500">{l.qty} × {fcfa(l.price)}</span>
                    <span className="w-24 text-right font-semibold tabular-nums">{fcfa(l.qty * l.price)}</span>
                  </li>
                ))}
              </ul>
              <dl className="mt-3 grid gap-1 text-sm sm:ml-auto sm:w-72">
                <div className="flex justify-between"><dt className="text-ink-500">Sous-total</dt><dd>{fcfa(o.subtotal)}</dd></div>
                {o.discount > 0 && <div className="flex justify-between text-gold-dark"><dt>Réduction</dt><dd>−{fcfa(o.discount)}</dd></div>}
                <div className="flex justify-between"><dt className="text-ink-500">Livraison</dt><dd>{o.shipping_cost ? fcfa(o.shipping_cost) : 'Offerte'}</dd></div>
                <div className="flex justify-between border-t border-ink/10 pt-1 font-semibold"><dt>Total</dt><dd>{fcfa(o.total)}</dd></div>
              </dl>
            </div>
            <div className="space-y-3 text-sm">
              <div className="rounded-xl bg-white p-3.5">
                <p className="font-semibold">{customerName(o)}</p>
                {o.customer?.phone && <a href={`tel:${o.customer.phone.replace(/\s/g, '')}`} className="mt-1 flex items-center gap-2 text-ink-500 hover:text-gold-dark"><Phone size={14} /> {o.customer.phone}</a>}
                {o.customer?.email && <p className="mt-0.5 text-xs text-ink-400">{o.customer.email}</p>}
                <p className="mt-2 flex items-start gap-2 text-ink-500"><MapPin size={14} className="mt-0.5 shrink-0" />{o.shipping === 'retrait' ? 'Retrait en boutique' : [o.address?.details, o.address?.commune, o.address?.city].filter(Boolean).join(', ')}</p>
                <p className="mt-1 flex items-center gap-2 text-ink-500"><Truck size={14} /> {SHIPPING[o.shipping as ShippingId]?.label ?? o.shipping}</p>
                <p className="mt-1 text-ink-500">💳 {o.payment}</p>
              </div>
              {o.status === 'annulee' && <p className="rounded-xl bg-red-50 p-3 text-xs text-red-700">Annulée le {o.cancelled_at ? dateTime(o.cancelled_at) : '—'}{o.cancel_reason ? ` — ${o.cancel_reason}` : ''}. Les articles ont été remis en stock.</p>}
            </div>
          </div>

          {o.status !== 'annulee' && (
            <div className="mt-5">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink-500">Changer le statut</p>
              <div className="flex flex-wrap gap-2">
                {FLOW.map((s) => (
                  <button key={s} disabled={!!busy || o.status === s} onClick={() => update(s)}
                    className={cn('inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition disabled:cursor-default', o.status === s ? 'bg-ink text-ivory' : 'bg-white ring-1 ring-ink/15 hover:ring-ink')}>
                    {busy === s && <Loader2 size={13} className="animate-spin" />}{ORDER_STATUS[s].label}
                  </button>
                ))}
                <button onClick={() => setCancelOpen(!cancelOpen)} className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold text-red-600 ring-1 ring-red-200 hover:bg-red-50"><Ban size={13} /> Annuler la commande</button>
              </div>
              {cancelOpen && (
                <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-red-200 bg-red-50/60 p-3">
                  <span className="text-sm font-semibold text-red-800">Raison :</span>
                  <select value={reason} onChange={(e) => setReason(e.target.value)} className="rounded-lg border border-red-200 bg-white px-3 py-2 text-sm">
                    {ADMIN_REASONS.map((r) => <option key={r}>{r}</option>)}
                  </select>
                  <button onClick={() => update('annulee', reason)} disabled={!!busy} className="inline-flex items-center gap-1.5 rounded-full bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700">
                    {busy === 'annulee' ? <Loader2 size={13} className="animate-spin" /> : <Ban size={13} />} Confirmer l’annulation
                  </button>
                  <span className="w-full text-xs text-red-700/80">Les articles seront automatiquement remis en stock.</span>
                </div>
              )}
            </div>
          )}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {waTrack ? (
              <a href={waTrack} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full bg-[#25D366] px-4 py-2 text-xs font-bold text-white hover:bg-[#1ebe5a]">
                <Social.WhatsApp size={14} /> {o.status === 'annulee' ? 'Prévenir le client de l’annulation' : `Envoyer le statut « ${st.label} » au client`}
              </a>
            ) : <span className="text-xs text-ink-400">Numéro du client invalide : envoi WhatsApp impossible.</span>}
          </div>
          {err && <p className="mt-2 text-xs font-medium text-red-600">{err}</p>}
        </div>
      )}
    </Card>
  )
}

export default function Orders({ onChange }: { onChange?: () => void }) {
  const [orders, setOrders] = useState<AdminOrder[] | null>(null)
  const [err, setErr] = useState('')
  const [sp, setSp] = useSearchParams()
  const [q, setQ] = useState(sp.get('q') ?? '')
  const [filter, setFilter] = useState<Filter>('tous')
  const client = sp.get('client')
  const [loading, setLoading] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    fetchOrders().then(setOrders).catch((e) => setErr(errMsg(e))).finally(() => setLoading(false))
  }, [])
  useEffect(load, [load])

  const counts = useMemo(() => {
    const c: Record<string, number> = { tous: orders?.length ?? 0 }
    orders?.forEach((o) => { c[o.status] = (c[o.status] ?? 0) + 1 })
    return c
  }, [orders])
  const list = useMemo(() => {
    const s = q.trim().toLowerCase()
    const digits = s.replace(/\D/g, '')
    return (orders ?? []).filter((o) =>
      (filter === 'tous' || o.status === filter) && (!client || o.user_id === client) &&
      (!s || o.id.toLowerCase().includes(s) || customerName(o).toLowerCase().includes(s) || (digits.length >= 4 && (o.customer?.phone ?? '').replace(/\D/g, '').includes(digits))))
  }, [orders, q, filter, client])

  const exportCsv = () => downloadCsv(`commandes-yves-store-${new Date().toISOString().slice(0, 10)}.csv`, [
    ['N°', 'Date', 'Client', 'Téléphone', 'Ville', 'Commune', 'Livraison', 'Paiement', 'Articles', 'Sous-total', 'Réduction', 'Frais livraison', 'Total', 'Statut'],
    ...list.map((o) => [o.id, new Date(o.created_at).toLocaleString('fr-FR'), customerName(o), o.customer?.phone, o.address?.city, o.address?.commune, SHIPPING[o.shipping as ShippingId]?.label ?? o.shipping, o.payment,
      o.lines.map((l) => `${l.qty}x ${l.name}`).join(' | '), o.subtotal, o.discount, o.shipping_cost, o.total, ORDER_STATUS[o.status]?.label]),
  ])

  if (err) return <ErrorBox msg={err} />
  return (
    <>
      <PageHead title="Commandes" sub="Toutes les commandes du site, avec ou sans compte client."
        actions={<>
          <button onClick={exportCsv} className="inline-flex items-center gap-1.5 rounded-full border border-ink/15 bg-white px-4 py-2 text-xs font-semibold hover:border-ink"><Download size={14} /> Exporter (Excel)</button>
          <button onClick={load} className="inline-flex items-center gap-1.5 rounded-full border border-ink/15 bg-white px-4 py-2 text-xs font-semibold hover:border-ink"><RefreshCw size={14} className={cn(loading && 'animate-spin')} /> Actualiser</button>
        </>} />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <SearchInput value={q} onChange={setQ} placeholder="N° de commande, nom ou téléphone…" />
      </div>
      <div className="mb-5"><Pills value={filter} onChange={setFilter} options={[
        { id: 'tous', label: 'Toutes', count: counts.tous },
        ...(['confirmee', 'preparation', 'expediee', 'livree', 'annulee'] as const).map((s) => ({ id: s, label: ORDER_STATUS[s].label, count: counts[s] ?? 0 })),
      ]} /></div>
      {client && <p className="mb-4 flex items-center gap-2 text-sm text-ink-500">Commandes d’un client précis. <button onClick={() => { sp.delete('client'); setSp(sp) }} className="font-semibold text-gold-dark hover:underline">Voir toutes les commandes</button></p>}
      {!orders ? <Loading /> : list.length === 0 ? <Empty>Aucune commande {filter !== 'tous' ? `« ${ORDER_STATUS[filter]?.label} »` : ''} {q ? `pour « ${q} »` : ''}</Empty> : (
        <div className="space-y-3">
          {list.slice(0, 200).map((o) => <OrderRow key={o.id} o={o} onUpdated={(n) => { setOrders((os) => os?.map((x) => (x.id === n.id ? n : x)) ?? null); onChange?.() }} />)}
          {list.length > 200 && <p className="text-center text-xs text-ink-400">200 premières commandes affichées — affinez la recherche.</p>}
        </div>
      )}
    </>
  )
}
