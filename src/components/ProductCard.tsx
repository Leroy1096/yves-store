import { Heart, ShoppingCart, Star } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { Product } from '../data/products'
import { cn, discount, fcfa, soldLabel, soldPct } from '../lib/format'
import { useUI, useWishlist } from '../store'
import { Img } from './ui'

interface Props {
  p: Product
  index?: number
  /** Variante « vente flash » : prix rouge + jauge de stock */
  flash?: boolean
  /** Affiche le #hashtag tendance */
  trend?: boolean
  rank?: number
  className?: string
}

export default function ProductCard({ p, flash = false, trend = false, rank, className = '' }: Props) {
  const wished = useWishlist((s) => s.ids.includes(p.id))
  const toggle = useWishlist((s) => s.toggle)
  const setQuick = useUI((s) => s.setQuick)
  const off = discount(p.price, p.compareAt)
  const pct = soldPct(p.id, p.stock)

  return (
    <article className={cn('group relative flex flex-col', className)}>
      <div className="relative aspect-[3/4] overflow-hidden rounded-md bg-ivory-200">
        <Link to={`/produit/${p.slug}`} aria-label={p.name} className="absolute inset-0">
          <Img src={p.images[0]} alt={p.name} className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-[1.04]" />
          <Img src={p.images[1]} alt="" className="absolute inset-0 h-full w-full object-cover opacity-0 transition duration-500 group-hover:opacity-100 max-lg:hidden" />
        </Link>

        {!rank && <div className="pointer-events-none absolute left-0 top-2 flex flex-col items-start gap-1">
          {off > 0 && <span className={cn('rounded-r px-1.5 py-0.5 text-[11px] font-bold text-white', flash ? 'bg-red-600' : 'bg-[#E4572E]')}>-{off}%</span>}
          {p.badge && <span className="rounded-r bg-ink px-1.5 py-0.5 text-[10px] font-semibold text-gold-light">{p.badge === 'Best-seller' ? '★ Best-seller' : p.badge}</span>}
        </div>}
        {rank && <span className="pointer-events-none absolute left-2 top-2 grid h-7 min-w-7 place-items-center rounded bg-gold px-1 text-xs font-black text-ink shadow">TOP {rank}</span>}

        <button
          onClick={() => toggle(p.id)}
          aria-label={wished ? 'Retirer des favoris' : 'Ajouter aux favoris'}
          className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-white/90 shadow-sm transition hover:scale-110"
        >
          <Heart size={15} className={cn('transition', wished ? 'fill-red-500 text-red-500' : 'text-ink')} />
        </button>

        {p.stock <= 12 && !flash && <span className="pointer-events-none absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent px-2 pb-1.5 pt-4 text-[10px] font-semibold text-white">{p.stock <= 0 ? 'Épuisé' : `Plus que ${p.stock} en stock`}</span>}

        <button
          onClick={() => setQuick(p.id)}
          aria-label={`Ajouter ${p.name} au panier`}
          className="absolute bottom-2 right-2 grid h-8 w-8 place-items-center rounded-full bg-white text-ink shadow-md transition hover:bg-ink hover:text-gold-light lg:translate-y-2 lg:opacity-0 lg:group-hover:translate-y-0 lg:group-hover:opacity-100"
        >
          <ShoppingCart size={15} />
        </button>
      </div>

      <div className="mt-2 flex flex-1 flex-col px-0.5">
        {trend && p.hashtag && <span className="mb-1 w-fit rounded-sm bg-gold/15 px-1.5 py-0.5 text-[10px] font-bold text-gold-dark">{p.hashtag}</span>}
        <Link to={`/produit/${p.slug}`} className="line-clamp-1 text-[12.5px] leading-snug text-ink-700 hover:text-ink sm:text-[13px]">{p.name}</Link>
        <div className="mt-1 flex flex-wrap items-baseline gap-x-1.5">
          <span className={cn('text-[15px] font-extrabold tracking-tight', off > 0 ? 'text-red-600' : 'text-ink')}>{fcfa(p.price)}</span>
          {p.compareAt && <span className="text-[11px] text-ink-400 line-through">{fcfa(p.compareAt)}</span>}
        </div>
        {flash ? (
          <div className="mt-1.5">
            <div className="h-1.5 overflow-hidden rounded-full bg-red-100"><div className="h-full rounded-full bg-gradient-to-r from-red-500 to-orange-400" style={{ width: `${pct}%` }} /></div>
            <p className="mt-1 text-[10px] font-semibold text-red-600">{pct}% vendu{pct > 80 && ' · Presque épuisé'}</p>
          </div>
        ) : (
          <div className="mt-1 flex items-center gap-1 overflow-hidden whitespace-nowrap text-[11px] text-ink-400">
            {p.reviewCount > 0 ? (<>
              <Star size={11} className="fill-gold text-gold" /> <span className="font-semibold text-ink-700">{p.rating.toFixed(1).replace('.', ',')}</span>
              <span className="text-ink/20">|</span> <span>{soldLabel(p.sold)} vendus</span>
            </>) : <span className="font-semibold text-gold-dark">✨ Nouveauté</span>}
          </div>
        )}
        {p.colors && p.colors.length > 1 && !flash && (
          <div className="mt-1.5 flex gap-1">{p.colors.map((c) => <span key={c.name} title={c.name} className="h-3 w-3 rounded-full border border-ink/15" style={{ background: c.hex }} />)}</div>
        )}
      </div>
    </article>
  )
}
