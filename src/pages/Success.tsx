import { motion } from 'framer-motion'
import { Check, Package, Phone, Truck, X } from 'lucide-react'
import WaRequestButton from '../components/WaRequest'
import type { GuestOrderInfo } from '../lib/whatsapp'
import CancelOrder from '../components/CancelOrder'
import { cancelGuestOrderRemote, cancelOrderRemote, cancelState } from '../lib/orders'
import { useAuth } from '../store/auth'
import { Link, useParams } from 'react-router-dom'
import { Img, Logo } from '../components/ui'
import { fcfa, SHIPPING } from '../lib/format'
import { useOrders } from '../store'

export default function Success() {
  const { id } = useParams()
  const order = useOrders((s) => s.orders.find((o) => o.id === id))
  const cancelLocal = useOrders((s) => s.cancel)
  const user = useAuth((s) => s.user)
  if (!order) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center px-5 text-center">
        <Logo /><h1 className="h-display mt-10 text-4xl">Commande introuvable</h1>
        <Link to="/" className="btn-dark mt-8">Retour à l’accueil</Link>
      </main>
    )
  }
  const cancelled = order.status === 'annulee'
  const waInfo: GuestOrderInfo = {
    name: `${order.customer.firstName} ${order.customer.lastName}`.trim(), status: order.status ?? 'confirmee', total: order.total, lines: order.lines,
    shipping: order.shipping, address: order.address, payment: order.payment, created_at: order.createdAt, cancelled_at: order.cancelledAt, cancel_reason: order.cancelReason,
  }
  const doCancel = async (reason: string) => {
    if (cancelState(order.status, order.createdAt) !== 'open') throw new Error('Le délai de 24 heures est dépassé : cette commande ne peut plus être annulée.')
    if (user) {
      try {
        const r = await cancelOrderRemote(order.id, reason)
        cancelLocal(order.id, reason, r.cancelled_at)
        return
      } catch (e) {
        // Commande non synchronisée sur le compte : annulation locale uniquement
        if (!(e as Error).message.includes('introuvable')) throw e
      }
    }
    // Commande passée sans compte : annulation côté serveur (vérification par le téléphone)
    const g = await cancelGuestOrderRemote(order.id, order.customer.phone, reason)
    cancelLocal(order.id, reason, g?.cancelled_at)
  }
  const steps = [
    { i: Check, t: 'Commande reçue', d: 'À l’instant' },
    { i: Phone, t: 'Appel de confirmation', d: 'Sous 30 minutes' },
    { i: Package, t: 'Préparation', d: 'Emballage soigné' },
    { i: Truck, t: order.shipping === 'retrait' ? 'Prête en boutique' : 'Livraison', d: SHIPPING[order.shipping].eta },
  ]
  return (
    <main className="min-h-screen bg-ivory">
      <header className="border-b border-ink/10"><div className="container-x flex h-[72px] items-center justify-center"><Link to="/"><Logo /></Link></div></header>
      <section className="container-x max-w-3xl py-14 text-center">
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', damping: 12, stiffness: 180, delay: 0.1 }} className={`mx-auto grid h-20 w-20 place-items-center rounded-full ${cancelled ? 'bg-red-100' : 'bg-gold'}`}>
          <motion.span initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4 }}>{cancelled ? <X size={38} strokeWidth={2.5} className="text-red-600" /> : <Check size={38} strokeWidth={2.5} className="text-ink" />}</motion.span>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <p className="eyebrow mt-8">Commande {order.id}</p>
          <h1 className="h-display mt-3 text-5xl sm:text-6xl">{cancelled ? 'Commande annulée' : `Merci, ${order.customer.firstName} !`}</h1>
          <p className="mx-auto mt-4 max-w-md text-ink-500">{cancelled ? 'Votre annulation a bien été prise en compte. Nous espérons vous revoir très vite !' : <>Votre commande est confirmée. Un conseiller YVES STORE vous appellera au <b className="text-ink">{order.customer.phone}</b> pour organiser la livraison.</>}</p>
        </motion.div>
        <div className="mx-auto mt-8 max-w-2xl text-left">
          <CancelOrder orderId={order.id} status={order.status} createdAt={order.createdAt} cancelledAt={order.cancelledAt} cancelReason={order.cancelReason} onCancel={doCancel} waPhone={order.customer.phone} waInfo={waInfo} />
        </div>
        {!cancelled && <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {steps.map(({ i: I, t, d }, k) => (
            <motion.div key={t} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 + k * 0.1 }} className="rounded-2xl border border-ink/10 bg-white p-5">
              <span className={`mx-auto grid h-10 w-10 place-items-center rounded-full ${k === 0 ? 'bg-ink text-gold-light' : 'bg-ivory-200 text-ink-500'}`}><I size={18} /></span>
              <p className="mt-3 text-sm font-semibold">{t}</p><p className="text-xs text-ink-400">{d}</p>
            </motion.div>
          ))}
        </div>}
      </section>
      <section className="container-x max-w-3xl pb-20">
        <div className="rounded-3xl border border-ink/10 bg-white p-6 sm:p-8">
          <h2 className="font-display text-2xl">Détail de la commande</h2>
          <ul className="mt-6 divide-y divide-ink/10">
            {order.lines.map((l, k) => (
              <li key={k} className="flex items-center gap-4 py-4">
                <Img src={l.image} alt={l.name} className="h-20 w-16 rounded-xl object-cover" />
                <div className="flex-1"><p className="font-medium">{l.name}</p><p className="text-xs text-ink-400">{[l.color, l.size, ...Object.values(l.options ?? {}), `Qté ${l.qty}`].filter(Boolean).join(' · ')}</p></div>
                <p className="font-semibold">{fcfa(l.price * l.qty)}</p>
              </li>
            ))}
          </ul>
          <dl className="mt-4 space-y-2 border-t border-ink/10 pt-5 text-sm">
            <div className="flex justify-between"><dt className="text-ink-500">Sous-total</dt><dd>{fcfa(order.subtotal)}</dd></div>
            {order.discount > 0 && <div className="flex justify-between text-gold-dark"><dt>Réduction</dt><dd>-{fcfa(order.discount)}</dd></div>}
            <div className="flex justify-between"><dt className="text-ink-500">Livraison</dt><dd>{order.shippingCost ? fcfa(order.shippingCost) : 'Offerte'}</dd></div>
            <div className="flex justify-between border-t border-ink/10 pt-3 text-base font-semibold"><dt>Total</dt><dd className="font-display text-2xl">{fcfa(order.total)}</dd></div>
          </dl>
          <div className="mt-6 grid gap-4 rounded-2xl bg-ivory-200/70 p-5 text-sm sm:grid-cols-2">
            <div><p className="label">Livraison</p><p>{order.shipping === 'retrait' ? 'Retrait en boutique' : `${order.address.details}, ${order.address.commune ? order.address.commune + ', ' : ''}${order.address.city}`}</p></div>
            <div><p className="label">Paiement</p><p>{order.payment}</p></div>
          </div>
        </div>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link to="/boutique" className="btn-dark">Continuer mes achats</Link>
          <Link to="/mon-compte?onglet=commandes" className="btn-outline">Mes commandes</Link>
          <WaRequestButton kind="order_tracking" motif="suivi" orderId={order.id} phone={order.customer.phone} info={waInfo} label="Suivre sur mon WhatsApp" />
        </div>
      </section>
    </main>
  )
}
