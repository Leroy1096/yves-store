/**
 * Nouveautés : abonnements clients + annonces (produit / résumé de la semaine).
 * E-mail → fonction serveur announce-news · WhatsApp → envoi 1 clic par le gérant (wa.me).
 */
import type { Product } from '../data/products'
import { fcfa } from './format'
import { supabase, DEMO } from './supabase'

/** Adresse publique du site (liens dans les messages) */
export const SITE_URL = ((import.meta.env.VITE_SITE_URL as string | undefined) || (!DEMO && typeof location !== 'undefined' && location.protocol.startsWith('http') ? location.origin : 'https://yvesstore.com')).replace(/\/+$/, '')

export type NewsKind = 'produit' | 'hebdo'
export interface NewsItem { id: string; name: string; price: number; compare_at: number | null; image: string | null; url: string; short: string | null }
export interface Announcement {
  id: number; kind: NewsKind; product_ids: string[]; title: string; message: string; items: NewsItem[]
  status: 'brouillon' | 'publiee'; created_at: string; published_at: string | null
  email_status: 'a_envoyer' | 'envoye' | 'test' | 'aucun' | 'erreur'; email_count: number; email_error: string | null; wa_sent: string[]
}
export interface Subscriber { key: string; name: string | null; email: string | null; phone: string | null; source: 'client' | 'site'; since: string }

export const absUrl = (u: string) => (/^https?:\/\//.test(u) ? u : `${SITE_URL}${u.startsWith('/') ? '' : '/'}${u}`)

export function toItem(p: Product): NewsItem {
  const img = p.images?.[0] ?? null
  return {
    id: p.id, name: p.name, price: p.price, compare_at: p.compareAt ?? null,
    image: img && !img.startsWith('data:') ? absUrl(img) : null,
    url: `/produit/${p.slug}`, short: p.short && p.short !== p.name ? p.short.slice(0, 120) : null,
  }
}

const frDay = (d: Date) => d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
export function weekTitle(now = new Date()) { return `Les nouveautés de la semaine (${frDay(new Date(now.getTime() - 7 * 864e5))} – ${frDay(now)})` }
export function productTitle(items: NewsItem[]) { return items.length === 1 ? `Nouveau : ${items[0].name}` : `${items.length} nouveautés viennent d’arriver` }

/** Message WhatsApp ({prénom} est remplacé pour chaque client) */
export function buildMessage(kind: NewsKind, items: NewsItem[]) {
  const stop = '_Pour ne plus recevoir nos nouveautés, répondez STOP._'
  const end = ['📲 Répondez à ce message pour commander ou réserver.', 'YVES STORE ❤️', '', stop]
  if (kind === 'produit' && items.length === 1) {
    const it = items[0]
    const promo = it.compare_at && it.compare_at > it.price ? ` (au lieu de ${fcfa(it.compare_at)})` : ''
    return ['✨ *NOUVEAUTÉ chez YVES STORE* ✨', '', 'Bonjour {prénom} 👋', '', `🛍️ *${it.name}*`, `💰 ${fcfa(it.price)}${promo}`, ...(it.short ? [it.short] : []), '', `👉 Voir l’article : ${absUrl(it.url)}`, '', ...end].join('\n')
  }
  const head = kind === 'hebdo' ? '🗓️ *Les nouveautés de la semaine chez YVES STORE* 🛍️' : '✨ *NOUVEAUTÉS chez YVES STORE* ✨'
  return [head, '', 'Bonjour {prénom} 👋', '', ...items.flatMap((it, i) => [`${i + 1}. *${it.name}* — ${fcfa(it.price)}`, `👉 ${absUrl(it.url)}`, '']), ...end].join('\n')
}
export const personalize = (msg: string, first?: string | null) => msg.replace(/Bonjour \{prénom\}/g, first?.trim() ? `Bonjour ${first.trim().split(/\s+/)[0]}` : 'Bonjour')
export const waTo = (phone: string, text: string) => `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`

/** Inscription « Recevoir les nouveautés » (visiteur) : e-mail OU numéro WhatsApp */
export async function subscribeNews(contact: string, name?: string): Promise<{ ok: true; channel: 'email' | 'whatsapp' } | { ok: false; error: string }> {
  const v = contact.trim()
  const isMail = v.includes('@')
  const { error } = await supabase.rpc('news_subscribe', isMail ? { p_email: v, p_name: name ?? null } : { p_phone: v, p_name: name ?? null })
  if (!error) return { ok: true, channel: isMail ? 'email' : 'whatsapp' }
  const m = error.message
  if (m.includes('INVALID_EMAIL')) return { ok: false, error: 'Adresse e-mail invalide.' }
  if (m.includes('INVALID_PHONE')) return { ok: false, error: 'Numéro invalide. Exemple : 07 08 09 10 11' }
  if (m.includes('EMPTY')) return { ok: false, error: 'Saisissez votre e-mail ou votre numéro WhatsApp.' }
  if (m.includes('RATE_LIMIT')) return { ok: false, error: 'Trop de demandes. Réessayez dans une minute.' }
  return { ok: false, error: 'Inscription impossible pour le moment. Réessayez.' }
}

/* ───────── Côté clients : annonces publiées (cloche 🔔 + Mon compte) ───────── */
export interface PublicNews { id: number; kind: NewsKind; title: string; items: NewsItem[]; published_at: string }
const SEEN_KEY = 'yves-news-seen'
export async function fetchPublicNews(limit = 20): Promise<PublicNews[]> {
  const { data, error } = await supabase.rpc('public_announcements', { p_limit: limit })
  return error ? [] : ((data ?? []) as PublicNews[])
}
export const newsSeenAt = () => { try { return localStorage.getItem(SEEN_KEY) ?? '' } catch { return '' } }
export const markNewsSeen = (iso = new Date().toISOString()) => { try { localStorage.setItem(SEEN_KEY, iso) } catch { /* */ } }
