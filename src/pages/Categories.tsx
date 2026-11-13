import { motion } from 'framer-motion'
import { ChevronRight } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import ProductCard from '../components/ProductCard'
import { Img, Page } from '../components/ui'
import { shortCat } from '../data/nav'
import { categories, products, subcategories, type CategoryId } from '../data/products'
import { cn } from '../lib/format'

type Tab = CategoryId | 'pour-vous' | 'promos'
const getTabs = (): { id: Tab; label: string }[] => [
  { id: 'pour-vous', label: 'Pour vous' },
  ...categories.map((c) => ({ id: c.id as Tab, label: shortCat[c.id] ?? c.name })),
  { id: 'promos', label: 'Promos 🔥' },
]

export default function Categories() {
  const tabs = getTabs()
  const [sp, setSp] = useSearchParams()
  const initial = (tabs.find((t) => t.id === sp.get('c'))?.id ?? 'pour-vous') as Tab
  const [tab, setTab] = useState<Tab>(initial)
  useEffect(() => { document.title = 'Catégories — YVES STORE' }, [])
  const choose = (t: Tab) => { setTab(t); setSp(t === 'pour-vous' ? {} : { c: t }, { replace: true }); window.scrollTo({ top: 0 }) }

  const cat = categories.find((c) => c.id === tab)
  const subs = cat ? subcategories.filter((s) => s.category === cat.id) : tab === 'pour-vous' ? subcategories.filter((_, i) => i % 2 === 0) : []
  const picks = useMemo(() => {
    if (tab === 'promos') return products.filter((p) => p.compareAt)
    if (cat) return products.filter((p) => p.category === cat.id).sort((a, b) => (b.sold ?? 0) - (a.sold ?? 0))
    return [...products].sort((a, b) => (b.sold ?? 0) - (a.sold ?? 0)).slice(0, 12)
  }, [tab, cat])
  const banner = cat?.image ?? (tab === 'promos' ? '/img/hero.webp' : '/img/cat-vetements.webp')
  const bannerTitle = cat?.name ?? (tab === 'promos' ? 'Jusqu’à -30 % cette semaine' : 'Sélectionné pour vous')
  const bannerLink = cat ? `/boutique?cat=${cat.id}` : tab === 'promos' ? '/boutique?promo=1' : '/boutique'

  return (
    <Page>
      <div className="container-x flex gap-0 px-0 sm:gap-6 sm:px-8 sm:py-6 lg:px-12">
        <aside className="sticky top-[96px] h-[calc(100svh-96px-58px)] w-[96px] shrink-0 overflow-y-auto bg-ivory-200/60 sm:top-[132px] sm:h-auto sm:w-56 sm:self-start sm:rounded-xl sm:bg-white sm:p-2 sm:ring-1 sm:ring-ink/5">
          {tabs.map((t) => (
            <button key={t.id} onClick={() => choose(t.id)} className={cn('relative flex w-full items-center justify-between px-3 py-4 text-left text-[12px] leading-tight transition sm:rounded-lg sm:py-3 sm:text-sm', tab === t.id ? 'bg-white font-bold sm:bg-ink sm:text-gold-light' : 'text-ink-700 hover:bg-white sm:hover:bg-ivory-200')}>
              {tab === t.id && <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r bg-ink sm:hidden" />}
              {t.label}
              <ChevronRight size={14} className="hidden opacity-50 sm:block" />
            </button>
          ))}
        </aside>

        <motion.div key={tab} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.25 }} className="min-w-0 flex-1 p-3 pb-24 sm:p-0">
          <Link to={bannerLink} className="group relative block aspect-[21/9] overflow-hidden rounded-xl bg-ink sm:aspect-[4/1]">
            <Img src={banner} alt="" className="h-full w-full object-cover opacity-80 transition duration-700 group-hover:scale-105" />
            <div className="absolute inset-0 flex flex-col justify-center bg-gradient-to-r from-black/70 to-transparent p-4 text-white sm:p-8">
              <p className="font-display text-xl font-semibold leading-tight sm:text-4xl">{bannerTitle}</p>
              <span className="mt-2 w-fit rounded-full bg-white px-3 py-1 text-[10px] font-black tracking-wider text-ink group-hover:bg-gold sm:text-xs">ACHETER</span>
            </div>
          </Link>

          {subs.length > 0 && (
            <>
              <div className="mb-3 mt-5 flex items-center justify-between">
                <p className="text-sm font-bold">{cat ? 'Parcourir par type' : 'Catégories populaires'}</p>
                {cat && <Link to={`/boutique?cat=${cat.id}`} className="flex items-center text-xs text-ink-500 hover:text-ink">Tout voir <ChevronRight size={14} /></Link>}
              </div>
              <div className="grid grid-cols-3 gap-x-2 gap-y-4 sm:grid-cols-5 lg:grid-cols-7">
                {subs.map((s) => (
                  <Link key={s.id} to={`/boutique?sub=${s.id}`} className="group flex flex-col items-center text-center">
                    <span className="aspect-square w-full max-w-[84px] overflow-hidden rounded-full bg-ivory-200 ring-2 ring-transparent transition group-hover:ring-gold"><Img src={s.image} alt="" className="h-full w-full object-cover" /></span>
                    <span className="mt-1.5 text-[11px] leading-tight sm:text-xs">{s.name}</span>
                  </Link>
                ))}
              </div>
            </>
          )}

          <p className="mb-3 mt-6 text-sm font-bold">{tab === 'promos' ? 'Toutes les promos' : 'Les plus vendus'}</p>
          <div className="grid grid-cols-2 gap-x-2.5 gap-y-5 sm:grid-cols-3 lg:grid-cols-5">
            {picks.map((p) => <ProductCard key={p.id} p={p} />)}
          </div>
        </motion.div>
      </div>
    </Page>
  )
}
