import { AlertTriangle, ArrowDownToLine, ArrowRight, ArrowUpFromLine, Ban, Banknote, Clock, ShoppingBag, UserPlus, Wallet } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Img } from '../../components/ui'
import TrendChart from './TrendChart'
import { cn, fcfa } from '../../lib/format'
import {
  Badge, Card, customerName, dateTime, ErrorBox, errMsg, fetchCatalog, fetchClients, fetchMovements, fetchOrders, Loading, ORDER_STATUS, PageHead, Pills, productInfo, Stat,
  type AdminOrder, type CatalogRow, type Client, type Movement,
} from './shared'

type Period = 'jour' | '7j' | '30j' | 'tout'
const PERIODS: { id: Period; label: string }[] = [
  { id: 'jour', label: 'Aujourd’hui' }, { id: '7j', label: '7 jours' }, { id: '30j', label: '30 jours' }, { id: 'tout', label: 'Depuis le début' },
]
const startOf = (p: Period) => {
  const d = new Date()
  if (p === 'tout') return 0
  if (p === 'jour') { d.setHours(0, 0, 0, 0); return d.getTime() }
  d.setHours(0, 0, 0, 0)
  return d.getTime() - (p === '7j' ? 6 : 29) * 86400000
}

export default function Overview() {
  const [data, setData] = useState<{ orders: AdminOrder[]; moves: Movement[]; catalog: CatalogRow[]; clients: Client[] } | null>(null)
  const [err, setErr] = useState('')
  const [period, setPeriod] = useState<Period>('7j')

  useEffect(() => {
    Promise.all([fetchOrders(), fetchMovements(), fetchCatalog(), fetchClients()])
      .then(([orders, moves, catalog, clients]) => setData({ orders, moves, catalog, clients }))
      .catch((e) => setErr(errMsg(e)))
  }, [])

  const k = useMemo(() => {
    if (!data) return null
    const from = startOf(period)
    const inP = (d: string) => new Date(d).getTime() >= from
    const orders = data.orders.filter((o) => inP(o.created_at))
    const valid = orders.filter((o) => o.status !== 'annulee')
    const revenue = valid.reduce((a, o) => a + o.total, 0)
    const moves = data.moves.filter((m) => inP(m.created_at))
    const outQty = moves.filter((m) => m.qty < 0).reduce((a, m) => a - m.qty, 0)
    const inQty = moves.filter((m) => m.qty > 0).reduce((a, m) => a + m.qty, 0)
    const soldQty = moves.filter((m) => m.kind === 'vente').reduce((a, m) => a - m.qty, 0) - moves.filter((m) => m.kind === 'retour').reduce((a, m) => a + m.qty, 0)
    // Meilleures ventes
    const top = new Map<string, { name: string; id?: string; qty: number; amount: number }>()
    valid.forEach((o) => o.lines.forEach((l) => {
      const key = l.id ?? l.name
      const t = top.get(key) ?? { name: l.name, id: l.id, qty: 0, amount: 0 }
      t.qty += l.qty; t.amount += l.qty * l.price; top.set(key, t)
    }))
    return {
      orders: orders.length, valid: valid.length, revenue, avg: valid.length ? Math.round(revenue / valid.length) : 0,
      cancelled: orders.filter((o) => o.status === 'annulee').length,
      todo: data.orders.filter((o) => o.status === 'confirmee' || o.status === 'preparation').length,
      newClients: data.clients.filter((c) => inP(c.created_at)).length,
      outQty, inQty, soldQty,
      top: [...top.values()].sort((a, b) => b.qty - a.qty).slice(0, 5),
      low: data.catalog.filter((c) => c.active && c.stock <= c.low_stock_threshold).sort((a, b) => a.stock - b.stock),
      stockValue: data.catalog.filter((c) => c.active).reduce((a, c) => a + c.stock * c.price, 0),
      stockUnits: data.catalog.filter((c) => c.active).reduce((a, c) => a + c.stock, 0),
    }
  }, [data, period])

  if (err) return <ErrorBox msg={err} />
  if (!data || !k) return <Loading />

  return (
    <>
      <PageHead title="Tableau de bord" sub="Vue d’ensemble des commandes (entrées) et des articles sortis du stock." actions={<Pills value={period} onChange={setPeriod} options={PERIODS} />} />

      {k.todo > 0 && (
        <Link to="/gerant/commandes" className="mb-5 flex items-center gap-3 rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900 hover:border-sky-300">
          <Clock size={18} className="shrink-0" />
          <span className="flex-1"><b>{k.todo} commande{k.todo > 1 ? 's' : ''} à traiter</b> (nouvelles ou en préparation).</span>
          <ArrowRight size={16} />
        </Link>
      )}

      <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-ink-400">Entrées — commandes</p>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Chiffre d’affaires" value={fcfa(k.revenue)} hint="Hors commandes annulées" icon={<Banknote size={16} />} tone="gold" />
        <Stat label="Commandes reçues" value={k.orders} hint={`${k.valid} valides`} icon={<ShoppingBag size={16} />} tone="green" />
        <Stat label="Panier moyen" value={fcfa(k.avg)} icon={<Wallet size={16} />} />
        <Stat label="Annulées" value={k.cancelled} hint={k.orders ? `${Math.round((k.cancelled / k.orders) * 100)} % des commandes` : '—'} icon={<Ban size={16} />} tone="red" />
      </div>

      <p className="mb-2 mt-6 text-xs font-bold uppercase tracking-[0.16em] text-ink-400">Stock — entrées et sorties d’articles</p>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Articles sortis" value={k.outQty} hint={`dont ${k.soldQty} vendus (net)`} icon={<ArrowUpFromLine size={16} />} tone="orange" />
        <Stat label="Articles entrés" value={k.inQty} hint="Réceptions + retours" icon={<ArrowDownToLine size={16} />} tone="green" />
        <Stat label="Stock disponible" value={k.stockUnits} hint={`Valeur de vente : ${fcfa(k.stockValue)}`} icon={<ShoppingBag size={16} />} />
        <Stat label="Nouveaux inscrits" value={k.newClients} hint={`${data.clients.length} inscrits au total`} icon={<UserPlus size={16} />} tone="gold" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card className="p-5"><TrendChart kind="revenue" /></Card>
        <Card className="p-5"><TrendChart kind="stock" /></Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-1">
          <p className="font-semibold">Meilleures ventes</p>
          {k.top.length === 0 ? <p className="mt-4 text-sm text-ink-400">Aucune vente sur la période.</p> : (
            <ul className="mt-3 space-y-3">
              {k.top.map((t, i) => (
                <li key={i} className="flex items-center gap-3 text-sm">
                  {productInfo(t.id) ? <Img src={productInfo(t.id)!.images[0]} alt="" className="h-10 w-10 rounded-lg object-cover" /> : <span className="h-10 w-10 rounded-lg bg-ivory-200" />}
                  <span className="min-w-0 flex-1"><span className="line-clamp-1 font-medium">{t.name}</span><span className="text-xs text-ink-400">{fcfa(t.amount)}</span></span>
                  <b className="tabular-nums">×{t.qty}</b>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card className="p-5 lg:col-span-1">
          <div className="flex items-center justify-between"><p className="font-semibold">Alertes stock</p><Link to="/gerant/stock" className="text-xs font-semibold text-gold-dark hover:underline">Gérer →</Link></div>
          {k.low.length === 0 ? <p className="mt-4 text-sm text-emerald-700">Tout est bien approvisionné ✅</p> : (
            <ul className="mt-3 space-y-2.5">
              {k.low.slice(0, 6).map((c) => (
                <li key={c.id} className="flex items-center gap-2 text-sm">
                  <AlertTriangle size={14} className={c.stock === 0 ? 'text-red-600' : 'text-orange-500'} />
                  <span className="line-clamp-1 flex-1">{c.name}</span>
                  <Badge cls={c.stock === 0 ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-800'}>{c.stock === 0 ? 'Rupture' : `${c.stock} restants`}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card className="p-5 lg:col-span-1">
          <div className="flex items-center justify-between"><p className="font-semibold">Dernières commandes</p><Link to="/gerant/commandes" className="text-xs font-semibold text-gold-dark hover:underline">Tout voir →</Link></div>
          {data.orders.length === 0 ? <p className="mt-4 text-sm text-ink-400">Aucune commande pour le moment.</p> : (
            <ul className="mt-3 divide-y divide-ink/5">
              {data.orders.slice(0, 6).map((o) => (
                <li key={o.id} className="flex items-center gap-2 py-2 text-sm">
                  <span className="min-w-0 flex-1"><span className="block font-semibold">{o.id}</span><span className="text-xs text-ink-400">{customerName(o)} · {dateTime(o.created_at)}</span></span>
                  <span className="text-right"><span className="block font-semibold tabular-nums">{fcfa(o.total)}</span><Badge cls={cn(ORDER_STATUS[o.status]?.cls)}>{ORDER_STATUS[o.status]?.label}</Badge></span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  )
}
