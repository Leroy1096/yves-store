import { useEffect, useState } from 'react'
import { supabase } from './supabase'

/** Délai pendant lequel le client peut annuler sa commande */
export const CANCEL_WINDOW_MS = 24 * 60 * 60 * 1000

export const cancelDeadline = (createdAt: string) => new Date(new Date(createdAt).getTime() + CANCEL_WINDOW_MS)

export type CancelState = 'open' | 'expired' | 'cancelled' | 'shipped'

export function cancelState(status: string | undefined, createdAt: string, now = Date.now()): CancelState {
  if (status === 'annulee') return 'cancelled'
  if (status === 'expediee' || status === 'livree') return 'shipped'
  return now < cancelDeadline(createdAt).getTime() ? 'open' : 'expired'
}

/** Temps restant avant la fin du délai, rafraîchi chaque seconde */
export function useTimeLeft(createdAt: string) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t) }, [])
  const ms = Math.max(0, cancelDeadline(createdAt).getTime() - now)
  const h = Math.floor(ms / 3.6e6), m = Math.floor((ms / 6e4) % 60), s = Math.floor((ms / 1000) % 60)
  return { ms, now, h, m, s, label: h > 0 ? `${h} h ${String(m).padStart(2, '0')} min` : `${m} min ${String(s).padStart(2, '0')} s` }
}

export const deadlineLabel = (createdAt: string) =>
  cancelDeadline(createdAt).toLocaleString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })

const ERRORS: Record<string, string> = {
  CANCEL_WINDOW_EXPIRED: 'Le délai de 24 heures est dépassé : cette commande ne peut plus être annulée.',
  ALREADY_CANCELLED: 'Cette commande est déjà annulée.',
  ALREADY_SHIPPED: 'Cette commande a déjà été expédiée et ne peut plus être annulée.',
  ORDER_NOT_FOUND: 'Commande introuvable sur votre compte.',
  NOT_AUTHENTICATED: 'Veuillez vous reconnecter pour annuler cette commande.',
}

/** Annulation côté serveur (Supabase RPC) — la règle des 24 h y est vérifiée */
export async function cancelOrderRemote(id: string, reason: string) {
  const { data, error } = await supabase.rpc('cancel_order', { p_order_id: id, p_reason: reason })
  if (error) {
    const key = Object.keys(ERRORS).find((k) => error.message.includes(k))
    throw new Error(key ? ERRORS[key] : 'Impossible d’annuler pour le moment. Réessayez ou contactez-nous sur WhatsApp.')
  }
  return data as { id: string; status: string; cancelled_at: string; cancel_reason: string | null }
}

/** Annulation d’une commande passée sans compte (vérifie le téléphone de la commande) */
export async function cancelGuestOrderRemote(id: string, phone: string, reason: string) {
  const { data, error } = await supabase.rpc('cancel_guest_order', { p_order_id: id, p_phone: phone, p_reason: reason })
  if (error) throw new Error('Impossible d’annuler pour le moment. Réessayez ou contactez-nous sur WhatsApp.')
  if (!data?.ok) {
    if (data?.error === 'ORDER_NOT_FOUND') return null // commande ancienne, enregistrée seulement sur cet appareil
    throw new Error(ERRORS[data?.error] ?? 'Impossible d’annuler pour le moment.')
  }
  return data as { status: string; cancelled_at: string; cancel_reason: string | null }
}

export const CANCEL_REASONS = [
  'J’ai changé d’avis',
  'Erreur dans ma commande (taille, couleur, quantité)',
  'Je veux modifier l’adresse de livraison',
  'J’ai trouvé moins cher ailleurs',
  'Le délai de livraison est trop long',
  'Autre raison',
]
