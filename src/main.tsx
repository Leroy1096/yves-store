import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, HashRouter, MemoryRouter } from 'react-router-dom'
import App from './App'
import './index.css'
import { initCatalog } from './lib/catalog'

const SINGLE = import.meta.env.VITE_SINGLE === '1'

if (SINGLE) {
  // Aperçu dans une visionneuse « sandbox » : l’envoi natif des formulaires peut y être bloqué.
  // On déclenche nous-mêmes l’événement submit (géré par React) au clic ou à la touche Entrée.
  const fire = (form: HTMLFormElement) => form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
  document.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement | null)?.closest?.('button') as HTMLButtonElement | null
    if (!btn || !btn.form || btn.type !== 'submit' || btn.disabled) return
    e.preventDefault(); fire(btn.form)
  }, true)
  document.addEventListener('keydown', (e) => {
    const el = e.target as HTMLInputElement | null
    if (e.key !== 'Enter' || !el || el.tagName !== 'INPUT' || !el.form || e.isComposing) return
    if (['checkbox', 'radio', 'button', 'submit'].includes(el.type)) return
    e.preventDefault(); fire(el.form)
  }, true)
}

// Fichier unique : routage par # ; en mémoire si la page n’a pas d’adresse (about:srcdoc)
const Router = SINGLE ? (location.protocol === 'about:' ? MemoryRouter : HashRouter) : BrowserRouter

initCatalog().finally(() => createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <App />
    </Router>
  </StrictMode>,
))
