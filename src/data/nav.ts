import type { CategoryId } from './products'

export interface NavItem {
  label: string
  to: string
  cat?: CategoryId
  hot?: boolean
}

/** Barre de catégories horizontale (structure type Shein) */
export const navItems: NavItem[] = [
  { label: 'Nouveautés', to: '/boutique?tri=nouveautes' },
  { label: 'Ventes Flash', to: '/boutique?flash=1', hot: true },
  { label: 'Livraison 24 h', to: '/boutique?express=1' },
  { label: 'Femme', to: '/boutique?genre=Femme' },
  { label: 'Homme', to: '/boutique?genre=Homme' },
  { label: 'Téléphone & Tech', to: '/boutique?cat=accessoires', cat: 'accessoires' },
  { label: 'Vêtements', to: '/boutique?cat=vetements', cat: 'vetements' },
  { label: 'Chaussures', to: '/boutique?cat=chaussures', cat: 'chaussures' },
  { label: 'Bijoux', to: '/boutique?cat=bijoux', cat: 'bijoux' },
  { label: 'Cheveux', to: '/boutique?cat=cheveux', cat: 'cheveux' },
  { label: 'Petits prix', to: '/boutique?prix=10000' },
  { label: 'Promos', to: '/boutique?promo=1', hot: true },
]

export const trendingSearches = ['Black Friday', 'Chaîne or', 'Écouteurs', 'Perruque', 'Wax', 'Baskets', 'Karité', 'Montre', 'Chargeur']

export const shortCat: Record<CategoryId, string> = {
  accessoires: 'Téléphone & Tech',
  vetements: 'Vêtements',
  chaussures: 'Chaussures',
  bijoux: 'Bijoux',
  cheveux: 'Cheveux',
}
