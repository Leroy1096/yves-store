import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle, Ban, CheckCircle2, Clock, Loader2, Lock, X, XCircle } from 'lucide-react'
import WaRequestButton from './WaRequest'
import { maskPhone, requestOrderWhatsapp, type GuestOrderInfo } from '../lib/whatsapp'
import { useEffect, useState } from 'react'
import { cn } from '../lib/format'
import { CANCEL_REASONS, cancelState, deadlineLabel, useTimeLeft } from '../lib/orders'

interface Props {
  orderId: string
  status?: string
  createdAt: string
  cancelledAt?: string | null
  cancelReason?: string | null
  /** Doit lever une erreur (message lisible) si l’annulation échoue */
  onCancel: (reason: string) => Promise<void>
  compact?: boolean
  /** Numéro WhatsApp du client (saisi à la commande) */
  waPhone?: string
  /** Détails de la commande (utile pour les commandes invité non enregistrées en base) */
  waInfo?: GuestOrderInfo
}

const fmt = (d: string) => new Date(d).toLocaleString('fr-FR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })

/** Badge compact « Annulable encore 23 h 12 min » */
export function CancelBadge({ status, createdAt }: { status?: string; createdAt: string }) {
  const t = useTimeLeft(createdAt)
  if (cancelState(status, createdAt, t.now) !== 'open') return null
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-orange-50 px-2.5 py-1 text-[11px] font-semibold text-orange-700">
      <Clock size={12} /> Annulable · {t.label}
    </span>
  )
}

