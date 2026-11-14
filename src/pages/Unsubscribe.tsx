import { CheckCircle2, Loader2, MailX } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

/** Lien « Se désabonner » des e-mails de nouveautés : /desabonnement?t=<jeton> */
export default function Unsubscribe() {
  const [sp] = useSearchParams()
  const t = sp.get('t') ?? ''
  const [state, setState] = useState<'wait' | 'ok' | 'bad'>('wait')
  useEffect(() => {
    document.title = 'Désabonnement — YVES STORE'
    if (!/^[0-9a-f-]{36}$/i.test(t)) { setState('bad'); return }
    supabase.rpc('news_unsubscribe', { p_token: t }).then(({ data, error }) => setState(!error && data ? 'ok' : 'bad'))
  }, [t])
  return (
    <main className="container-x grid min-h-[60vh] place-items-center py-16">
      <div className="max-w-md rounded-3xl border border-ink/10 bg-white p-8 text-center" data-testid="unsub">
        {state === 'wait' && <Loader2 className="mx-auto animate-spin text-gold" size={30} />}
        {state === 'ok' && <>
          <CheckCircle2 className="mx-auto text-emerald-600" size={40} />
          <h1 className="h-display mt-4 text-3xl">C’est fait</h1>
          <p className="mt-3 text-ink-600">Vous ne recevrez plus nos nouveautés par e-mail. Vous pouvez vous réabonner à tout moment en bas de chaque page.</p>
        </>}
        {state === 'bad' && <>
          <MailX className="mx-auto text-ink-400" size={40} />
          <h1 className="h-display mt-4 text-3xl">Lien invalide</h1>
          <p className="mt-3 text-ink-600">Ce lien de désabonnement n’est pas reconnu. Si vous avez un compte, désactivez les nouveautés dans <b>Mon compte</b>, ou écrivez « STOP » sur notre WhatsApp.</p>
        </>}
        <Link to="/" className="btn-dark mt-6 inline-flex">Retour à la boutique</Link>
      </div>
    </main>
  )
}
