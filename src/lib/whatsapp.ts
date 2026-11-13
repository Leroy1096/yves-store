/**
 * Demandes envoyées sur le WhatsApp DU CLIENT (mode semi-automatique).
 *  1. Le client fait sa demande sur le site → elle arrive dans l’Espace gérant (/gerant).
 *  2. Le gérant clique « Envoyer sur WhatsApp » → WhatsApp s’ouvre sur le numéro du client,
 *     message pré-rempli → il appuie sur Envoyer.
 */
import { formatPhone, normalizePhone } from './auth-utils'
import { fcfa, SHIPPING, type ShippingId } from './format'
import { supabase, supabaseReady } from './supabase'

export type WaKind = 'reset_password' | 'order_tracking' | 'order_cancel'
export type WaMotif = 'suivi' | 'confirmation' | 'aide'

const ERRORS: Record<string, string> = {
  RATE_LIMIT: 'Trop de demandes en peu de temps. Réessayez dans une heure.',
  NO_PHONE: 'Aucun numéro WhatsApp valide. Ajoutez votre numéro dans « Mon espace ».',
  BAD_ORDER: 'Commande introuvable.',
  PAYLOAD_TOO_LARGE: 'Commande trop volumineuse.',
}
const err = (code?: string) => ERRORS[code ?? ''] ?? 'Service momentanément indisponible. Réessayez.'

/** Lien wa.me vers le numéro du CLIENT (utilisé par le gérant). */
export function clientWaLink(phoneE164: string, text: string) {
  return `https://wa.me/${phoneE164.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`
}

/** Masque un numéro : +225 07 •• •• •• 11 */
export function maskPhone(e164: string) {
  const f = formatPhone(e164)
  return f.replace(/(\+225 \d{2}) \d{2} \d{2} \d{2} (\d{2})/, '$1 •• •• •• $2')
}

// ───────────────────────── Côté client ─────────────────────────

export async function requestResetCode(identifier: string): Promise<{ ok: true; noWhatsapp?: boolean } | { ok: false; error: string }> {
  if (!supabaseReady) return { ok: false, error: err() }
  const { data, error } = await supabase.rpc('request_password_reset_whatsapp', { p_identifier: identifier.trim() })
  if (error) return { ok: false, error: err() }
  if (!data?.ok) return { ok: false, error: err(data?.error) }
  return { ok: true, noWhatsapp: !!data.no_whatsapp }
}

export async function resetPasswordWithCode(identifier: string, code: string, password: string): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!supabaseReady) return { ok: false, error: err() }
  const { data, error } = await supabase.functions.invoke('wa-reset-password', { body: { identifier: identifier.trim(), code, password } })
  if (error) {
    // L’erreur HTTP 400 contient notre message lisible
    try {
      const body = await (error as { context?: Response }).context?.json()
      if (body?.error) return { ok: false, error: body.error }
    } catch { /* ignore */ }
    return { ok: false, error: err() }
  }
  return data?.ok ? { ok: true } : { ok: false, error: data?.error ?? err() }
}

export interface GuestOrderInfo {
  name?: string
  status?: string
  total?: number
  lines?: { name: string; qty: number; price: number; size?: string; color?: string }[]
  shipping?: string
  address?: { city: string; commune: string; details: string }
  payment?: string
  created_at?: string
  cancelled_at?: string | null
  cancel_reason?: string | null
}

/** Le client demande à recevoir le suivi / la confirmation d’annulation / de l’aide sur SON WhatsApp. */
export async function requestOrderWhatsapp(kind: 'order_tracking' | 'order_cancel', orderId: string, phone: string | undefined, motif: WaMotif, info: GuestOrderInfo = {}, note = '')
  : Promise<{ ok: true; phone: string } | { ok: false; error: string }> {
  if (!supabaseReady) return { ok: false, error: err() }
  const p = phone ? normalizePhone(phone) : null
  const payload = {
    ...info,
    lines: info.lines?.slice(0, 20).map((l) => ({ name: l.name, qty: l.qty, price: l.price, size: l.size, color: l.color })),
    motif, note,
  }
  const { data, error } = await supabase.rpc('request_order_whatsapp', { p_kind: kind, p_order_id: orderId, p_phone: p ?? '', p_payload: payload })
  if (error) return { ok: false, error: err() }
  if (!data?.ok) return { ok: false, error: err(data?.error) }
  return { ok: true, phone: data.phone }
}

// ───────────────────────── Messages (côté gérant) ─────────────────────────

