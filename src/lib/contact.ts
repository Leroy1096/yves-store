// Coordonnées officielles YVES STORE — un seul endroit à modifier si le numéro change
import type { CartLine } from '../store'
import { products, getProduct } from '../data/products'
import { fcfa } from './format'

/** Numéro WhatsApp au format international, sans + ni espaces (wa.me) */
export const WHATSAPP_NUMBER = '2250140810415'
/** Numéro affiché sur le site */
export const PHONE_DISPLAY = '+225 01 40 81 04 15'
export const PHONE_TEL = '+2250140810415'

/** Message d'accueil WhatsApp (bouton vert flottant + pied de page) — texte fourni par YVES STORE */
export const WA_WELCOME = "👋 Bonjour et bienvenue chez YVES STORE 🛍️\n\n🛒 1. J'AI UN BESOIN :\n- Acheter un article\n- Effectuer un paiement\n- Organiser une livraison\n\n🛠️ 2. J'AI UN PROBLÈME :\n- Problème technique\n- Problème de paiement\n- Problème de livraison\n\n📩 Merci de préciser votre demande.\n\nYVES STORE ❤️"

/** Lien WhatsApp d'accueil, identique à https://wa.me/2250140810415?text=👋%20Bonjour%20et%20bienvenue… */
export const WA_WELCOME_LINK = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WA_WELCOME)}`

/** Lien WhatsApp (avec message pré-rempli facultatif) */
export const waLink = (text?: string) =>
  `https://wa.me/${WHATSAPP_NUMBER}${text ? `?text=${encodeURIComponent(text)}` : ''}`

/** Lien public d'une page (seulement si le site est servi en http/https) */
const pageUrl = (path: string) =>
  typeof window !== 'undefined' && /^https?:$/.test(window.location.protocol) && !import.meta.env.VITE_SINGLE
    ? `${window.location.origin}${path}`
    : ''

/** Message adapté à la page où se trouve le client */
export function waContextMessage(pathname: string, lines: CartLine[]): string {
  const prod = pathname.match(/^\/produit\/([^/?#]+)/)
  if (prod) {
    const p = getProduct(decodeURIComponent(prod[1]))
    if (p) {
      const url = pageUrl(`/produit/${p.slug}`)
      return `Bonjour YVES STORE 👋\nJe suis intéressé(e) par : ${p.name} — ${fcfa(p.price)}.\nEst-il disponible ?${url ? `\n${url}` : ''}`
    }
  }
  const inCart = lines
    .map((l) => ({ l, p: products.find((x) => x.id === l.productId) }))
    .filter((x): x is { l: CartLine; p: (typeof products)[number] } => !!x.p)
  if (inCart.length && ['/', '/boutique', '/categories', '/favoris', '/commande'].includes(pathname)) {
    const total = inCart.reduce((a, { l, p }) => a + l.qty * p.price, 0)
    const list = inCart
      .map(({ l, p }) => `• ${l.qty} × ${p.name}${[l.size, l.color].filter(Boolean).length ? ` (${[l.size, l.color].filter(Boolean).join(', ')})` : ''} — ${fcfa(l.qty * p.price)}`)
      .join('\n')
    return `Bonjour YVES STORE 👋\nJe souhaite commander :\n${list}\nTotal articles : ${fcfa(total)}\nMerci de me confirmer la disponibilité et la livraison.`
  }
  return 'Bonjour YVES STORE 👋 J’ai une question.'
}
