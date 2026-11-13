import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { products, type Review } from '../data/products'
import type { ShippingId } from '../lib/format'

export interface CartLine { key: string; productId: string; qty: number; size?: string; color?: string }

interface CartState {
  lines: CartLine[]
  promo: string | null
  add: (l: Omit<CartLine, 'key' | 'qty'>, qty?: number) => void
  setQty: (key: string, qty: number) => void
  remove: (key: string) => void
  clear: () => void
  setPromo: (code: string | null) => void
}

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      lines: [],
      promo: null,
      add: (l, qty = 1) =>
        set((s) => {
          const key = [l.productId, l.size, l.color].filter(Boolean).join('|')
          const stock = products.find((p) => p.id === l.productId)?.stock ?? 99
          if (stock <= 0) return s // article épuisé
          const ex = s.lines.find((x) => x.key === key)
          if (ex) return { lines: s.lines.map((x) => (x.key === key ? { ...x, qty: Math.min(stock, x.qty + qty) } : x)) }
          return { lines: [...s.lines, { ...l, key, qty: Math.min(stock, qty) }] }
        }),
      setQty: (key, qty) =>
        set((s) => ({ lines: qty <= 0 ? s.lines.filter((x) => x.key !== key) : s.lines.map((x) => (x.key === key ? { ...x, qty } : x)) })),
      remove: (key) => set((s) => ({ lines: s.lines.filter((x) => x.key !== key) })),
      clear: () => set({ lines: [], promo: null }),
      setPromo: (promo) => set({ promo }),
    }),
    { name: 'yves-cart', version: 1 },
  ),
)

export const cartDetailed = (lines: CartLine[]) =>
  lines
    .map((l) => ({ ...l, product: products.find((p) => p.id === l.productId)! }))
    .filter((l) => l.product)

export const cartCount = (lines: CartLine[]) => lines.filter((l) => products.some((p) => p.id === l.productId)).reduce((a, l) => a + l.qty, 0)
export const cartSubtotal = (lines: CartLine[]) => cartDetailed(lines).reduce((a, l) => a + l.qty * l.product.price, 0)

interface WishState { ids: string[]; toggle: (id: string) => void }
export const useWishlist = create<WishState>()(
  persist(
    (set) => ({ ids: [], toggle: (id) => set((s) => ({ ids: s.ids.includes(id) ? s.ids.filter((x) => x !== id) : [...s.ids, id] })) }),
    { name: 'yves-wishlist' },
  ),
)

interface ReviewState { mine: Review[]; add: (r: Review) => void }
export const useReviews = create<ReviewState>()(
  persist((set) => ({ mine: [], add: (r) => set((s) => ({ mine: [r, ...s.mine] })) }), { name: 'yves-reviews' }),
)

export interface Order {
  id: string
  createdAt: string
  customer: { firstName: string; lastName: string; phone: string; email: string }
  address: { city: string; commune: string; details: string }
  shipping: ShippingId
  payment: string
  lines: { id?: string; name: string; qty: number; price: number; image: string; size?: string; color?: string }[]
  subtotal: number
  discount: number
  shippingCost: number
  total: number
  status?: string
  cancelledAt?: string
  cancelReason?: string
}
interface OrderState { orders: Order[]; add: (o: Order) => void; cancel: (id: string, reason: string, at?: string) => void }
export const useOrders = create<OrderState>()(
  persist((set) => ({
    orders: [],
    add: (o) => set((s) => ({ orders: [o, ...s.orders] })),
    cancel: (id, reason, at) => set((s) => ({ orders: s.orders.map((o) => (o.id === id ? { ...o, status: 'annulee', cancelledAt: at ?? new Date().toISOString(), cancelReason: reason } : o)) })),
  }), { name: 'yves-orders' }),
)

interface RecentState { ids: string[]; push: (id: string) => void; clear: () => void }
export const useRecent = create<RecentState>()(
  persist(
    (set) => ({
      ids: [],
      push: (id) => set((s) => ({ ids: [id, ...s.ids.filter((x) => x !== id)].slice(0, 16) })),
      clear: () => set({ ids: [] }),
    }),
    { name: 'yves-recent' },
  ),
)

interface UIState {
  quickId: string | null
  setQuick: (id: string | null) => void
  cartOpen: boolean
  searchOpen: boolean
  toast: { id: number; text: string; image?: string } | null
  openCart: () => void
  closeCart: () => void
  setSearch: (v: boolean) => void
  notify: (text: string, image?: string) => void
}
export const useUI = create<UIState>()((set) => ({
  quickId: null,
  setQuick: (quickId) => set({ quickId }),
  cartOpen: false,
  searchOpen: false,
  toast: null,
  openCart: () => set({ cartOpen: true }),
  closeCart: () => set({ cartOpen: false }),
  setSearch: (searchOpen) => set({ searchOpen }),
  notify: (text, image) => {
    const id = Date.now()
    set({ toast: { id, text, image } })
    setTimeout(() => set((s) => (s.toast?.id === id ? { toast: null } : s)), 2600)
  },
}))
