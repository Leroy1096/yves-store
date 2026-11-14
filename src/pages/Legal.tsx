import { Link } from 'react-router-dom'
import { PHONE_DISPLAY, WA_CLIENT_LINK } from '../lib/contact'

/** Pages légales : Conditions générales de vente + Politique de confidentialité.
 *  Les règles décrites ici sont celles réellement appliquées par le site (frais de port,
 *  annulation 24 h, retours 7 jours, données collectées, sous-traitants). */
const CONTACT_EMAIL = 'yvesstore1@gmail.com'
const UPDATED = '14 novembre 2026'

function Shell({ title, intro, children, other }: { title: string; intro: string; children: React.ReactNode; other: { to: string; label: string } }) {
  return (
    <main className="container-x max-w-3xl py-10 sm:py-14">
      <p className="eyebrow">Informations légales</p>
      <h1 className="h-display mt-2 text-4xl sm:text-5xl">{title}</h1>
      <p className="mt-3 text-sm text-ink-400">Dernière mise à jour : {UPDATED}</p>
      <p className="mt-5 leading-relaxed text-ink-600">{intro}</p>
      <div className="legal mt-8 space-y-8 text-[15px] leading-relaxed text-ink-700">{children}</div>
      <div className="mt-12 flex flex-wrap gap-3 border-t border-ink/10 pt-6 text-sm">
        <Link to={other.to} className="font-semibold underline-offset-4 hover:underline">{other.label} →</Link>
        <span className="text-ink-300">·</span>
        <a href={WA_CLIENT_LINK} target="_blank" rel="noopener noreferrer" className="font-semibold text-[#1a9e4b] underline-offset-4 hover:underline">Une question ? WhatsApp {PHONE_DISPLAY}</a>
      </div>
    </main>
  )
}
const S = ({ id, t, children }: { id?: string; t: string; children: React.ReactNode }) => (
  <section id={id} className="scroll-mt-36">
    <h2 className="font-display text-2xl text-ink">{t}</h2>
    <div className="mt-2 space-y-2">{children}</div>
  </section>
)

export function Conditions() {
  return (
    <Shell title="Conditions générales de vente" other={{ to: '/confidentialite', label: 'Politique de confidentialité' }}
      intro="Les présentes conditions s’appliquent à toute commande passée sur le site ou l’application YVES STORE. En validant une commande, vous les acceptez.">
      <S t="1. Le vendeur">
        <p><b>YVES STORE</b>, boutique de mode, bijoux, chaussures, accessoires de téléphone et produits capillaires, basée en Côte d’Ivoire (Agboville et Abidjan).</p>
        <p>Contact : WhatsApp / téléphone <b>{PHONE_DISPLAY}</b> — e-mail <b>{CONTACT_EMAIL}</b>. Les informations légales de l’entreprise sont communiquées sur simple demande.</p>
      </S>
      <S t="2. Compte client">
        <p>Pour commander, vous créez un compte avec votre adresse e-mail ou votre numéro WhatsApp. Vous êtes responsable de la confidentialité de votre mot de passe. Vous pouvez le réinitialiser à tout moment (lien par e-mail ou code par WhatsApp).</p>
      </S>
      <S t="3. Prix">
        <p>Les prix sont indiqués en <b>francs CFA (FCFA)</b>, toutes taxes comprises. Certains articles (par exemple les perruques) ont un prix qui dépend de l’option choisie (longueur, qualité) : le prix affiché est mis à jour selon vos choix et vérifié par notre serveur au moment de la commande.</p>
        <p>Les frais de livraison s’ajoutent au prix des articles (voir article 6). Les codes promo s’appliquent selon leurs conditions affichées.</p>
      </S>
      <S id="paiement" t="4. Commande et paiement">
        <p>La commande est enregistrée dès sa validation ; vous recevez un numéro de commande (YS-…). Moyens de paiement acceptés : <b>paiement à la livraison</b> (espèces) et <b>Mobile Money</b> (Wave, Orange Money, MTN, Moov).</p>
        <p>Les paiements Mobile Money sont vérifiés par notre équipe avant l’expédition. Nous ne stockons jamais vos codes secrets Mobile Money ni vos données bancaires.</p>
      </S>
      <S t="5. Annulation">
        <p>Vous pouvez annuler une commande depuis « Mon compte » <b>dans les 24 heures</b> suivant la commande, tant qu’elle n’a pas été expédiée. Une commande <b>expédiée ou livrée ne peut plus être annulée</b> : utilisez alors le droit de retour (article 7).</p>
        <p>En cas d’annulation d’une commande déjà payée par Mobile Money, le remboursement est effectué sous 48 heures.</p>
      </S>
      <S id="livraison" t="6. Livraison">
        <ul className="list-disc space-y-1 pl-5">
          <li><b>Abidjan</b> : 2 000 FCFA, livraison sous 24 h pour une commande passée avant 14 h.</li>
          <li><b>Intérieur du pays</b> : 3 500 FCFA, 48 à 72 h.</li>
          <li><b>Retrait en boutique</b> : gratuit.</li>
          <li>Livraison <b>offerte dès 50 000 FCFA</b> d’achat.</li>
        </ul>
        <p>Les délais sont indicatifs. Nous vous contactons sur WhatsApp pour convenir du rendez-vous de livraison. Vérifiez votre colis à la réception.</p>
      </S>
      <S id="retours" t="7. Retours et échanges">
        <p>Vous disposez de <b>7 jours après réception</b> pour retourner ou échanger un article, dans son état d’origine, non porté, avec son emballage.</p>
        <p>Contactez-nous sur WhatsApp avec votre numéro de commande pour organiser le retour. Le remboursement ou l’échange est effectué après vérification de l’article.</p>
      </S>
      <S t="8. Avis clients">
        <p>Les clients connectés peuvent publier un avis et une note sur un article. Les avis doivent rester respectueux ; YVES STORE peut masquer un avis injurieux, hors sujet ou contenant des données personnelles. Le badge « Achat vérifié » s’affiche si vous avez commandé l’article.</p>
      </S>
      <S t="9. Garantie et responsabilité">
        <p>Les articles bénéficient de la garantie légale contre les défauts. Les photos sont aussi fidèles que possible ; de légères différences de couleur peuvent exister selon l’écran.</p>
      </S>
      <S t="10. Litiges">
        <p>Les présentes conditions sont soumises au droit ivoirien. En cas de difficulté, contactez-nous d’abord : nous recherchons toujours une solution amiable. À défaut, les tribunaux compétents de Côte d’Ivoire seront saisis.</p>
      </S>
    </Shell>
  )
}

