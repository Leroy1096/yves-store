import { CheckCircle2, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { cn } from '../lib/format'
import { maskPhone, requestOrderWhatsapp, type GuestOrderInfo, type WaMotif } from '../lib/whatsapp'
import { Social } from './ui'

interface Props {
  kind: 'order_tracking' | 'order_cancel'
  motif: WaMotif
  orderId: string
  phone?: string
  info?: GuestOrderInfo
  label: string
  variant?: 'button' | 'outline' | 'link'
  className?: string
}

/** Bouton « Recevoir … sur mon WhatsApp » : crée la demande dans l’Espace gérant. */
export default function WaRequestButton({ kind, motif, orderId, phone, info, label, variant = 'outline', className }: Props) {
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState<string | null>(null)
  const [err, setErr] = useState('')
  const go = async () => {
    setBusy(true); setErr('')
    const r = await requestOrderWhatsapp(kind, orderId, phone, motif, info)
    setBusy(false)
    if (r.ok) setSent(r.phone); else setErr(r.error)
  }
  if (sent) {
    return (
      <span role="status" className={cn('inline-flex items-start gap-2 rounded-xl bg-emerald-50 px-3.5 py-2.5 text-left text-xs text-emerald-800', className)}>
        <CheckCircle2 size={15} className="mt-0.5 shrink-0" />
        <span><b>Demande envoyée.</b> Vous allez recevoir {kind === 'order_tracking' ? 'le suivi' : motif === 'aide' ? 'notre aide' : 'la confirmation'} sur votre WhatsApp <b className="whitespace-nowrap">{maskPhone(sent)}</b> (8 h – 20 h, en quelques minutes).</span>
      </span>
    )
  }
  const base = variant === 'link'
    ? 'inline-flex items-center gap-1 font-semibold text-emerald-700 underline'
    : variant === 'button'
      ? 'inline-flex items-center justify-center gap-2 rounded-full bg-[#25D366] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#1ebe5a] disabled:opacity-60'
      : 'btn-outline !border-emerald-600 !text-emerald-700 hover:!bg-emerald-600 hover:!text-white'
  return (
    <span className={cn('inline-flex flex-col gap-1', variant !== 'link' && 'w-full sm:w-auto', className)}>
      <button type="button" onClick={go} disabled={busy} className={base}>
        {busy ? <Loader2 size={15} className="animate-spin" /> : <Social.WhatsApp size={variant === 'link' ? 12 : 16} />} {label}
      </button>
      {err && <span role="alert" className="text-xs font-medium text-red-600">{err}</span>}
    </span>
  )
}
