import { AnimatePresence, motion } from 'framer-motion'
import { Minus, Plus, ShoppingBag, Trash2, Truck, X } from 'lucide-react'
import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { products } from '../data/products'
import { FREE_SHIPPING, fcfa } from '../lib/format'
import { cartDetailed, cartSubtotal, useCart, useUI } from '../store'
import { Img } from './ui'
import { useAuth } from '../store/auth'

export default function CartDrawer() {
  const { cartOpen, closeCart } = useUI()
  const { lines, setQty, remove, add } = useCart()
  const nav = useNavigate()
  const signedIn = useAuth((s) => !!s.user)
  const items = cartDetailed(lines)
  const subtotal = cartSubtotal(lines)
  const remaining = Math.max(0, FREE_SHIPPING - subtotal)
  const pct = Math.min(100, (subtotal / FREE_SHIPPING) * 100)
  const upsell = products.filter((p) => !lines.some((l) => l.productId === p.id) && p.price <= 9500 && !p.sizes && !p.priceOptions?.length).slice(0, 3)

  useEffect(() => {
    document.body.style.overflow = cartOpen ? 'hidden' : ''
    const k = (e: KeyboardEvent) => e.key === 'Escape' && closeCart()
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [cartOpen, closeCart])

  return (
    <AnimatePresence>
      {cartOpen && (
        <>
          <motion.div className="fixed inset-0 z-[70] bg-ink/50 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={closeCart} />
          <motion.aside
            role="dialog" aria-label="Panier"
            className="fixed inset-y-0 right-0 z-[71] flex w-full max-w-[440px] flex-col bg-ivory shadow-2xl"
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 32, stiffness: 320 }}
          >
            <div className="flex items-center justify-between border-b border-ink/10 px-6 py-5">
              <h2 className="font-display text-2xl">Votre panier <span className="text-ink-400">({items.reduce((a, l) => a + l.qty, 0)})</span></h2>
              <button onClick={closeCart} className="rounded-full p-2 hover:bg-ink/5" aria-label="Fermer le panier"><X size={20} /></button>
            </div>

            {items.length > 0 && (
              <div className="border-b border-ink/10 px-6 py-4">
                <p className="flex items-center gap-2 text-[13px]">
                  <Truck size={16} className="text-gold" />
                  {remaining > 0 ? <>Plus que <b>{fcfa(remaining)}</b> pour la livraison offerte</> : <b>Félicitations ! La livraison est offerte 🎉</b>}
                </p>
                <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-ink/10">
                  <motion.div className="h-full rounded-full bg-gradient-to-r from-gold-dark to-gold-light" initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, ease: 'easeOut' }} />
                </div>
              </div>
            )}

            <div className="flex-1 overflow-y-auto px-6">
              {items.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <div className="grid h-20 w-20 place-items-center rounded-full bg-ivory-200"><ShoppingBag size={30} className="text-gold" /></div>
                  <p className="mt-5 font-display text-2xl">Votre panier est vide</p>
                  <p className="mt-1 text-sm text-ink-500">Découvrez nos nouveautés et best-sellers.</p>
                  <button onClick={() => { closeCart(); nav('/boutique') }} className="btn-dark mt-6">Découvrir la boutique</button>
                </div>
              ) : (
                <ul className="divide-y divide-ink/10">
                  <AnimatePresence initial={false}>
                    {items.map((l) => (
                      <motion.li key={l.key} layout initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 60, height: 0 }} className="flex gap-4 py-5">
                        <Link to={`/produit/${l.product.slug}`} onClick={closeCart} className="shrink-0">
                          <Img src={l.product.images[0]} alt={l.product.name} className="h-28 w-[88px] rounded-xl object-cover" />
                        </Link>
                        <div className="flex min-w-0 flex-1 flex-col">
                          <div className="flex justify-between gap-2">
                            <Link to={`/produit/${l.product.slug}`} onClick={closeCart} className="font-display text-lg leading-tight hover:text-gold-dark">{l.product.name}</Link>
                            <button onClick={() => remove(l.key)} className="h-fit p-1 text-ink-400 hover:text-red-700" aria-label="Retirer"><Trash2 size={15} /></button>
                          </div>
                          <p className="mt-0.5 text-xs text-ink-400">{l.variant}</p>
                          <div className="mt-auto flex items-center justify-between pt-3">
                            <div className="flex items-center rounded-full border border-ink/15">
                              <button onClick={() => setQty(l.key, l.qty - 1)} className="p-2 hover:text-gold" aria-label="Diminuer"><Minus size={13} /></button>
                              <span className="w-6 text-center text-sm font-semibold">{l.qty}</span>
                              <button onClick={() => setQty(l.key, Math.min(l.product.stock, l.qty + 1))} className="p-2 hover:text-gold" aria-label="Augmenter"><Plus size={13} /></button>
                            </div>
                            <span className="font-semibold">{fcfa(l.qty * l.unit)}</span>
                          </div>
                        </div>
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ul>
              )}
              {items.length > 0 && upsell.length > 0 && (
                <div className="mb-6 rounded-2xl bg-ivory-200/70 p-4">
                  <p className="eyebrow mb-3">Complétez votre panier</p>
                  <div className="space-y-3">
                    {upsell.map((p) => (
                      <div key={p.id} className="flex items-center gap-3">
                        <Img src={p.images[0]} alt={p.name} className="h-14 w-12 rounded-lg object-cover" />
                        <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{p.name}</p><p className="text-xs text-ink-500">{fcfa(p.price)}</p></div>
                        <button onClick={() => add({ productId: p.id, color: p.colors?.[0]?.name })} className="grid h-8 w-8 place-items-center rounded-full bg-ink text-ivory transition hover:bg-gold hover:text-ink" aria-label={`Ajouter ${p.name}`}><Plus size={14} /></button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {items.length > 0 && (
              <div className="border-t border-ink/10 bg-ivory-100 px-6 py-5">
                <div className="flex items-center justify-between text-sm"><span className="text-ink-500">Sous-total</span><span className="text-lg font-semibold">{fcfa(subtotal)}</span></div>
                <p className="mt-1 text-xs text-ink-400">Livraison et codes promo calculés à l’étape suivante.</p>
                <button onClick={() => { closeCart(); nav(signedIn ? '/commande' : '/compte?redirect=/commande&raison=commande') }} className="btn-dark mt-4 w-full">{signedIn ? 'Commander' : 'Se connecter pour commander'} • {fcfa(subtotal)}</button>
                {!signedIn && <p className="mt-2 text-center text-[11px] text-ink-400">Un compte client est nécessaire pour passer commande.</p>}
                <button onClick={closeCart} className="mt-2 w-full py-2 text-xs font-semibold uppercase tracking-[0.14em] text-ink-500 hover:text-ink">Continuer mes achats</button>
              </div>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