export function Confidentialite() {
  return (
    <Shell title="Politique de confidentialité" other={{ to: '/conditions', label: 'Conditions générales de vente' }}
      intro="Nous protégeons vos données personnelles conformément à la loi ivoirienne n° 2013-450 du 19 juin 2013 relative à la protection des données à caractère personnel. Voici, simplement, ce que nous collectons et pourquoi.">
      <S t="1. Données collectées">
        <ul className="list-disc space-y-1 pl-5">
          <li><b>Compte</b> : prénom, nom, e-mail ou numéro WhatsApp, date de naissance (facultative), mot de passe (enregistré chiffré, jamais lisible par nous).</li>
          <li><b>Commandes</b> : articles, adresse et commune de livraison, numéro de contact, moyen de paiement choisi.</li>
          <li><b>Avis</b> : note et commentaire, publiés avec votre prénom et l’initiale de votre nom.</li>
          <li><b>Nouveautés</b> (si vous vous abonnez) : e-mail et/ou numéro WhatsApp.</li>
        </ul>
        <p>Nous ne collectons aucune donnée bancaire ni code Mobile Money.</p>
      </S>
      <S t="2. Utilisation">
        <p>Vos données servent uniquement à : gérer votre compte, préparer et livrer vos commandes, vous contacter au sujet d’une commande, réinitialiser votre mot de passe, et — seulement si vous l’avez accepté — vous informer de nos nouveautés. Elles ne sont <b>jamais vendues</b>.</p>
      </S>
      <S t="3. Qui y a accès">
        <p>Seul le gérant de YVES STORE accède à vos informations de commande. Nos prestataires techniques, tenus à la confidentialité :</p>
        <ul className="list-disc space-y-1 pl-5">
          <li><b>Supabase</b> — hébergement sécurisé de la base de données et des comptes ;</li>
          <li><b>Vercel</b> — hébergement du site ;</li>
          <li><b>Resend</b> — envoi des e-mails (réinitialisation, nouveautés) ;</li>
          <li><b>WhatsApp</b> — échanges que vous choisissez d’avoir avec nous ;</li>
          <li><b>Google Gemini</b> — assistant d’analyse du gérant, qui ne reçoit que des statistiques et des prénoms + initiales, jamais vos téléphones, e-mails ou adresses.</li>
        </ul>
      </S>
      <S t="4. Sécurité">
        <p>Connexion chiffrée (HTTPS), mots de passe chiffrés, accès aux données limité par des règles de sécurité côté serveur (chaque client ne voit que ses propres données), codes de réinitialisation à usage unique valables 30 minutes.</p>
      </S>
      <S t="5. Durée de conservation">
        <p>Les données de compte sont conservées tant que le compte est actif. Les données de commande sont conservées pour la durée nécessaire à la gestion commerciale et aux obligations légales. Vous pouvez vous désabonner des nouveautés à tout moment (lien en bas de chaque e-mail, « STOP » sur WhatsApp ou depuis « Mon compte »).</p>
      </S>
      <S t="6. Vos droits">
        <p>Vous pouvez à tout moment demander l’accès, la rectification ou la suppression de vos données, ou vous opposer à leur utilisation. Écrivez-nous sur WhatsApp ({PHONE_DISPLAY}) ou à <b>{CONTACT_EMAIL}</b> ; nous répondons sous 30 jours. Vous pouvez aussi saisir l’ARTCI (Autorité de Régulation des Télécommunications/TIC de Côte d’Ivoire).</p>
      </S>
      <S t="7. Stockage sur votre appareil">
        <p>Le site enregistre sur votre appareil votre panier, vos favoris et votre session de connexion, uniquement pour son fonctionnement. Aucun cookie publicitaire n’est utilisé.</p>
      </S>
    </Shell>
  )
}
