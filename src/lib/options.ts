/** Options de prix (ex. perruques : Longueur 12″ / 20″, Qualité Standard / Premium) */
import type { PriceOption, Product } from '../data/products'
export type { PriceOption }
export type OptionPick = Record<string, string>

export const hasOptions = (p?: Pick<Product, 'priceOptions'> | null) => !!p?.priceOptions?.length

/** Supplément total des options choisies (0 si rien de choisi) */
export function optionDelta(p: Pick<Product, 'priceOptions'>, pick?: OptionPick | null) {
  if (!p.priceOptions?.length || !pick) return 0
  return p.priceOptions.reduce((a, g) => a + (g.choices.find((c) => c.label === pick[g.group])?.delta ?? 0), 0)
}
export const unitPrice = (p: Pick<Product, 'price' | 'priceOptions'>, pick?: OptionPick | null) => p.price + optionDelta(p, pick)

/** Toutes les options obligatoires sont-elles choisies (avec un choix qui existe encore) ? */
export const optionsComplete = (p: Pick<Product, 'priceOptions'>, pick?: OptionPick | null) =>
  !p.priceOptions?.length || p.priceOptions.every((g) => g.choices.some((c) => c.label === pick?.[g.group]))
export const missingOption = (p: Pick<Product, 'priceOptions'>, pick?: OptionPick | null) =>
  p.priceOptions?.find((g) => !g.choices.some((c) => c.label === pick?.[g.group]))?.group

/** « 20 pouces · Premium » */
export const optionsText = (pick?: OptionPick | null) => Object.values(pick ?? {}).filter(Boolean).join(' · ')

/** Prix mini / maxi selon les options */
export function priceRange(p: Pick<Product, 'price' | 'priceOptions'>) {
  let min = p.price, max = p.price
  for (const g of p.priceOptions ?? []) {
    const ds = g.choices.map((c) => c.delta)
    min += Math.min(...ds); max += Math.max(...ds)
  }
  return { min, max }
}

/** Sélection par défaut : le choix sans supplément (sinon le premier) de chaque option */
export const defaultPick = (p: Pick<Product, 'priceOptions'>): OptionPick =>
  Object.fromEntries((p.priceOptions ?? []).map((g) => [g.group, (g.choices.find((c) => c.delta === 0) ?? g.choices[0]).label]))

/** Tailles à afficher : masquées si une option de prix porte le même nom (ex. « Longueur » des perruques) */
const norm = (x: string) => x.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
export const visibleSizes = (p: Pick<Product, 'sizes' | 'sizeLabel' | 'priceOptions'>) =>
  p.sizes && !p.priceOptions?.some((g) => norm(g.group) === norm(p.sizeLabel ?? 'Taille')) ? p.sizes : undefined
