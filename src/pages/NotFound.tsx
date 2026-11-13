import { Link } from 'react-router-dom'
import { Page } from '../components/ui'

export default function NotFound() {
  return (
    <Page>
      <section className="container-x flex min-h-[60vh] flex-col items-center justify-center py-24 text-center">
        <p className="font-display text-[120px] leading-none text-gold sm:text-[180px]">404</p>
        <h1 className="h-display mt-2 text-4xl">Cette page s’est égarée</h1>
        <p className="mt-3 text-ink-500">Le produit ou la page que vous cherchez n’existe plus.</p>
        <Link to="/boutique" className="btn-dark mt-8">Retour à la boutique</Link>
      </section>
    </Page>
  )
}
