/**
 * Catalogue piloté par le gérant : prix, prix barré, stock, articles retirés,
 * nouveaux produits et nouvelles catégories viennent de Supabase
 * (`catalog_products`, `catalog_categories`) et s'appliquent au catalogue statique.
 */
import { create } from 'zustand'
import { categories, products, type Category, type PriceOption, type Product } from '../data/products'
import { shortCat } from '../data/nav'
import { supabase, supabaseReady } from './supabase'

/** Tous les produits (y compris retirés) — mêmes objets que `products` */
export const allProducts: Product[] = [...products]
/** Toutes les catégories connues (y compris vides) — pour le back-office */
export const allCategories: Category[] = [...categories]
/** Libellés courts des catégories (back-office) */
export const CATEGORY_LABELS: Record<string, string> = { accessoires: 'Accessoires', vetements: 'Vêtements', chaussures: 'Chaussures', bijoux: 'Bijoux', cheveux: 'Cheveux' }

export interface CatalogRow {
  id: string
  name: string
  category: string
  price: number
  compare_at: number | null
  active: boolean
  stock: number
  low_stock_threshold: number
  updated_at: string
  custom?: boolean
  slug?: string | null
  description?: string | null
  images?: string[] | null
  sizes?: string[] | null
  colors?: { name: string; hex: string }[] | null
  gender?: 'Homme' | 'Femme' | 'Unisexe' | null
  created_at?: string
  /** Options qui changent le prix (perruques : Longueur, Qualité…) */
  price_options?: PriceOption[] | null
  /** Prix avant la dernière baisse + date (badge « Nouveau prix » pendant 14 jours) */
  previous_price?: number | null
  price_changed_at?: string | null
}
export interface CategoryRow { id: string; name: string; tagline: string; custom: boolean; created_at?: string }

const KEY = 'yves-catalog-v2'
export const useCatalogVersion = create<{ v: number }>(() => ({ v: 0 }))

/** Image neutre si un produit n’a pas encore de photo */
export const PLACEHOLDER_IMG = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 400"><rect width="300" height="400" fill="#EFE8DC"/><text x="150" y="215" font-family="Georgia,serif" font-size="34" fill="#B8893B" text-anchor="middle">YVES</text></svg>')

function customProduct(r: CatalogRow): Product {
  const desc = (r.description ?? '').trim()
  const days = r.created_at ? Math.max(0, Math.floor((Date.now() - new Date(r.created_at).getTime()) / 86400000)) : 0
  return {
    id: r.id, slug: r.slug || r.id, name: r.name, category: r.category, price: r.price, compareAt: r.compare_at ?? undefined,
    images: r.images?.length ? r.images : [PLACEHOLDER_IMG], rating: 0, reviewCount: 0,
    gender: r.gender ?? 'Unisexe', ages: ['15-25', '25-50', '50-80'],
    colors: r.colors?.length ? r.colors : undefined, sizes: r.sizes?.length ? r.sizes : undefined,
    badge: days <= 30 ? 'Nouveau' : undefined,
    short: desc ? desc.split(/(?<=[.!?])\s/)[0].slice(0, 120) : r.name,
    description: desc || r.name, details: [], stock: r.stock, addedDaysAgo: days, sold: 0,
  }
}

/** Baisse de prix de moins de 14 jours → badge « Nouveau prix » */
export const NEW_PRICE_DAYS = 14
export const priceDropped = (r: Pick<CatalogRow, 'price' | 'previous_price' | 'price_changed_at'>) =>
  !!r.previous_price && r.previous_price > r.price && !!r.price_changed_at && Date.now() - new Date(r.price_changed_at).getTime() < NEW_PRICE_DAYS * 86400000

let lastSig = ''
export function applyCatalog(rows: CatalogRow[], cats: CategoryRow[] = []) {
  // Catégories créées par le gérant
  for (const c of cats) {
    CATEGORY_LABELS[c.id] = CATEGORY_LABELS[c.id] ?? c.name
    if (!allCategories.some((x) => x.id === c.id)) allCategories.push({ id: c.id, name: c.name, tagline: c.tagline || '', image: PLACEHOLDER_IMG })
    if (!(c.id in shortCat)) (shortCat as Record<string, string>)[c.id] = c.name
  }
  const byId = new Map(rows.map((r) => [r.id, r]))
  // Produits ajoutés par le gérant
  for (const r of rows) {
    if (!r.custom) continue
    const fresh = customProduct(r)
    const ex = allProducts.find((p) => p.id === r.id)
    if (ex) Object.assign(ex, fresh); else allProducts.push(fresh)
  }
  for (const p of allProducts) {
    const r = byId.get(p.id)
    if (!r) continue
    p.price = r.price
    p.compareAt = r.compare_at ?? undefined
    p.stock = r.stock
    p.priceOptions = Array.isArray(r.price_options) && r.price_options.length ? r.price_options : undefined
    p.previousPrice = priceDropped(r) ? r.previous_price! : undefined
  }
  const visible = allProducts.filter((p) => byId.get(p.id)?.active !== false && (!p.id.startsWith('n') || byId.has(p.id)))
  products.splice(0, products.length, ...visible)
  // Une catégorie apparaît sur la boutique dès qu’elle contient un article en vente
  for (const c of allCategories) {
    const items = visible.filter((p) => p.category === c.id)
    if (c.image === PLACEHOLDER_IMG && items[0]) c.image = items[0].images[0]
    const shown = categories.some((x) => x.id === c.id)
    if (items.length && !shown) categories.push(c)
    if (!items.length && shown && CATEGORY_LABELS[c.id] && !['accessoires', 'vetements', 'chaussures', 'bijoux', 'cheveux'].includes(c.id)) categories.splice(categories.findIndex((x) => x.id === c.id), 1)
  }
  const sig = JSON.stringify([rows, cats])
  if (sig !== lastSig) { lastSig = sig; useCatalogVersion.setState((s) => ({ v: s.v + 1 })) }
}

type Snapshot = { rows: CatalogRow[]; cats: CategoryRow[] }
async function fetchRows(): Promise<Snapshot | null> {
  const [p, c] = await Promise.all([
    supabase.from('catalog_products').select('*'),
    supabase.from('catalog_categories').select('*').order('created_at'),
  ])
  if (p.error || !p.data) return null
  const snap = { rows: p.data as CatalogRow[], cats: (c.data as CategoryRow[] | null) ?? [] }
  try { localStorage.setItem(KEY, JSON.stringify(snap)) } catch { /* quota */ }
  return snap
}

/** À appeler avant le premier rendu. Utilise le cache local puis rafraîchit en arrière-plan. */
export async function initCatalog() {
  if (!supabaseReady) return
  let cached: Snapshot | null = null
  try { cached = JSON.parse(localStorage.getItem(KEY) ?? 'null') } catch { cached = null }
  if (cached?.rows?.length) {
    applyCatalog(cached.rows, cached.cats)
    fetchRows().then((s) => s && applyCatalog(s.rows, s.cats))
    return
  }
  const snap = await Promise.race([fetchRows(), new Promise<null>((r) => setTimeout(() => r(null), 2500))])
  if (snap) applyCatalog(snap.rows, snap.cats)
}

/** Rafraîchit le catalogue (après une modification dans le back-office) */
export async function refreshCatalog() {
  const s = await fetchRows()
  if (s) applyCatalog(s.rows, s.cats)
}

/** Identifiant / adresse lisible à partir d’un nom : « Sacs à main » → « sacs-a-main » */
export const slugify = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40)
