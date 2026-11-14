// YVES STORE — annonces « Nouveautés » par e-mail aux abonnés
// • POST { action: 'send', id }  — par le gérant connecté (JWT + is_admin) après « Annoncer aux abonnés »
// • POST { action: 'weekly' }    — par pg_cron chaque lundi 9 h (en-tête secret x-notify-secret) :
//                                  prépare le brouillon « Résumé de la semaine » et prévient le gérant.
// Tant qu’aucun domaine n’est vérifié chez Resend (RESEND_FROM absent), seuls des APERÇUS partent
// vers l’e-mail du gérant : Resend refuse tout autre destinataire.
import { createClient } from 'npm:@supabase/supabase-js@2'

const RESEND = Deno.env.get('RESEND_API_KEY')
const SECRET = Deno.env.get('NOTIFY_WEBHOOK_SECRET')
const FROM = Deno.env.get('RESEND_FROM') || 'onboarding@resend.dev'
const TO = Deno.env.get('NOTIFY_EMAIL') || 'yvesstore1@gmail.com'
const SITE = (Deno.env.get('SITE_URL') || 'https://yvesstore.com').replace(/\/+$/, '')
const TEST = FROM === 'onboarding@resend.dev'
const URL_ = Deno.env.get('SUPABASE_URL')!
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' }
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
const esc = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
const fcfa = (n: unknown) => `${Math.round(Number(n) || 0).toLocaleString('fr-FR').replace(/\u202f|\u00a0/g, ' ')} FCFA`
const abs = (u?: string | null) => (!u || u.startsWith('data:') ? '' : /^https?:\/\//.test(u) ? u : `${SITE}${u.startsWith('/') ? '' : '/'}${u}`)

type Item = { id: string; name: string; price: number; compare_at?: number | null; image?: string | null; url?: string | null; short?: string | null }
type Ann = { id: number; kind: 'produit' | 'hebdo'; title: string; message: string; items: Item[]; status: string; email_status: string }

function emailHtml(a: Ann, firstName: string | null, unsubUrl: string, banner = '') {
  const cards = a.items.slice(0, 12).map((it) => {
    const img = abs(it.image), link = abs(it.url) || SITE
    const old = it.compare_at && it.compare_at > it.price ? `<span style="color:#9b948a;text-decoration:line-through;font-size:13px;margin-left:8px">${fcfa(it.compare_at)}</span>` : ''
    return `<tr><td style="padding:10px 0;border-bottom:1px solid #efe8dc"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
${img ? `<td width="96" valign="top"><a href="${esc(link)}"><img src="${esc(img)}" width="84" height="104" alt="" style="display:block;border-radius:12px;object-fit:cover;background:#EFE8DC"></a></td>` : ''}
<td valign="top" style="padding-left:6px"><p style="margin:0;font-size:15px;font-weight:bold">${esc(it.name)}</p>
${it.short ? `<p style="margin:4px 0 0;font-size:13px;color:#77716a;line-height:1.5">${esc(it.short)}</p>` : ''}
<p style="margin:8px 0 0;font-size:16px;font-weight:bold;color:#8a6424">${fcfa(it.price)}${old}</p>
<a href="${esc(link)}" style="display:inline-block;margin-top:10px;background:#0E0D0B;color:#F7F3EC;text-decoration:none;font-size:12px;font-weight:bold;letter-spacing:1px;padding:9px 16px;border-radius:999px">VOIR L’ARTICLE</a></td></tr></table></td></tr>`
  }).join('')
  const hello = firstName ? `Bonjour ${esc(firstName)} 👋` : 'Bonjour 👋'
  const intro = a.kind === 'hebdo' ? 'Voici les nouveautés arrivées cette semaine chez YVES STORE :' : (a.items.length > 1 ? 'De nouveaux articles viennent d’arriver chez YVES STORE :' : 'Un nouvel article vient d’arriver chez YVES STORE :')
  return `<!doctype html><html lang="fr"><body style="margin:0;background:#F7F3EC;font-family:Arial,Helvetica,sans-serif;color:#0E0D0B">
${banner}<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F7F3EC;padding:28px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:20px;overflow:hidden">
<tr><td style="background:#0E0D0B;padding:20px 28px;color:#F7F3EC;font-family:Georgia,serif;font-size:22px;letter-spacing:4px">YVES <span style="color:#B8893B;font-size:11px;letter-spacing:6px">STORE</span></td></tr>
<tr><td style="padding:26px 28px"><p style="margin:0;color:#B8893B;font-size:11px;letter-spacing:3px;font-weight:bold">${a.kind === 'hebdo' ? 'RÉSUMÉ DE LA SEMAINE' : 'NOUVEAUTÉ'}</p>
<h1 style="margin:8px 0 14px;font-family:Georgia,serif;font-weight:normal;font-size:26px">${esc(a.title)}</h1>
<p style="margin:0 0 6px;font-size:15px">${hello}</p><p style="margin:0 0 8px;font-size:15px;color:#3d3a35">${intro}</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${cards}</table>
<p style="margin:20px 0 0;font-size:14px;line-height:1.6">📲 Une question, une taille, une réservation ? Écrivez-nous sur <a href="https://wa.me/2250140810415" style="color:#1d9e50;font-weight:bold">WhatsApp</a>.</p>
<a href="${SITE}/boutique" style="display:inline-block;margin-top:16px;background:#B8893B;color:#0E0D0B;text-decoration:none;font-size:12px;font-weight:bold;letter-spacing:1px;padding:12px 22px;border-radius:999px">TOUTE LA BOUTIQUE</a></td></tr>
<tr><td style="padding:16px 28px;background:#F7F3EC;color:#77716a;font-size:11px;line-height:1.6">YVES STORE · Agboville & Abidjan · +225 01 40 81 04 15<br>Vous recevez cet e-mail car vous êtes abonné(e) aux nouveautés. <a href="${esc(unsubUrl)}" style="color:#77716a">Se désabonner</a></td></tr>
</table></td></tr></table></body></html>`
}
function emailText(a: Ann, firstName: string | null, unsubUrl: string) {
  const lines = a.items.map((it, i) => `${i + 1}. ${it.name} — ${fcfa(it.price)}\n   ${abs(it.url) || SITE}`).join('\n')
  return `${firstName ? `Bonjour ${firstName}` : 'Bonjour'},\n\n${a.title}\n\n${lines}\n\nWhatsApp : +225 01 40 81 04 15\n\nSe désabonner : ${unsubUrl}`
}

async function resend(path: string, body: unknown) {
  const r = await fetch(`https://api.resend.com${path}`, { method: 'POST', headers: { Authorization: `Bearer ${RESEND}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  return r.ok ? { ok: true as const } : { ok: false as const, error: `Resend ${r.status}: ${(await r.text()).slice(0, 180)}` }
}

// deno-lint-ignore no-explicit-any
async function sendAnnouncement(db: any, id: number) {
  const { data: a } = await db.from('announcements').select('*').eq('id', id).maybeSingle() as { data: Ann | null }
  if (!a) return { ok: false, error: 'NOT_FOUND' }
  if (a.status !== 'publiee') return { ok: false, error: 'DRAFT' }
  if (a.email_status === 'envoye') return { ok: true, already: true }
  const { data: aud, error: audErr } = await db.rpc('news_email_audience')
  if (audErr) return { ok: false, error: audErr.message }
  const list = (aud ?? []) as { key: string; name: string | null; email: string; token: string }[]
  const subject = a.kind === 'hebdo' ? `🗓️ ${a.title}` : `✨ ${a.title}`

  if (TEST) {
    // Pas encore de domaine : un aperçu au gérant (Resend refuse les autres destinataires)
    const banner = `<div style="background:#fff4d6;border-bottom:1px solid #e7cf8c;padding:12px 16px;font-family:Arial;font-size:13px;color:#5c4510;text-align:center">👀 <b>Aperçu gérant.</b> ${list.length} abonné(s) e-mail recevront ce message automatiquement dès que votre domaine (ex. yvesstore.com) sera vérifié chez Resend. Les abonnés WhatsApp : envoi depuis l’Espace gérant → Nouveautés.</div>`
    const r = await resend('/emails', { from: `YVES STORE <${FROM}>`, to: [TO], subject: `[Aperçu] ${subject}`, html: emailHtml(a, 'Yves', `${SITE}/desabonnement`, banner), text: emailText(a, 'Yves', `${SITE}/desabonnement`) })
    await db.from('announcements').update({ email_status: r.ok ? 'test' : 'erreur', email_count: 0, email_error: r.ok ? null : r.error }).eq('id', id)
    return { ok: r.ok, mode: 'test', audience: list.length, error: r.ok ? undefined : r.error }
  }
  if (!list.length) { await db.from('announcements').update({ email_status: 'aucun', email_count: 0 }).eq('id', id); return { ok: true, mode: 'live', sent: 0 } }

  let sent = 0; let lastErr = ''
  for (let i = 0; i < list.length; i += 100) {
    const batch = list.slice(i, i + 100).map((s) => {
      const unsub = `${SITE}/desabonnement?t=${s.token}`
      return { from: `YVES STORE <${FROM}>`, to: [s.email], subject, html: emailHtml(a, s.name, unsub), text: emailText(a, s.name, unsub), headers: { 'List-Unsubscribe': `<${unsub}>` } }
    })
    const r = await resend('/emails/batch', batch)
    if (r.ok) sent += batch.length; else lastErr = r.error
  }
  await db.from('announcements').update({ email_status: sent ? 'envoye' : 'erreur', email_count: sent, email_error: lastErr || null }).eq('id', id)
  return { ok: sent > 0, mode: 'live', sent, total: list.length, error: lastErr || undefined }
}

// deno-lint-ignore no-explicit-any
async function weekly(db: any) {
  const since = new Date(Date.now() - 7 * 864e5).toISOString()
  const { data: recent } = await db.from('announcements').select('id').eq('kind', 'hebdo').gte('created_at', new Date(Date.now() - 6 * 864e5).toISOString()).limit(1)
  if (recent?.length) return { ok: true, skipped: 'ALREADY' }
  const { data: rows } = await db.from('catalog_products').select('id,name,price,compare_at,images,slug,description,created_at').eq('custom', true).eq('active', true).gte('created_at', since).order('created_at', { ascending: false }).limit(12)
  if (!rows?.length) return { ok: true, skipped: 'NO_NEW_PRODUCT' }
  const items: Item[] = rows.map((r: Record<string, any>) => ({ id: r.id, name: r.name, price: r.price, compare_at: r.compare_at, image: r.images?.[0] ?? null, url: `/produit/${r.slug || r.id}`, short: String(r.description ?? '').split(/(?<=[.!?])\s/)[0].slice(0, 120) || null }))
  const d = (x: Date) => x.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', timeZone: 'Africa/Abidjan' })
  const title = `Les nouveautés de la semaine (${d(new Date(since))} – ${d(new Date())})`
  const message = ['🗓️ *Les nouveautés de la semaine chez YVES STORE* 🛍️', '', 'Bonjour {prénom} 👋', '',
    ...items.flatMap((it, i) => [`${i + 1}. *${it.name}* — ${fcfa(it.price)}`, `👉 ${SITE}${it.url}`, '']),
    '📲 Répondez à ce message pour commander ou réserver.', 'YVES STORE ❤️', '', '_Pour ne plus recevoir nos nouveautés, répondez STOP._'].join('\n')
  const { data: a, error } = await db.from('announcements').insert({ kind: 'hebdo', product_ids: items.map((i) => i.id), title, message, items, status: 'brouillon' }).select('id').single()
  if (error) return { ok: false, error: error.message }
  const list = items.map((it) => `<li style="margin:4px 0">${esc(it.name)} — <b>${fcfa(it.price)}</b></li>`).join('')
  await resend('/emails', { from: `YVES STORE <${FROM}>`, to: [TO], subject: `🗓️ Votre résumé de la semaine est prêt (${items.length} nouveauté${items.length > 1 ? 's' : ''})`,
    html: `<div style="font-family:Arial;max-width:560px;margin:auto;padding:24px;background:#fff;border-radius:16px"><h2 style="font-family:Georgia,serif;font-weight:normal">🗓️ Résumé de la semaine prêt</h2><p>Nouveautés ajoutées cette semaine :</p><ul>${list}</ul><p><b>Il n’est pas encore envoyé.</b> Ouvrez <b>Espace gérant → Nouveautés</b>, relisez puis cliquez sur « Annoncer aux abonnés ».</p></div>`,
    text: `Résumé de la semaine prêt (${items.length} nouveautés). Pas encore envoyé : Espace gérant → Nouveautés → « Annoncer aux abonnés ».` })
  return { ok: true, draft: a.id, items: items.length }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ ok: false }, 405)
  if (!RESEND) return json({ ok: false, error: 'NOT_CONFIGURED' })
  let body: { action?: string; id?: number }
  try { body = await req.json() } catch { return json({ ok: false }, 400) }
  const db = createClient(URL_, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } })

  if (body.action === 'weekly') {
    if (!SECRET || req.headers.get('x-notify-secret') !== SECRET) return json({ ok: false }, 401)
    return json(await weekly(db))
  }
  // Gérant connecté uniquement
  const auth = req.headers.get('Authorization') ?? ''
  const userDb = createClient(URL_, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } }, auth: { persistSession: false } })
  const { data: admin } = await userDb.rpc('is_admin')
  if (admin !== true) return json({ ok: false, error: 'FORBIDDEN' }, 403)
  if (body.action === 'send' && Number.isInteger(Number(body.id))) return json(await sendAnnouncement(db, Number(body.id)))
  return json({ ok: false, error: 'UNKNOWN_ACTION' }, 400)
})
