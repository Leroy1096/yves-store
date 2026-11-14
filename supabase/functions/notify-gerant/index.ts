// YVES STORE — e-mails d'alerte au gérant (nouvelle commande, annulation, demande client, inscription, avis client)
// Appelée UNIQUEMENT par la base de données (triggers + pg_net) avec l'en-tête secret x-notify-secret.
// Le corps ne contient que { kind, ref } : la fonction relit l'enregistrement elle-même (service role).
// Envoi via Resend (RESEND_API_KEY, clé « Sending access »). Jamais de code ni de mot de passe dans les e-mails.
import { createClient } from 'npm:@supabase/supabase-js@2'

const RESEND = Deno.env.get('RESEND_API_KEY')
const SECRET = Deno.env.get('NOTIFY_WEBHOOK_SECRET')
const FROM = Deno.env.get('RESEND_FROM') || 'onboarding@resend.dev'
const TO = Deno.env.get('NOTIFY_EMAIL') || 'yvesstore1@gmail.com'

const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { 'Content-Type': 'application/json' } })
const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
const fcfa = (n: unknown) => `${Math.round(Number(n) || 0).toLocaleString('fr-FR').replace(/\u202f|\u00a0/g, ' ')} FCFA`
const when = (d?: string | null) => new Date(d ?? Date.now()).toLocaleString('fr-FR', { timeZone: 'Africa/Abidjan', dateStyle: 'full', timeStyle: 'short' })
const short = (first?: string | null, last?: string | null) => `${first ?? ''} ${last ? last.trim().slice(0, 1) + '.' : ''}`.trim() || 'Client'
const SHIP: Record<string, string> = { abidjan: 'Livraison Abidjan', interieur: 'Livraison intérieur', retrait: 'Retrait en boutique' }
const KIND: Record<string, string> = { reset_password: 'Code mot de passe oublié', order_tracking: 'Suivi de commande', order_cancel: 'Annulation de commande' }
const MOTIF: Record<string, string> = { suivi: 'suivi', confirmation: 'confirmation', aide: 'demande d’aide' }

const row = (k: string, v: string) => `<tr><td style="padding:6px 0;color:#77716a;font-size:13px;width:38%">${k}</td><td style="padding:6px 0;font-size:14px;font-weight:bold">${v}</td></tr>`
const frame = (title: string, body: string, cta = 'Ouvrez l’Espace gérant pour traiter.') => `<!doctype html><html lang="fr"><body style="margin:0;background:#F7F3EC;font-family:Arial,Helvetica,sans-serif;color:#0E0D0B">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F7F3EC;padding:28px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:20px;overflow:hidden">
<tr><td style="background:#0E0D0B;padding:20px 28px;color:#F7F3EC;font-family:Georgia,serif;font-size:22px;letter-spacing:4px">YVES <span style="color:#B8893B;font-size:11px;letter-spacing:6px">STORE · ESPACE GÉRANT</span></td></tr>
<tr><td style="padding:26px 28px"><h1 style="margin:0 0 16px;font-family:Georgia,serif;font-weight:normal;font-size:24px">${title}</h1>${body}
<p style="margin:22px 0 0;font-size:13px;color:#77716a">${cta}</p></td></tr>
<tr><td style="padding:16px 28px;background:#F7F3EC;color:#77716a;font-size:11px">Alerte automatique YVES STORE — envoyée à ${esc(TO)}.</td></tr>
</table></td></tr></table></body></html>`

