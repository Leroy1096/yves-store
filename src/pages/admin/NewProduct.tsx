import { FolderPlus, ImagePlus, Loader2, X } from 'lucide-react'
import { useRef, useState, type FormEvent } from 'react'
import { allCategories, refreshCatalog, slugify, type CatalogRow } from '../../lib/catalog'
import { cn, fcfa } from '../../lib/format'
import { supabase } from '../../lib/supabase'
import { CATEGORY_FR, errMsg } from './shared'

const NEW_CAT = '__nouvelle__'
const MAX_PHOTOS = 4
const COLOR_HEX: Record<string, string> = {
  noir: '#111111', blanc: '#FFFFFF', rouge: '#C0392B', bleu: '#2E5EAA', marine: '#1F2A44', vert: '#2E7D4F', kaki: '#6B6B3A', jaune: '#E8C33A', rose: '#E8A0B4', fuchsia: '#C2185B',
  orange: '#E67E22', violet: '#7B4FA0', marron: '#6B4226', chocolat: '#4A2C1A', beige: '#D9C3A0', camel: '#C19A6B', creme: '#F3EAD8', ivoire: '#F7F3EC', gris: '#8A8A8A',
  dore: '#C9A24A', or: '#C9A24A', argent: '#C0C0C0', argente: '#C0C0C0', bordeaux: '#6D1A2A', turquoise: '#1ABC9C', nude: '#E3BC9A',
}
const colorHex = (n: string) => COLOR_HEX[n.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').split(' ')[0]] ?? '#9A9A9A'
const ERRORS: Record<string, string> = {
  CATEGORY_EXISTS: 'Cette catégorie existe déjà : choisissez-la dans la liste.',
  INVALID_CATEGORY: 'Catégorie invalide.',
  INVALID_NAME: 'Le nom du produit doit faire entre 2 et 90 caractères.',
  INVALID_PRICE: 'Prix invalide (minimum 100 FCFA).',
  INVALID_COMPARE_AT: 'Le prix barré doit être supérieur au prix de vente.',
  INVALID_STOCK: 'Quantité en stock invalide.',
  INVALID_IMAGES: 'Ajoutez au moins une photo.',
}
const niceErr = (e: unknown) => { const m = errMsg(e); const k = Object.keys(ERRORS).find((x) => m.includes(x)); return k ? ERRORS[k] : m }

/** Réduit la photo (max 1000 px, JPEG) avant l’envoi */
function compress(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const k = Math.min(1, 1000 / Math.max(img.width, img.height))
      const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k)
      const ctx = c.getContext('2d')!; ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height); ctx.drawImage(img, 0, 0, c.width, c.height)
      URL.revokeObjectURL(url)
      c.toBlob((b) => (b ? resolve(b) : reject(new Error('Photo illisible'))), 'image/jpeg', 0.82)
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Ce fichier n’est pas une image lisible.')) }
    img.src = url
  })
}

type Photo = { blob: Blob; preview: string }

