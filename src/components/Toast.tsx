import { AnimatePresence, motion } from 'framer-motion'
import { Check } from 'lucide-react'
import { useUI } from '../store'

export default function Toast() {
  const toast = useUI((s) => s.toast)
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-5 z-[90] flex justify-center px-4">
      <AnimatePresence>
        {toast && (
          <motion.div key={toast.id} initial={{ opacity: 0, y: 30, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20 }} className="flex items-center gap-3 rounded-full bg-ink py-2 pl-2 pr-5 text-sm text-ivory shadow-2xl">
            {toast.image ? <img src={toast.image} alt="" className="h-9 w-9 rounded-full object-cover" /> : <span className="grid h-9 w-9 place-items-center rounded-full bg-gold text-ink"><Check size={16} /></span>}
            {toast.text}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
