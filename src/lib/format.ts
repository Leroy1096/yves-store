export const fcfa = (n: number) => `${new Intl.NumberFormat('fr-FR').format(Math.round(n)).replace(/\u202f|\u00a0/g, ' ')} FCFA`
export const discount = (price: number, compareAt?: number) => (compareAt ? Math.round((1 - price / compareAt) * 100) : 0)
export const cn = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ')

export const FREE_SHIPPING = 50000
export const SHIPPING = {
  abidjan: { label: 'Livraison express Abidjan', eta: 'Sous 24 h', price: 2000 },
  interieur: { label: 'Livraison intérieur du pays', eta: '48 – 72 h', price: 3500 },
  retrait: { label: 'Retrait en boutique', eta: 'Dès demain — Agboville ou Cocody', price: 0 },
} as const
export type ShippingId = keyof typeof SHIPPING

export const PROMOS: Record<string, { label: string; apply: (subtotal: number) => number }> = {
  YVES10: { label: '-10 % sur la commande', apply: (s) => Math.round(s * 0.1) },
  BIENVENUE: { label: '-5 000 FCFA dès 30 000 FCFA', apply: (s) => (s >= 30000 ? 5000 : 0) },
}

/** 1234 → « 1,2k+ » (style marketplace) */
export const soldLabel = (n = 0) => (n >= 1000 ? `${(n / 1000).toFixed(1).replace('.', ',').replace(',0', '')}k+` : n >= 100 ? `${Math.floor(n / 100) * 100}+` : `${n}`)
/** Pourcentage « vendu » pour la jauge vente flash (stable par produit) */
export const soldPct = (id: string, stock: number) => Math.min(94, 52 + ((id.charCodeAt(1) * 7 + id.charCodeAt(2) * 13) % 38) + (stock < 15 ? 8 : 0))
