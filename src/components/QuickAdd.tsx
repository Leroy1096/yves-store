import { AnimatePresence, motion } from 'framer-motion'
import { ChevronRight, Minus, Plus, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { products } from '../data/products'
import { cn, discount, fcfa } from '../lib/format'
import { useCart, useUI } from '../store'
import { defaultPick, unitPrice, visibleSizes, type OptionPick } from '../lib/options'
import OptionPicker from './OptionPicker'
import { Img, Stars } from './ui'

/** Fenêtre « Ajout rapide » : choix couleur / taille sans quitter la page (comme sur Shein) */
export default function QuickAdd() {
  const quickId = useUI((s) => s.quickId)
  const setQuick = useUI((s) => s.setQuick)
  const notify = useUI((s) => s.notify)
  const openCart = useUI((s) => s.openCart)
  const add = useCart((s) => s.add)
  const p = products.find((x) => x.id === quickId)
  const [img, setImg] = useState(0)
  const [color, setColor] = useState<string>()
  const [size, setSize] = useState<string>()
  const [qty, setQty] = useState(1)
  const [err, setErr] = useState(false)
  const [pick, setPick] = useState<OptionPick>({})

  useEffect(() => {
    if (!p) return
    setImg(0); setQty(1); setErr(false)
    setColor(p.colors?.[0]?.name)
    setSize(p.sizes?.length === 1 ? p.sizes[0] : undefined)
    setPick(defaultPick(p))
  }, [p])
  useEffect(() => {
    document.body.style.overflow = p ? 'hidden' : ''
    const k = (e: KeyboardEvent) => e.key === 'Escape' && setQuick(null)
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [p, setQuick])

  const sizes = p ? visibleSizes(p) : undefined
  const submit = () => {
    if (!p) return
    if (p.stock <= 0) return
    if (sizes?.length && !size) { setErr(true); return }
    add({ productId: p.id, size: sizes ? size : undefined, color, options: p.priceOptions?.length ? pick : undefined }, qty)
    notify(`${p.name} ajouté au panier`, p.images[0])
    setQuick(null)
    openCart()
  }

  return (
    <AnimatePresence>
      {p && (
        <>
          <motion.div className="fixed inset-0 z-[70] bg-ink/50 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setQuick(null)} />
          <div className="pointer-events-none fixed inset-0 z-[71] flex items-end justify-center sm:items-center sm:p-6">
          <motion.div
            role="dialog" aria-modal="true" aria-label={`Ajout rapide : ${p.name}`}
            initial={{ y: '100%', opacity: 0.6 }} animate={{ y: 0, opacity: 1 }} exit={{ y: '100%', opacity: 0 }} transition={{ type: 'spring', damping: 32, stiffness: 320 }}
            className="pointer-events-auto relative max-h-[90vh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:w-[760px] sm:rounded-3xl sm:p-7"
          >
            <button onClick={() => setQuick(null)} className="absolute right-4 top-4 z-10 grid h-9 w-9 place-items-center rounded-full bg-ivory-200 hover:bg-ink hover:text-ivory" aria-label="Fermer"><X size={18} /></button>
            <div className="grid gap-5 sm:grid-cols-[280px_1fr] sm:gap-7">
              <div className="flex gap-3 sm:block">
                <div className="aspect-[3/4] w-28 shrink-0 overflow-hidden rounded-xl bg-ivory-200 sm:w-full"><Img src={p.images[img]} alt={p.name} className="h-full w-full object-cover" /></div>
                <div className="flex min-w-0 flex-col justify-end sm:hidden">
                  <p className="line-clamp-2 pr-8 text-sm">{p.name}</p>
                  <p className={cn('mt-1 text-xl font-extrabold', !!p.compareAt && 'text-red-600')}>{fcfa(unitPrice(p, pick))}</p>
                  {p.compareAt && <p className="text-xs text-ink-400"><s>{fcfa(p.compareAt)}</s> <b className="text-red-600">-{discount(p.price, p.compareAt)}%</b></p>}
                </div>
                <div className="mt-2 hidden gap-2 sm:flex">
                  {p.images.map((s, i) => <button key={s} onClick={() => setImg(i)} className={cn('h-16 w-12 overflow-hidden rounded-md border-2', img === i ? 'border-ink' : 'border-transparent opacity-70')}><Img src={s} alt="" className="h-full w-full object-cover" /></button>)}
                </div>
              </div>
              <div className="flex flex-col">
                <div className="hidden sm:block">
                  <p className="pr-10 text-lg leading-snug">{p.name}</p>
                  {p.reviewCount > 0 && <div className="mt-1 flex items-center gap-2 text-xs text-ink-500"><Stars value={p.rating} size={12} /> {p.reviewCount} avis</div>}
                  <div className="mt-3 flex items-baseline gap-2">
                    <span className={cn('text-2xl font-extrabold', !!p.compareAt && 'text-red-600')}>{fcfa(unitPrice(p, pick))}</span>
                    {!!p.previousPrice && <span className="rounded bg-emerald-600 px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">Nouveau prix</span>}
                    {p.compareAt && <><s className="text-sm text-ink-400">{fcfa(p.compareAt)}</s><span className="rounded bg-red-600 px-1.5 py-0.5 text-xs font-bold text-white">-{discount(p.price, p.compareAt)}%</span></>}
                  </div>
                </div>
                {p.colors && (
                  <div className="mt-4">
                    <p className="text-sm">Couleur : <b>{color}</b></p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {p.colors.map((c) => <button key={c.name} onClick={() => setColor(c.name)} title={c.name} className={cn('h-9 w-9 rounded-full border-2 p-0.5', color === c.name ? 'border-ink' : 'border-ink/10')}><span className="block h-full w-full rounded-full" style={{ background: c.hex }} /></button>)}
                    </div>
                  </div>
                )}
                <OptionPicker p={p} pick={pick} onPick={setPick} compact />
                {sizes && (
                  <div className="mt-4">
                    <p className={cn('text-sm', err && 'font-semibold text-red-600')}>{p.sizeLabel ?? 'Taille'} : {size ? <b>{size}</b> : err ? 'veuillez choisir' : <span className="text-ink-400">sélectionnez</span>}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {sizes.map((s) => <button key={s} onClick={() => { setSize(s); setErr(false) }} className={cn('min-w-[48px] rounded-full border px-3.5 py-2 text-sm transition', size === s ? 'border-ink bg-ink text-ivory' : err ? 'border-red-300' : 'border-ink/15 hover:border-ink')}>{s}</button>)}
                    </div>
                  </div>
                )}
                <div className="mt-4 flex items-center gap-3">
                  <p className="text-sm">Quantité</p>
                  <div className="flex items-center rounded-full border border-ink/15">
                    <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="grid h-9 w-9 place-items-center" aria-label="Moins"><Minus size={14} /></button>
                    <span className="w-8 text-center text-sm font-semibold">{qty}</span>
                    <button onClick={() => setQty((q) => Math.min(p.stock, q + 1))} className="grid h-9 w-9 place-items-center" aria-label="Plus"><Plus size={14} /></button>
                  </div>
                  {p.stock > 0 && p.stock <= 12 && <span className="text-xs font-semibold text-red-600">Plus que {p.stock} !</span>}
                </div>
                <button onClick={submit} disabled={p.stock <= 0} className="mt-6 w-full rounded-full bg-ink py-3.5 text-sm font-bold uppercase tracking-wider text-ivory transition hover:bg-gold hover:text-ink disabled:cursor-not-allowed disabled:opacity-50">{p.stock <= 0 ? 'Épuisé' : <>Ajouter au panier — {fcfa(unitPrice(p, pick) * qty)}</>}</button>
                <Link to={`/produit/${p.slug}`} onClick={() => setQuick(null)} className="mt-3 flex items-center justify-center gap-1 text-xs font-semibold text-ink-500 hover:text-ink">Voir tous les détails <ChevronRight size={14} /></Link>
              </div>
            </div>
          </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}
