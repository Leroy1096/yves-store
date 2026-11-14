// Coordonnées officielles YVES STORE — un seul endroit à modifier si le numéro change
import type { CartLine } from '../store'
import { products, getProduct } from '../data/products'
import { optionsText, unitPrice } from './options'
import { fcfa } from './format'

/** Numéro WhatsApp au format international, sans + ni espaces (wa.me) */
export const WHATSAPP_NUMBER = '2250140810415'
/** Numéro affiché sur le site */
export const PHONE_DISPLAY = '+225 01 40 81 04 15'
export const PHONE_TEL = '+2250140810415'

/** Message d'accueil de la BOUTIQUE (texte fourni par YVES STORE) — à coller dans WhatsApp Business →
 *  Outils professionnels → Message d'accueil. Il n'est plus pré-rempli côté client (voir waClientMessage). */
export const WA_WELCOME = "👋 Bonjour et bienvenue chez YVES STORE 🛍️\n\n🛒 1. J'AI UN BESOIN :\n- Acheter un article\n- Effectuer un paiement\n- Organiser une livraison\n\n🛠️ 2. J'AI UN PROBLÈME :\n- Problème technique\n- Problème de paiement\n- Problème de livraison\n\n📩 Merci de préciser votre demande.\n\nYVES STORE ❤️"


/** Lien WhatsApp (avec message pré-rempli facultatif) */
export const waLink = (text?: string) =>
  `https://wa.me/${WHATSAPP_NUMBER}${text ? `?text=${encodeURIComponent(text)}` : ''}`

// ───────────── Message envoyé PAR LE CLIENT (même menu que l'accueil, mais à la 1re personne) ─────────────
export interface WaTopic { id: string; group: 'besoin' | 'probleme'; emoji: string; label: string; line: string; hint: string }
export const WA_TOPICS: WaTopic[] = [
  { id: 'achat', group: 'besoin', emoji: '🛒', label: 'Acheter un article', line: 'J’ai un besoin : acheter un article.', hint: 'Article souhaité (nom, taille, couleur) :' },
  { id: 'paiement', group: 'besoin', emoji: '💳', label: 'Effectuer un paiement', line: 'J’ai un besoin : effectuer un paiement.', hint: 'N° de commande et moyen de paiement (Wave, Orange Money, MTN, Moov) :' },
  { id: 'livraison', group: 'besoin', emoji: '🚚', label: 'Organiser une livraison', line: 'J’ai un besoin : organiser une livraison.', hint: 'Ville, commune et jour souhaité :' },
  { id: 'technique', group: 'probleme', emoji: '🛠️', label: 'Problème technique', line: 'J’ai un problème technique (site, compte ou connexion).', hint: 'Ce qui ne fonctionne pas :' },
  { id: 'pb-paiement', group: 'probleme', emoji: '⚠️', label: 'Problème de paiement', line: 'J’ai un problème de paiement.', hint: 'N° de commande, moyen de paiement et montant :' },
  { id: 'pb-livraison', group: 'probleme', emoji: '📦', label: 'Problème de livraison', line: 'J’ai un problème de livraison.', hint: 'N° de commande et problème rencontré :' },
]

/** Message pré-rempli écrit au nom du client, prêt à compléter */
export function waClientMessage(topic?: WaTopic, ctx: { name?: string; product?: string } = {}) {
  const parts = ['👋 Bonjour YVES STORE 🛍️']
  if (ctx.name) parts.push(`Je suis ${ctx.name}, client(e) inscrit(e) sur votre site.`)
  if (topic) parts.push(`${topic.emoji} ${topic.line}`)
  if (ctx.product) parts.push(`🔎 Article consulté : ${ctx.product}`)
  parts.push(`✍️ ${topic ? topic.hint : 'Ma demande :'} `)
  return parts.join('\n\n')
}
/** Lien générique (pied de page) */
export const WA_CLIENT_LINK = waLink(waClientMessage())

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
    const total = inCart.reduce((a, { l, p }) => a + l.qty * unitPrice(p, l.options), 0)
    const list = inCart
      .map(({ l, p }) => `• ${l.qty} × ${p.name}${[l.size, l.color, optionsText(l.options)].filter(Boolean).length ? ` (${[l.size, l.color, optionsText(l.options)].filter(Boolean).join(', ')})` : ''} — ${fcfa(l.qty * unitPrice(p, l.options))}`)
      .join('\n')
    return `Bonjour YVES STORE 👋\nJe souhaite commander :\n${list}\nTotal articles : ${fcfa(total)}\nMerci de me confirmer la disponibilité et la livraison.`
  }
  return 'Bonjour YVES STORE 👋 J’ai une question.'
}