export const ORDER_STATUS_FR: Record<string, string> = {
  confirmee: 'Confirmée ✅', preparation: 'En préparation 📦', expediee: 'Expédiée 🚚', livree: 'Livrée 🎉', annulee: 'Annulée ❌',
}
const STATUS_NEXT: Record<string, string> = {
  confirmee: 'Nous préparons vos articles. Vous serez prévenu(e) dès l’expédition.',
  preparation: 'Vos articles sont en cours d’emballage. Expédition très bientôt.',
  expediee: 'Votre colis est en route ! Le livreur vous appellera avant de passer.',
  livree: 'Merci pour votre confiance ! N’hésitez pas à laisser un avis sur le site.',
  annulee: 'Si vous aviez payé par Mobile Money ou carte, le remboursement est effectué sous 48 h.',
}

export interface WaRequest {
  id: string
  kind: WaKind
  user_id: string | null
  phone: string
  customer_name: string | null
  order_id: string | null
  payload: GuestOrderInfo & { motif?: WaMotif; note?: string; source?: string; via?: string }
  status: 'en_attente' | 'envoye' | 'traite' | 'annule'
  code_expires_at: string | null
  created_at: string
  sent_at: string | null
}

const hello = (name?: string | null) => `Bonjour${name ? ' ' + name.split(' ')[0] : ''} 👋`

export function resetMessage(name: string | null, code: string) {
  return [
    hello(name),
    '',
    `Votre code YVES STORE pour réinitialiser votre mot de passe : *${code}*`,
    '',
    '⏱️ Valable 30 minutes.',
    '👉 Sur le site : Connexion › Mot de passe oublié › « J’ai reçu mon code ».',
    '',
    '🔒 Ne partagez jamais ce code. Si vous n’avez rien demandé, ignorez ce message.',
    '',
    'YVES STORE ❤️',
  ].join('\n')
}

function linesBlock(r: WaRequest) {
  const lines = r.payload.lines ?? []
  if (!lines.length) return ''
  return lines.map((l) => `• ${l.qty} × ${l.name}${l.size ? ` (${l.size})` : ''} — ${fcfa(l.price * l.qty)}`).join('\n')
}

export function orderMessage(r: WaRequest, statusOverride?: string) {
  const st = statusOverride ?? r.payload.status ?? 'confirmee'
  const ship = r.payload.shipping ? SHIPPING[r.payload.shipping as ShippingId]?.label : ''
  const lb = linesBlock(r)
  const total = r.payload.total ? `Total : *${fcfa(r.payload.total)}*` : ''
  if (r.kind === 'order_tracking') {
    return [
      hello(r.customer_name), '',
      `📦 Suivi de votre commande *${r.order_id}*`,
      `Statut : *${ORDER_STATUS_FR[st] ?? st}*`,
      ship ? `Livraison : ${ship}` : '',
      '', lb, total, '',
      STATUS_NEXT[st] ?? '', '',
      'Une question ? Répondez simplement à ce message.',
      'YVES STORE ❤️',
    ].filter((x, i, a) => !(x === '' && a[i - 1] === '')).join('\n').trim()
  }
  if (r.payload.motif === 'aide') {
    return [
      hello(r.customer_name), '',
      `Vous avez demandé de l’aide pour votre commande *${r.order_id}* (statut : ${ORDER_STATUS_FR[st] ?? st}).`,
      r.payload.note ? `Votre message : « ${r.payload.note} »` : '',
      '',
      'Dites-nous ce que vous souhaitez :',
      '1️⃣ Annuler la commande',
      '2️⃣ Modifier l’adresse ou la date de livraison',
      '3️⃣ Changer un article (taille, couleur)',
      '4️⃣ Autre question',
      '',
      'ℹ️ L’annulation est possible pendant 24 h après la commande.',
      'YVES STORE ❤️',
    ].filter((x, i, a) => !(x === '' && a[i - 1] === '')).join('\n').trim()
  }
  return [
    hello(r.customer_name), '',
    `❌ Votre commande *${r.order_id}* a bien été annulée.`,
    r.payload.cancel_reason ? `Raison : ${r.payload.cancel_reason}` : '',
    total, '',
    '💳 Si vous aviez payé par Mobile Money ou carte, le remboursement est effectué sous 48 h.',
    'Nous espérons vous revoir très vite sur YVES STORE.',
    '',
    'YVES STORE ❤️',
  ].filter((x, i, a) => !(x === '' && a[i - 1] === '')).join('\n').trim()
}

export const KIND_FR: Record<WaKind, string> = {
  reset_password: 'Mot de passe oublié',
  order_tracking: 'Suivi de commande',
  order_cancel: 'Annulation',
}
