import { MapPin, Phone, Mail, Clock } from 'lucide-react'
import { useState } from 'react'
import { PHONE_DISPLAY, PHONE_TEL, WA_CLIENT_LINK } from '../lib/contact'
import { Link } from 'react-router-dom'
import { categories } from '../data/products'
import { Logo, PaymentBadges, Social } from './ui'

export default function Footer() {
  const [email, setEmail] = useState('')
  const [done, setDone] = useState(false)
  return (
    <footer className="relative overflow-hidden bg-ink pb-[58px] text-ivory grain lg:pb-0">
      <div className="container-x relative grid gap-12 border-b border-ivory/10 py-16 lg:grid-cols-[1.3fr_1fr]">
        <div>
          <p className="eyebrow">La newsletter YVES</p>
          <h3 className="h-display mt-3 text-4xl sm:text-5xl">Les nouveautés avant tout le monde.</h3>
          <p className="mt-3 max-w-md text-ivory/60">Ventes privées, arrivages et conseils style — un e-mail par semaine, pas plus.</p>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); if (/\S+@\S+\.\S+/.test(email)) setDone(true) }} className="self-end">
          {done ? (
            <p className="rounded-2xl border border-gold/40 bg-gold/10 p-5 text-gold-light">Merci ! Votre code <b>BIENVENUE</b> vous attend dans votre boîte mail.</p>
          ) : (
            <div className="flex flex-col gap-3 sm:flex-row">
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Votre adresse e-mail" className="flex-1 rounded-full border border-ivory/20 bg-transparent px-6 py-4 text-sm outline-none placeholder:text-ivory/40 focus:border-gold" />
              <button className="btn-gold">S’inscrire</button>
            </div>
          )}
        </form>
      </div>
      <div className="container-x relative grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Logo light />
          <p className="mt-5 max-w-xs text-sm leading-relaxed text-ivory/60">Parce que votre style raconte qui vous êtes. Mode, bijoux, chaussures, accessoires et soins capillaires choisis avec cœur, pour vous sublimer chaque jour.</p>
          <div className="mt-6 flex gap-3">
            {[Social.Instagram, Social.Facebook, Social.TikTok].map((I, i) => (
              <a key={i} href="#" className="grid h-10 w-10 place-items-center rounded-full border border-ivory/15 text-ivory/80 transition hover:border-gold hover:text-gold" aria-label="Réseau social"><I /></a>
            ))}
            <a href={WA_CLIENT_LINK} target="_blank" rel="noopener noreferrer" className="grid h-10 w-10 place-items-center rounded-full border border-[#25D366]/60 text-[#25D366] transition hover:bg-[#25D366] hover:text-white" aria-label="WhatsApp YVES STORE"><Social.WhatsApp /></a>
          </div>
        </div>
        <div>
          <p className="eyebrow mb-4">Boutique</p>
          <ul className="space-y-2.5 text-sm text-ivory/70">
            {categories.map((c) => <li key={c.id}><Link to={`/boutique?cat=${c.id}`} className="hover:text-gold-light">{c.name}</Link></li>)}
          </ul>
        </div>
        <div>
          <p className="eyebrow mb-4">Aide</p>
          <ul className="space-y-2.5 text-sm text-ivory/70">
            <li>Livraison & délais</li><li>Retours sous 7 jours</li><li>Guide des tailles</li><li>Paiement sécurisé</li><li><Link to="/favoris" className="hover:text-gold-light">Mes favoris</Link></li>
          </ul>
        </div>
        <div>
          <p className="eyebrow mb-4">Nous trouver</p>
          <ul className="space-y-3 text-sm text-ivory/70">
            <li className="flex gap-3"><MapPin size={16} className="mt-0.5 shrink-0 text-gold" />Boulevard principal, Agboville<br />& Riviera 2, Cocody — Abidjan</li>
            <li className="flex gap-3"><Phone size={16} className="mt-0.5 shrink-0 text-gold" /><a href={`tel:${PHONE_TEL}`} className="hover:text-gold-light">{PHONE_DISPLAY}</a> · <a href={WA_CLIENT_LINK} target="_blank" rel="noopener noreferrer" className="font-semibold text-[#25D366] hover:underline">WhatsApp</a></li>
            <li className="flex gap-3"><Mail size={16} className="mt-0.5 shrink-0 text-gold" />contact@yvesstore.ci</li>
            <li className="flex gap-3"><Clock size={16} className="mt-0.5 shrink-0 text-gold" />Lun – Sam : 8 h – 20 h</li>
          </ul>
        </div>
      </div>
      <div className="container-x relative flex flex-col items-center justify-between gap-4 border-t border-ivory/10 py-6 text-xs text-ivory/50 md:flex-row">
        <p>© {new Date().getFullYear()} YVES STORE. Tous droits réservés.</p>
        <PaymentBadges dark />
      </div>
    </footer>
  )
}