async function send(subject: string, html: string, text: string) {
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST', headers: { Authorization: `Bearer ${RESEND}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: `YVES STORE <${FROM}>`, to: [TO], subject, html, text }),
  })
  return r.ok ? { ok: true } : { ok: false, error: `Resend ${r.status}: ${(await r.text()).slice(0, 160)}` }
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ ok: false }, 405)
  if (!SECRET || req.headers.get('x-notify-secret') !== SECRET) return json({ ok: false }, 401)
  if (!RESEND) return json({ ok: false, error: 'NOT_CONFIGURED' })
  let body: { kind?: string; ref?: string }
  try { body = await req.json() } catch { return json({ ok: false }, 400) }
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })
  const ref = String(body.ref ?? '').slice(0, 80)

  // ── Test de la chaîne complète ──
  if (body.kind === 'test') {
    return json(await send('✅ Alertes e-mail YVES STORE activées',
      frame('Alertes activées ✅', `<p style="font-size:15px;line-height:1.6">Vous recevrez désormais un e-mail à chaque :</p><ul style="font-size:14px;line-height:1.8"><li>🛍️ nouvelle commande</li><li>❌ commande annulée</li><li>💬 demande d’un client (suivi, annulation, aide, code mot de passe)</li><li>👤 nouvelle inscription</li><li>⭐ nouvel avis client sur un article</li></ul>`, 'Aucune action nécessaire.'),
      'Alertes e-mail YVES STORE activées : nouvelle commande, annulation, demande client, nouvelle inscription, avis client.'))
  }

  // ── Commandes ──
  if (body.kind === 'order_new' || body.kind === 'order_cancel') {
    const { data: o } = await db.from('orders').select('*').eq('id', ref).maybeSingle()
    if (!o) return json({ ok: false, error: 'NOT_FOUND' })
    const c = o.customer ?? {}, a = o.address ?? {}
    const who = short(c.firstName, c.lastName)
    const lines = (Array.isArray(o.lines) ? o.lines : []).slice(0, 30)
    const items = lines.map((l: Record<string, unknown>) => `<tr><td style="padding:7px 0;border-bottom:1px solid #eee;font-size:14px">${esc(l.name)}${l.size ? ` · ${esc(l.size)}` : ''}${l.color ? ` · ${esc(l.color)}` : ''}</td><td style="padding:7px 0;border-bottom:1px solid #eee;font-size:14px;text-align:center">× ${esc(l.qty)}</td><td style="padding:7px 0;border-bottom:1px solid #eee;font-size:14px;text-align:right">${fcfa(Number(l.price) * Number(l.qty))}</td></tr>`).join('')
    const place = [a.commune, a.city].filter(Boolean).join(', ') || '—'
    const n = lines.reduce((s: number, l: Record<string, unknown>) => s + (Number(l.qty) || 0), 0)
    if (body.kind === 'order_new') {
      const html = frame(`🛍️ Nouvelle commande ${esc(o.id)}`, `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
${row('Client', esc(who))}${row('Passée le', esc(when(o.created_at)))}${row('Livraison', `${esc(SHIP[o.shipping] ?? o.shipping)} — ${esc(place)}`)}${row('Paiement choisi', esc(o.payment))}${o.promo_code ? row('Code promo', esc(o.promo_code)) : ''}</table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:14px">${items}</table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:10px">
${row('Sous-total', fcfa(o.subtotal))}${o.discount ? row('Réduction', '− ' + fcfa(o.discount)) : ''}${row('Livraison', o.shipping_cost ? fcfa(o.shipping_cost) : 'Offerte')}
<tr><td style="padding:10px 0;font-size:15px">TOTAL</td><td style="padding:10px 0;font-size:20px;font-weight:bold;color:#8a6424">${fcfa(o.total)}</td></tr></table>
<p style="font-size:12px;color:#77716a">⚠️ Le paiement n’est pas vérifié automatiquement : contrôlez sur votre téléphone marchand avant d’expédier.</p>`, 'Ouvrez l’Espace gérant → Commandes pour la préparer.')
      return json(await send(`🛍️ Nouvelle commande ${o.id} — ${fcfa(o.total)} (${who})`, html,
        `Nouvelle commande ${o.id}\nClient : ${who}\n${n} article(s) — Total ${fcfa(o.total)}\n${SHIP[o.shipping] ?? o.shipping} — ${place}\nPaiement choisi : ${o.payment}\nEspace gérant → Commandes.`))
    }
    const html = frame(`❌ Commande ${esc(o.id)} annulée`, `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
${row('Client', esc(who))}${row('Montant', fcfa(o.total))}${row('Passée le', esc(when(o.created_at)))}${row('Annulée le', esc(when(o.cancelled_at)))}${row('Motif', esc(o.cancel_reason || 'Sans motif'))}</table>
<p style="font-size:13px;color:#77716a">Le stock des articles a été remis automatiquement.</p>`, 'Si le client avait déjà payé par Mobile Money, pensez au remboursement.')
    return json(await send(`❌ Commande annulée ${o.id} — ${fcfa(o.total)} (${who})`, html,
      `Commande ${o.id} annulée\nClient : ${who}\nMontant : ${fcfa(o.total)}\nMotif : ${o.cancel_reason || 'Sans motif'}`))
  }

  // ── Demandes WhatsApp des clients ──
  if (body.kind === 'wa_request') {
    const { data: r } = await db.from('whatsapp_requests').select('id,kind,user_id,customer_name,order_id,payload,created_at').eq('id', ref).maybeSingle()
    if (!r) return json({ ok: false, error: 'NOT_FOUND' })
    let who = 'Client'
    if (r.user_id) { const { data: n } = await db.rpc('short_name', { p_user: r.user_id }); if (n) who = n }
    else if (r.customer_name) { const [f, ...rest] = String(r.customer_name).split(' '); who = short(f, rest.join(' ')) }
    const label = KIND[r.kind] ?? r.kind
    const motif = r.payload?.motif ? ` (${MOTIF[r.payload.motif] ?? r.payload.motif})` : ''
    const html = frame(`💬 ${esc(label)}${esc(motif)}`, `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
${row('Client', esc(who))}${r.order_id ? row('Commande', esc(r.order_id)) : ''}${row('Reçue le', esc(when(r.created_at)))}${r.payload?.note ? row('Message', esc(String(r.payload.note).slice(0, 300))) : ''}</table>
${r.kind === 'reset_password' ? '<p style="font-size:13px;color:#77716a">Le code à 6 chiffres n’est généré que lorsque vous cliquez sur « Générer le code » : il n’apparaît jamais dans un e-mail.</p>' : ''}`,
      'À traiter dans Espace gérant → Messages WhatsApp (« Envoyer sur le WhatsApp du client »).')
    return json(await send(`💬 ${label}${motif} — ${who}`, html, `${label}${motif}\nClient : ${who}${r.order_id ? `\nCommande : ${r.order_id}` : ''}\nÀ traiter dans Espace gérant → Messages WhatsApp.`))
  }

  // ── Nouvelle inscription ──
  if (body.kind === 'signup') {
    const { data: p } = await db.from('profiles').select('id,first_name,last_name,city,signup_method,created_at').eq('id', ref).maybeSingle()
    if (!p) return json({ ok: false, error: 'NOT_FOUND' })
    const { count } = await db.from('profiles').select('id', { count: 'exact', head: true })
    const who = short(p.first_name, p.last_name)
    const html = frame('👤 Nouveau client inscrit', `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
${row('Client', esc(who))}${row('Ville', esc(p.city || 'Non renseignée'))}${row('Inscrit avec', p.signup_method === 'phone' ? 'Numéro de téléphone' : 'Adresse e-mail')}${row('Le', esc(when(p.created_at)))}${row('Comptes au total', String(count ?? '—'))}</table>`,
      'Idée : souhaitez-lui la bienvenue et rappelez le code BIENVENUE (−5 000 FCFA dès 30 000 FCFA).')
    return json(await send(`👤 Nouveau client inscrit — ${who}`, html, `Nouveau client inscrit : ${who} (${p.city || 'ville non renseignée'}). Comptes au total : ${count ?? '—'}.`))
  }

  // ── Nouvel avis client ──
  if (body.kind === 'review_new') {
    const { data: r } = await db.from('product_reviews').select('id,product_id,user_id,rating,title,comment,created_at').eq('id', ref).maybeSingle()
    if (!r) return json({ ok: false, error: 'NOT_FOUND' })
    const [{ data: n }, { data: prod }, { data: stats }] = await Promise.all([
      db.rpc('short_name', { p_user: r.user_id }),
      db.from('catalog_products').select('name,price').eq('id', r.product_id).maybeSingle(),
      db.from('product_reviews').select('rating').eq('product_id', r.product_id).eq('status', 'publie'),
    ])
    const who = n || 'Client'
    const stars = '★'.repeat(r.rating) + '☆'.repeat(5 - r.rating)
    const list = (stats ?? []) as { rating: number }[]
    const avg = list.length ? (list.reduce((s, x) => s + x.rating, 0) / list.length).toFixed(1).replace('.', ',') : '—'
    const low = r.rating <= 2
    const html = frame(`${low ? '⚠️' : '⭐'} Nouvel avis — ${esc(prod?.name ?? r.product_id)}`, `<p style="margin:0 0 12px;font-size:26px;color:#B8893B;letter-spacing:3px">${stars}</p>
${r.title ? `<p style="margin:0 0 8px;font-size:16px;font-weight:bold">« ${esc(r.title)} »</p>` : ''}
<p style="margin:0 0 16px;font-size:15px;line-height:1.6;background:#F7F3EC;border-radius:12px;padding:14px 16px">${esc(String(r.comment).slice(0, 1000))}</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${row('Client', esc(who))}${row('Article', esc(prod?.name ?? r.product_id))}${row('Le', esc(when(r.created_at)))}${row('Note moyenne de l’article', `${avg} / 5 (${list.length} avis)`)}</table>
${low ? '<p style="font-size:13px;color:#a1352b">Avis négatif : une réponse rapide et polie rassure les autres clients.</p>' : ''}`,
      'Espace gérant → Avis clients : répondre ou masquer l’avis.')
    return json(await send(`${low ? '⚠️' : '⭐'} Avis ${r.rating}/5 — ${prod?.name ?? r.product_id} (${who})`, html,
      `Nouvel avis ${r.rating}/5 sur ${prod?.name ?? r.product_id}\nClient : ${who}\n${r.title ? r.title + '\n' : ''}${r.comment}\nEspace gérant → Avis clients.`))
  }

  return json({ ok: false, error: 'UNKNOWN_KIND' }, 400)
})