export default function CancelOrder({ orderId, status, createdAt, cancelledAt, cancelReason, onCancel, compact = false, waPhone, waInfo }: Props) {
  const t = useTimeLeft(createdAt)
  const state = cancelState(status, createdAt, t.now)
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [other, setOther] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const [waSent, setWaSent] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    document.body.style.overflow = 'hidden'
    const k = (e: KeyboardEvent) => e.key === 'Escape' && !busy && setOpen(false)
    window.addEventListener('keydown', k)
    return () => { document.body.style.overflow = ''; window.removeEventListener('keydown', k) }
  }, [open, busy])
  // Le délai expire pendant que la fenêtre est ouverte
  useEffect(() => { if (open && state === 'expired') setErr('Le délai de 24 heures vient d’expirer : la commande ne peut plus être annulée.') }, [open, state])

  const confirm = async () => {
    if (!reason) return setErr('Veuillez indiquer la raison de l’annulation.')
    if (state !== 'open') return
    setBusy(true); setErr('')
    try {
      const finalReason = reason === 'Autre raison' && other.trim() ? `Autre : ${other.trim()}` : reason
      await onCancel(finalReason)
      setOpen(false)
      // Confirmation d’annulation envoyée sur le WhatsApp du client (via l’Espace gérant)
      requestOrderWhatsapp('order_cancel', orderId, waPhone, 'confirmation', { ...waInfo, status: 'annulee', cancel_reason: finalReason, cancelled_at: new Date().toISOString() })
        .then((r) => { if (r.ok) setWaSent(r.phone) })
    } catch (e) {
      setErr((e as Error).message)
    } finally { setBusy(false) }
  }

  const pct = Math.max(0, Math.min(100, (t.ms / (24 * 3.6e6)) * 100))
  const help = (label: string, variant: 'link' | 'outline' = 'link') => (
    <WaRequestButton kind="order_cancel" motif="aide" orderId={orderId} phone={waPhone} info={{ ...waInfo, status }} label={label} variant={variant} />
  )

  return (
    <>
      {state === 'cancelled' && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <XCircle size={18} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">Commande annulée{cancelledAt ? ` le ${fmt(cancelledAt)}` : ''}</p>
            {cancelReason && <p className="mt-0.5 text-red-700/80">Raison : {cancelReason}</p>}
            <p className="mt-1 text-xs text-red-700/70">Si vous aviez payé par Mobile Money ou carte, le remboursement est effectué sous 48 h.</p>
            {waSent && <p className="mt-2 inline-flex items-start gap-1.5 text-xs font-medium text-emerald-700"><CheckCircle2 size={14} className="mt-px shrink-0" />La confirmation d’annulation va vous être envoyée sur votre WhatsApp {maskPhone(waSent)}.</p>}
          </div>
        </div>
      )}

      {state === 'open' && (
        <div className={cn('rounded-xl border border-orange-200 bg-orange-50/70', compact ? 'p-3.5' : 'p-4 sm:p-5')}>
          <div className="flex flex-wrap items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-orange-100 text-orange-700"><Clock size={18} /></span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-ink">Vous pouvez encore annuler cette commande</p>
              <p className="text-xs text-ink-500">Jusqu’au <b className="text-ink">{deadlineLabel(createdAt)}</b> — il reste <b className="tabular-nums text-orange-700">{t.label}</b></p>
            </div>
            <button onClick={() => { setOpen(true); setErr('') }} className="flex w-full items-center justify-center gap-2 rounded-full border-2 border-red-600 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-red-600 transition hover:bg-red-600 hover:text-white sm:w-auto">
              <Ban size={15} /> Annuler la commande
            </button>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-orange-100"><div className="h-full rounded-full bg-gradient-to-r from-orange-400 to-red-500 transition-[width] duration-1000" style={{ width: `${pct}%` }} /></div>
          <p className="mt-2.5 text-xs text-ink-500">Besoin d’aide pour annuler ou modifier ? {help('Recevoir de l’aide sur mon WhatsApp')}</p>
        </div>
      )}

      {(state === 'expired' || state === 'shipped') && (
        <div className="flex items-start gap-3 rounded-xl border border-ink/10 bg-ivory-200/60 p-4 text-sm">
          <Lock size={17} className="mt-0.5 shrink-0 text-ink-400" />
          <div className="min-w-0">
            <p className="font-semibold text-ink-700">{state === 'shipped' ? 'Commande déjà expédiée — annulation impossible' : 'Annulation impossible : le délai de 24 h est dépassé'}</p>
            <p className="mt-0.5 text-xs text-ink-500">
              {state === 'expired' && <>Le délai a pris fin le {deadlineLabel(createdAt)}. </>}
              Un souci ? Vous pourrez retourner l’article sous 7 jours après réception. {help('Recevoir de l’aide sur mon WhatsApp')}
            </p>
          </div>
        </div>
      )}

      <AnimatePresence>
        {open && (
          <>
            <motion.div className="fixed inset-0 z-[80] bg-ink/60 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => !busy && setOpen(false)} />
            <div className="pointer-events-none fixed inset-0 z-[81] flex items-end justify-center sm:items-center sm:p-6">
              <motion.div
                role="dialog" aria-modal="true" aria-labelledby="cancel-title"
                initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }} transition={{ type: 'spring', damping: 30, stiffness: 320 }}
                className="pointer-events-auto relative max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] text-left text-ink sm:max-w-lg sm:rounded-3xl sm:p-7"
              >
                <button onClick={() => !busy && setOpen(false)} className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full bg-ivory-200 hover:bg-ink hover:text-ivory" aria-label="Fermer"><X size={17} /></button>
                <span className="grid h-12 w-12 place-items-center rounded-full bg-red-50 text-red-600"><AlertTriangle size={22} /></span>
                <h3 id="cancel-title" className="mt-3 pr-10 text-xl font-extrabold">Annuler la commande {orderId} ?</h3>
                <p className="mt-1 text-sm text-ink-500">Cette action est définitive. Il vous reste <b className="tabular-nums text-orange-700">{t.label}</b> pour annuler.</p>

                <p className="mt-5 text-sm font-semibold">Pourquoi souhaitez-vous annuler ?</p>
                <div className="mt-2 space-y-1.5">
                  {CANCEL_REASONS.map((r) => (
                    <label key={r} className={cn('flex cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-2.5 text-sm transition', reason === r ? 'border-ink bg-ivory-100' : 'border-ink/10 hover:border-ink/30')}>
                      <input type="radio" name="cancel-reason" checked={reason === r} onChange={() => { setReason(r); setErr('') }} className="accent-[#0E0D0B]" />
                      {r}
                    </label>
                  ))}
                </div>
                {reason === 'Autre raison' && (
                  <textarea value={other} onChange={(e) => setOther(e.target.value.slice(0, 250))} rows={2} placeholder="Précisez (facultatif)" className="input mt-2 resize-none" />
                )}
                {reason === 'Je veux modifier l’adresse de livraison' && (
                  <p className="mt-2 rounded-lg bg-blue-50 p-3 text-xs text-blue-800">Astuce : pas besoin d’annuler ! Nous vous contactons sur votre WhatsApp et modifions l’adresse. <span className="mt-1.5 block">{help('Être contacté sur mon WhatsApp')}</span></p>
                )}

                <p className="mt-4 text-xs text-ink-400">Paiement Mobile Money ou carte : remboursement intégral sous 48 h. Paiement à la livraison : rien à payer.</p>
                {err && <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm font-medium text-red-700" role="alert">{err}</p>}

                <div className="mt-5 grid gap-2 sm:grid-cols-2">
                  <button onClick={() => setOpen(false)} disabled={busy} className="rounded-full border border-ink/20 py-3 text-sm font-bold hover:border-ink disabled:opacity-50">Garder ma commande</button>
                  <button onClick={confirm} disabled={busy || state !== 'open'} className="flex items-center justify-center gap-2 rounded-full bg-red-600 py-3 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50">
                    {busy ? <Loader2 size={16} className="animate-spin" /> : <Ban size={16} />} Oui, annuler
                  </button>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