export default function NewProduct({ onCreated }: { onCreated: (row: CatalogRow, msg: string) => void }) {
  const [name, setName] = useState('')
  const [cat, setCat] = useState('')
  const [catName, setCatName] = useState('')
  const [catTag, setCatTag] = useState('')
  const [price, setPrice] = useState('')
  const [compareAt, setCompareAt] = useState('')
  const [stock, setStock] = useState('')
  const [gender, setGender] = useState<'Femme' | 'Homme' | 'Unisexe'>('Unisexe')
  const [desc, setDesc] = useState('')
  const [sizes, setSizes] = useState('')
  const [colors, setColors] = useState('')
  const [photos, setPhotos] = useState<Photo[]>([])
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const addFiles = async (list: FileList | null) => {
    if (!list) return
    setErr('')
    const room = MAX_PHOTOS - photos.length
    const picked = [...list].filter((f) => f.type.startsWith('image/')).slice(0, room)
    if (!picked.length) { setErr(room ? 'Choisissez une image (JPG, PNG ou WEBP).' : `${MAX_PHOTOS} photos maximum.`); return }
    try {
      const out = await Promise.all(picked.map(async (f) => { const blob = await compress(f); return { blob, preview: URL.createObjectURL(blob) } }))
      setPhotos((p) => [...p, ...out])
    } catch (e) { setErr(errMsg(e)) }
    if (fileRef.current) fileRef.current.value = ''
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setErr('')
    const p = Number(price), s = Number(stock), ca = compareAt ? Number(compareAt) : null
    if (name.trim().length < 2) return setErr('Indiquez le nom du produit.')
    if (!cat) return setErr('Choisissez une catégorie.')
    if (cat === NEW_CAT && catName.trim().length < 2) return setErr('Indiquez le nom de la nouvelle catégorie.')
    if (!p || p < 100) return setErr('Indiquez le prix de vente (minimum 100 FCFA).')
    if (ca !== null && ca <= p) return setErr('Le prix barré doit être supérieur au prix de vente.')
    if (stock === '') return setErr('Indiquez la quantité reçue (0 si pas encore en stock).')
    if (!photos.length) return setErr('Ajoutez au moins une photo du produit.')
    setBusy(true)
    try {
      // 1. Nouvelle catégorie si besoin
      let category = cat
      if (cat === NEW_CAT) {
        const id = slugify(catName) || `cat-${Date.now().toString(36)}`
        const existing = allCategories.find((c) => c.id === id || c.name.toLowerCase() === catName.trim().toLowerCase())
        if (existing) category = existing.id
        else {
          const { error } = await supabase.rpc('admin_create_category', { p_id: id, p_name: catName.trim(), p_tagline: catTag.trim() })
          if (error) throw error
          category = id
        }
      }
      // 2. Photos
      const urls: string[] = []
      for (const ph of photos) {
        const path = `${category}/${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}.jpg`
        const { error } = await supabase.storage.from('produits').upload(path, ph.blob, { contentType: 'image/jpeg', upsert: false })
        if (error) throw new Error(`Envoi de la photo impossible : ${error.message}`)
        urls.push(supabase.storage.from('produits').getPublicUrl(path).data.publicUrl)
      }
      // 3. Produit + stock initial
      const list = (v: string) => v.split(/[,;\n]/).map((x) => x.trim()).filter(Boolean).slice(0, 12)
      const { data, error } = await supabase.rpc('admin_create_product', {
        p_name: name.trim(), p_category: category, p_price: p, p_compare_at: ca, p_stock: s, p_description: desc.trim(), p_images: urls,
        p_sizes: list(sizes), p_colors: list(colors).map((c) => ({ name: c.charAt(0).toUpperCase() + c.slice(1), hex: colorHex(c) })), p_gender: gender, p_slug: slugify(name), p_low: 5,
      })
      if (error) throw error
      await refreshCatalog()
      const row = data as CatalogRow
      onCreated(row, `« ${row.name} » est en vente sur la boutique (${CATEGORY_FR[category] ?? catName}) — ${fcfa(p)}, ${s} en stock.`)
      photos.forEach((ph) => URL.revokeObjectURL(ph.preview))
      setName(''); setCat(''); setCatName(''); setCatTag(''); setPrice(''); setCompareAt(''); setStock(''); setDesc(''); setSizes(''); setColors(''); setPhotos([]); setGender('Unisexe')
    } catch (e2) { setErr(niceErr(e2)) } finally { setBusy(false) }
  }

  const num = (set: (v: string) => void, max = 9) => (e: { target: { value: string } }) => set(e.target.value.replace(/\D/g, '').slice(0, max))
  return (
    <form onSubmit={submit} className="mt-4 space-y-4" noValidate>
      <div>
        <label className="label" htmlFor="np-name">Nom du produit *</label>
        <input id="np-name" value={name} onChange={(e) => setName(e.target.value.slice(0, 90))} className="input" placeholder="Ex. : Sac à main cuir camel" />
      </div>
      <div>
        <label className="label" htmlFor="np-cat">Catégorie *</label>
        <select id="np-cat" value={cat} onChange={(e) => setCat(e.target.value)} className="input">
          <option value="">— Choisir une catégorie —</option>
          {Object.entries(CATEGORY_FR).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          <option value={NEW_CAT}>＋ Créer une nouvelle catégorie…</option>
        </select>
      </div>
      {cat === NEW_CAT && (
        <div className="space-y-3 rounded-xl border border-gold/40 bg-gold/5 p-3">
          <p className="flex items-center gap-2 text-xs font-bold text-gold-dark"><FolderPlus size={15} /> Nouvelle catégorie</p>
          <div>
            <label className="label" htmlFor="np-catname">Nom de la catégorie *</label>
            <input id="np-catname" value={catName} onChange={(e) => setCatName(e.target.value.slice(0, 60))} className="input" placeholder="Ex. : Sacs à main, Parfums, Montres…" />
          </div>
          <div>
            <label className="label" htmlFor="np-cattag">Courte description (facultatif)</label>
            <input id="np-cattag" value={catTag} onChange={(e) => setCatTag(e.target.value.slice(0, 120))} className="input" placeholder="Ex. : Cuir, toile, pochettes de soirée" />
          </div>
          <p className="text-[11px] leading-relaxed text-ink-500">Elle apparaîtra dans le menu de la boutique dès que ce produit sera en vente.</p>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="np-price">Prix de vente (FCFA) *</label>
          <input id="np-price" value={price} onChange={num(setPrice, 8)} inputMode="numeric" className="input tabular-nums" placeholder="15000" />
        </div>
        <div>
          <label className="label" htmlFor="np-compare">Prix barré (facultatif)</label>
          <input id="np-compare" value={compareAt} onChange={num(setCompareAt, 8)} inputMode="numeric" className="input tabular-nums" placeholder="20000" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="np-stock">Quantité reçue *</label>
          <input id="np-stock" value={stock} onChange={num(setStock, 6)} inputMode="numeric" className="input tabular-nums" placeholder="0" />
        </div>
        <div>
          <label className="label" htmlFor="np-gender">Pour</label>
          <select id="np-gender" value={gender} onChange={(e) => setGender(e.target.value as typeof gender)} className="input">
            <option>Unisexe</option><option>Femme</option><option>Homme</option>
          </select>
        </div>
      </div>
      <div>
        <p className="label">Photos * <span className="font-normal text-ink-400">({photos.length}/{MAX_PHOTOS})</span></p>
        <div className="grid grid-cols-4 gap-2">
          {photos.map((ph, i) => (
            <div key={ph.preview} className="relative aspect-square overflow-hidden rounded-lg border border-ink/10 bg-ivory-200">
              <img src={ph.preview} alt="" className="h-full w-full object-cover" />
              {i === 0 && <span className="absolute bottom-0 left-0 right-0 bg-ink/70 py-0.5 text-center text-[9px] font-bold text-white">Principale</span>}
              <button type="button" aria-label="Retirer la photo" onClick={() => { URL.revokeObjectURL(ph.preview); setPhotos((p) => p.filter((x) => x !== ph)) }} className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-white/90 text-ink shadow"><X size={12} /></button>
            </div>
          ))}
          {photos.length < MAX_PHOTOS && (
            <label className={cn('flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-ink/20 text-[10px] font-semibold text-ink-500 transition hover:border-gold hover:text-gold-dark', !photos.length && 'col-span-2 aspect-auto py-4')}>
              <ImagePlus size={18} />{photos.length ? 'Ajouter' : 'Ajouter des photos'}
              <input ref={fileRef} id="np-photos" type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" onChange={(e) => addFiles(e.target.files)} />
            </label>
          )}
        </div>
      </div>
      <div>
        <label className="label" htmlFor="np-desc">Description</label>
        <textarea id="np-desc" value={desc} onChange={(e) => setDesc(e.target.value.slice(0, 2000))} rows={3} className="input resize-y" placeholder="Matière, dimensions, conseils d’utilisation…" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label" htmlFor="np-sizes">Tailles (facultatif)</label>
          <input id="np-sizes" value={sizes} onChange={(e) => setSizes(e.target.value.slice(0, 120))} className="input" placeholder="S, M, L ou 39, 40, 41" />
        </div>
        <div>
          <label className="label" htmlFor="np-colors">Couleurs (facultatif)</label>
          <input id="np-colors" value={colors} onChange={(e) => setColors(e.target.value.slice(0, 120))} className="input" placeholder="Noir, camel, doré" />
        </div>
      </div>
      {err && <p className="rounded-lg bg-red-50 p-2.5 text-xs font-medium text-red-700">{err}</p>}
      <button disabled={busy} className="btn-dark w-full">{busy ? <Loader2 size={16} className="animate-spin" /> : 'Mettre en vente'}</button>
    </form>
  )
}
