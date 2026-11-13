import { categories, subcategories, type Product } from '../data/products'

export const normalize = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
export const matches = (q: string, text: string) => normalize(q).split(/\s+/).filter(Boolean).every((w) => normalize(text).includes(w))

export const searchText = (p: Product) =>
  `${p.name} ${p.short} ${p.description} ${p.gender} ${categories.find((c) => c.id === p.category)?.name ?? ''} ${subcategories.find((s) => s.id === p.sub)?.name ?? ''} ${p.hashtag ?? ''} ${p.colors?.map((c) => c.name).join(' ') ?? ''}`
