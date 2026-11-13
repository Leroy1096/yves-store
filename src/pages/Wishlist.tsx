import { Heart } from 'lucide-react'
import { Link } from 'react-router-dom'
import ProductCard from '../components/ProductCard'
import { Page } from '../components/ui'
import { products } from '../data/products'
import { useWishlist } from '../store'

export default function Wishlist() {
  const ids = useWishlist((s) => s.ids)
  const items = products.filter((p) => ids.includes(p.id))
  return (
    <Page>
      <section className="container-x py-14">
        <p className="eyebrow">Ma sélection</p>
        <h1 className="h-display mt-3 text-5xl sm:text-6xl">Mes favoris</h1>
        {items.length === 0 ? (
          <div className="mt-12 rounded-3xl border border-dashed border-ink/20 py-24 text-center">
            <Heart size={32} className="mx-auto text-gold" />
            <p className="mt-4 font-display text-3xl">Aucun favori pour l’instant</p>
            <p className="mt-2 text-sm text-ink-500">Touchez le cœur sur un produit pour le retrouver ici.</p>
            <Link to="/boutique" className="btn-dark mt-6">Explorer la boutique</Link>
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-2 gap-x-2.5 gap-y-5 sm:grid-cols-3 sm:gap-x-3 lg:grid-cols-5">{items.map((p) => <ProductCard key={p.id} p={p} />)}</div>
        )}
      </section>
    </Page>
  )
}
