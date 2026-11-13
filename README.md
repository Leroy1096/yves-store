# YVES STORE — Boutique en ligne

Mode, chaussures, bijoux plaqué or, accessoires de téléphone et soins capillaires — pour les 15 à 80 ans.
Built with **React 18 + Vite + TypeScript + Tailwind CSS + Framer Motion + Zustand**.

## Lancer le projet
```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build in dist/
npm run preview  # serve the production build
```

## Fonctionnalités
- **Accueil** : hero animé (parallaxe), bandeau défilant, collections en mosaïque, onglets Best-sellers / Nouveautés / Promos, bannière bijoux, section « 15 à 80 ans », soins capillaires, avis clients, garanties.
- **Boutique** (`/boutique`) : filtres par catégorie, public (homme/femme/unisexe), tranche d’âge, prix max, note, promotions ; 6 tris ; recherche ; tous les filtres sont dans l’URL (liens partageables) ; tiroir de filtres sur mobile.
- **Fiche produit** (`/produit/:slug`) : galerie avec zoom au survol, swipe mobile, lightbox ; couleurs/tailles ; stock ; date de livraison estimée ; accordéons ; avis avec répartition, filtre par note, « utile » et formulaire d’avis (enregistré) ; produits associés ; barre d’achat fixe sur mobile.
- **Panier coulissant** : quantités, barre de progression vers la livraison offerte, suggestions d’ajout, enregistré dans localStorage.
- **Commande** (`/commande`) en 3 étapes : informations (validation des numéros ivoiriens), livraison (Abidjan 24 h / intérieur 48–72 h / retrait en boutique, villes & communes), paiement (à la livraison, Orange Money, MTN MoMo, Wave, Moov, carte) ; codes promo `YVES10` et `BIENVENUE` ; page de confirmation avec suivi WhatsApp.
- Favoris (`/favoris`), recherche instantanée (⌘/Ctrl + K), notifications, page 404, SEO/Open Graph, `vercel.json` (redirections SPA + cache des images).

## Comptes clients (Supabase)
- **Pages** : `/compte` (accueil espace membre : connexion + inscription), `/mon-compte` (aperçu, commandes, favoris, profil, sécurité), `/reinitialiser` (nouveau mot de passe).
- **Inscription** par **e-mail** ou **numéro ivoirien** (01/05/07…), mot de passe à **répéter**, indicateur de robustesse (8 caractères, une lettre, un chiffre).
- **Connexion** avec l’e-mail *ou* le numéro, quel que soit le format saisi (`07 08…`, `+225 07…`).
- Les numéros sont enregistrés en interne comme `225XXXXXXXXXX@tel.yvesstore.ci` (aucun SMS envoyé, aucun frais).
- **Base de données** (projet Supabase `yves-store`, région Paris) :
  - `profiles` : créé automatiquement à l’inscription (trigger), RLS = chaque client ne voit et ne modifie que son profil ; le téléphone et la méthode d’inscription ne sont pas modifiables par le client.
  - `orders` : commandes des clients connectés, RLS = lecture/création de ses propres commandes uniquement.
- Variables : `.env` → `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` (clé publique, sans danger côté navigateur). Ne jamais y mettre la clé `service_role`.
- **À faire avant la mise en ligne** : configurer un SMTP (Resend, Brevo…) dans Supabase → Auth → SMTP pour que les e-mails « mot de passe oublié » arrivent aux clients, et ajouter le domaine final dans Auth → URL Configuration.

## Structure inspirée de Shein (v3)

- **En-tête** : bandeau d’avantages, grande barre de recherche centrale (suggestions « Recherches populaires », historique, résultats instantanés), compte / favoris / panier, barre de catégories horizontale avec méga-menus.
- **Accueil** : carrousel + 3 tuiles campagnes, icônes rondes des sous-catégories, **Ventes Flash** (compte à rebours, % vendu), coupons copiables, blocs promo « ACHETER », **Top Tendances** (#hashtags), récemment consultés, fil **« Pour vous »** à chargement infini (onglets par âge / prix).
- **/categories** : menu latéral + sous-catégories (style appli mobile).
- **Boutique** : filtres `cat`, `sub`, `genre`, `age`, `prix`, `note`, `promo`, `flash`, `express`, `q`, `tri`.
- **Ajout rapide** : fenêtre de choix taille/couleur sans quitter la page.
- **Mobile** : barre d’onglets Accueil · Catégories · Nouveautés · Panier · Moi.
- Sous-catégories, ventes flash et hashtags : `src/data/products.ts` (`sub`, `flash`, `hashtag`, `subcategories`). Menu : `src/data/nav.ts`.

## Annulation de commande (24 h)

- Le client peut annuler sa commande **pendant 24 heures** après l’avoir passée. Il le fait depuis la page de confirmation ou depuis *Mon compte → Mes commandes*. Un compte à rebours et une raison obligatoire accompagnent l’annulation.
- Après 24 h, ou si la commande est expédiée ou livrée, l’annulation est **impossible**. Le client voit alors un lien WhatsApp.
- La règle est appliquée **dans la base Supabase**, avec la fonction `cancel_order` (migration `order_cancellation_24h`) :
  - la date de commande est toujours fixée par le serveur ;
  - un client ne peut annuler que ses propres commandes ;
  - il ne peut pas modifier directement le statut.
- Les colonnes `cancelled_at` et `cancel_reason` de la table `orders` vous indiquent qui a annulé et pourquoi.
- Logique côté site : `src/lib/orders.ts` (`CANCEL_WINDOW_MS`) et `src/components/CancelOrder.tsx`.

## Sélection de la ville

- `src/data/cities.ts` : 114 villes réelles — les chefs-lieux des **111 départements** de Côte d’Ivoire (découpage 2020, source Wikipédia « Departments of Ivory Coast ») + Anyama, Bingerville et Songon (district d’Abidjan). Tri alphabétique français (`Intl.Collator('fr')`). Les 10 communes d’Abidjan sont aussi exportées.
- `src/components/SearchSelect.tsx` : liste déroulante avec barre de recherche (insensible aux accents : « seguela » trouve Séguéla), raccourcis des villes populaires, lettres A–Z, navigation clavier, bottom-sheet sur mobile. Si la localité n’est pas dans la liste (village, sous-préfecture), le client peut saisir son nom.
- Livraison express automatiquement proposée pour Abidjan, Anyama, Bingerville et Songon (`isExpressCity`).

## Profil client

- En-tête « Mon espace » : prénom, niveau de fidélité et déconnexion uniquement (ni e-mail ni date d’inscription).
- **Date de naissance** Jour / Mois / Année (`src/components/ProfileFields.tsx`) : jours ajustés au mois (29 février géré), 1920 → 2020. Colonne `profiles.birth_date` ; `birth_year` est synchronisée automatiquement par trigger.
- **Numéro de téléphone** (+225, 10 chiffres) : colonne `profiles.contact_phone`, validée côté client et en base. Pour un compte e-mail c’est son numéro de contact ; pour un compte téléphone, c’est un second numéro / WhatsApp. Pré-rempli au paiement.

## Modifier le catalogue
Tout est dans `src/data/products.ts` (produits, prix en FCFA, avis). Images : `public/img/prod/<nom>-1.webp` (principale) et `-2.webp` (détail).
Frais de livraison, seuil de gratuité et codes promo : `src/lib/format.ts`.

## Mise en production
- **Vercel** : importer le dépôt → framework « Vite » → build `npm run build`, output `dist`.
- **Paiements réels** : brancher CinetPay / PayDunya / Wave Business dans `place()` de `src/pages/Checkout.tsx`.
- **Commandes en base** : les commandes sont pour l’instant enregistrées dans le navigateur (`useOrders`) ; à remplacer par un insert Supabase.

## Prix alignés sur le marché ivoirien (nov. 2026)
Les prix de `src/data/products.ts` suivent l'analyse `../analyse-marche/` (relevés Jumia CI, Oplayce, Decathlon CI…). La bannière « Fierté Wax » calcule son « Dès … FCFA » à partir des prix réels (chemise wax / robe wax) et le filtre prix affiche le prix minimum réel du catalogue.

## WhatsApp
Numéro : **+225 01 40 81 04 15** — défini à un seul endroit : `src/lib/contact.ts` (`WHATSAPP_NUMBER`, `PHONE_DISPLAY`).
- Bouton flottant vert + icône du pied de page : message d'accueil YVES STORE (menu « 1. JE VEUX / 2. J'AI UN PROBLÈME »), constante `WA_WELCOME` dans `src/lib/contact.ts`.
- Tiroir panier : bouton « Commander sur WhatsApp » (liste + total).
- Pied de page : icône WhatsApp + numéro cliquable (appel) ; liens « suivre ma commande », « annulation » et « mot de passe oublié » vers ce numéro.

## Messages sur le WhatsApp du client (mode semi-automatique)

« Mot de passe oublié », « Suivre ma commande » et l’aide / confirmation d’annulation sont envoyés **sur le WhatsApp du client** (et non plus sur celui de la boutique).

**Fonctionnement**
1. Le client fait sa demande sur le site : bouton vert « Recevoir un code sur WhatsApp », « Suivre ma commande sur WhatsApp », « Recevoir de l’aide sur mon WhatsApp ». Une annulation crée automatiquement une confirmation.
2. La demande arrive dans l’**Espace gérant** : `/gerant`, accessible depuis « Mon espace », bouton vert « Espace gérant ».
3. Le gérant clique sur « Envoyer sur le WhatsApp du client ». WhatsApp s’ouvre sur **le numéro du client** avec le message prêt, et il ne reste qu’à appuyer sur Envoyer.

**Mot de passe oublié**
- Le gérant clique sur « Générer le code ». Le code fait 6 chiffres, reste valable 30 min et est stocké chiffré (bcrypt).
- Le client saisit le code sur `/reinitialiser` et choisit un nouveau mot de passe. Il est ensuite connecté automatiquement.
- Le système fonctionne aussi pour les comptes créés avec un numéro de téléphone.
- Limites anti-abus :
  - 3 demandes par heure ;
  - 5 essais par code ;
  - réponse neutre si le compte n’existe pas.

**Numéro utilisé**
- Le code est envoyé au numéro WhatsApp du profil (« Numéro de téléphone » / contact), sinon au numéro de connexion.
- Pour le suivi et l’annulation, c’est le numéro saisi à la commande.

**Gérants**
Ce sont les comptes présents dans la table `admins`. **yvesstore1@gmail.com** est pré-autorisé (table `admin_invites`) : il devient gérant automatiquement à la création du compte. Pour pré-autoriser une autre adresse : `insert into public.admin_invites (email) values ('adresse@exemple.ci');`. Pour un compte déjà existant :
```sql
insert into public.admins (user_id) select id from auth.users where email = 'nouveau@exemple.ci';
```

**Côté technique**
- Table `whatsapp_requests` (RLS : lecture réservée aux gérants).
- Fonctions SQL :
  - `request_password_reset_whatsapp`
  - `request_order_whatsapp`
  - `admin_prepare_reset`
  - `admin_set_request_status`
  - `admin_set_order_status`
  - `consume_reset_code` (réservée au serveur)
- Edge function Supabase `wa-reset-password` : elle vérifie le code et change le mot de passe côté serveur.
- Fichiers : `src/lib/whatsapp.ts`, `src/components/WaRequest.tsx`, `src/pages/Manager.tsx`, `src/pages/ResetPassword.tsx`.

**Passer en 100 % automatique plus tard**
- Il faut un compte Meta Business vérifié et un numéro dédié à l’API WhatsApp Cloud.
- Il faut aussi des modèles de messages approuvés (catégorie « authentification » pour les codes, « utilitaire » pour le suivi). L’envoi est facturé par message.
- Il suffira d’appeler l’API depuis une edge function au moment où la demande est créée. La table et les écrans restent les mêmes.

## Espace gérant (back-office) — `/gerant`

Le profil gérant est **séparé des profils clients** : à la connexion, un gérant est envoyé directement sur `/gerant` (sans en-tête ni pied de page boutique). Un client qui tape `/gerant` voit « Accès réservé ».

| Rubrique | Ce que fait le gérant |
|---|---|
| **Tableau de bord** | Chiffre d’affaires, commandes reçues, panier moyen, annulations ; articles **sortis** / **entrés**, stock disponible et sa valeur ; graphiques par jour ; meilleures ventes ; alertes stock bas ; dernières commandes (période : aujourd’hui, 7 j, 30 j, tout). |
| **Commandes** | Recherche, filtre par statut, export Excel (CSV). Passer en *Confirmée → En préparation → Expédiée → Livrée*, annuler avec un motif (les articles reviennent en stock), envoyer le statut au client par WhatsApp. |
| **Clients inscrits** | Liste de tous les inscrits (nom, téléphone, e-mail, ville, nombre de commandes, total dépensé). Voir ses commandes, écrire sur WhatsApp, **bloquer / débloquer**, supprimer un compte (l’historique des commandes est conservé). |
| **Produits & prix** | Modifier le **prix** et le **prix barré** ; **retirer** un article de la vente ou le remettre en vente. Le changement apparaît immédiatement sur la boutique. |
| **Stock** | Enregistrer une **entrée** (réception fournisseur), une **sortie** (vente en boutique, casse…) ou un **inventaire** ; état du stock et historique de tous les mouvements (les ventes en ligne et les annulations sont enregistrées automatiquement). |
| **Messages WhatsApp** | Demandes « Suivre ma commande », annulation et « mot de passe oublié » à envoyer au client en un clic. |
| **Mon profil** | Nom, numéro WhatsApp, mot de passe, déconnexion. |

Côté boutique : un article retiré disparaît des listes (une page « Article retiré de la vente » remplace sa fiche) ; un article à 0 en stock s’affiche « Épuisé » et ne peut plus être ajouté au panier ; chaque commande décrémente le stock.

**Ajouter un gérant** (le bouton « Nommer gérant » n’existe plus sur les fiches clients) : dans Supabase (SQL) : `insert into public.admin_invites (email) values ('adresse@exemple.ci');` — le compte devient gérant à son inscription.

Sécurité : toutes les actions passent par des fonctions Supabase `admin_*` qui vérifient le rôle gérant côté serveur ; un gérant ne peut ni se bloquer, ni se supprimer, ni supprimer un autre gérant.

**Redirection automatique selon le rôle** : à la connexion (ou à l’inscription), le serveur indique si le compte est gérant ou client. Gérant → `/gerant` ; client → `/mon-compte`. Un client qui tape `/gerant` est renvoyé vers son espace client, un gérant qui tape `/mon-compte` est renvoyé vers l’espace gérant.

**Aperçu fichier unique** : l’aperçu hors ligne fonctionne sans Internet ; les comptes et commandes y restent dans le navigateur. Le compte gérant `yvesstore1@gmail.com` y est reconnu automatiquement (mot de passe fixé à la première connexion dans l’aperçu). Aucune donnée fictive n’y est préchargée.

**Commande réservée aux inscrits** : seuls les clients ayant un compte et connectés peuvent commander. Un visiteur qui clique sur « Commander » est envoyé vers Connexion / Inscription (son panier est conservé), puis revient au paiement. Le serveur refuse aussi toute commande sans compte (règle Supabase `orders_insert_own`, migration `orders_registered_clients_only`).

**Commander sur WhatsApp** : réservé aux clients connectés. Le bouton se trouve à l’étape *Paiement* de la commande (plus dans le panier) et envoie au WhatsApp de la boutique le panier, le total, le mode de paiement, le nom, le téléphone et l’adresse du client.

## Aperçu fichier unique
`/home/user/yves-store-apercu-2.html` est le site complet dans un seul fichier HTML (images intégrées), pour l’ouvrir sans serveur.
- Pour le reconstruire : `npx vite build -c vite.single.config.ts && python3 scripts/build-single.py`
- Les comptes, l’Espace gérant et les demandes WhatsApp ont besoin d’Internet (Supabase). Dans l’aperçu intégré, qui est hors ligne, ils ne répondent pas, mais ils fonctionnent dans un vrai navigateur.

**Ajouter un produit / une catégorie (Gérant → Stock)** : le bloc « Ajouter un produit » a deux onglets.
- *Nouveau produit* : nom, catégorie (ou « ＋ Créer une nouvelle catégorie »), prix, prix barré, quantité reçue, public, 1 à 4 photos, description, tailles, couleurs. Le produit est mis en vente aussitôt (badge « Nouveau » 30 jours), la quantité reçue est enregistrée comme entrée de stock.
- *Déjà en boutique* : réassort / sortie / inventaire (ancien « Nouveau mouvement »).
- Côté serveur (migration `catalog_new_products_and_categories`) : table `catalog_categories`, colonnes de fiche ajoutées à `catalog_products`, fonctions `admin_create_category` et `admin_create_product` (réservées aux gérants), stockage public `produits` pour les photos (envoi réservé aux gérants, 5 Mo max, réduites à 1000 px).
- Une nouvelle catégorie apparaît dans le menu Catégories, les filtres et la recherche dès qu'elle contient un produit en vente.

**Graphiques du tableau de bord** : « Chiffre d’affaires » et « Mouvements de stock » ont chacun 4 vues — *Jour* (heure par heure), *Semaines* (7 jours), *Mois* (un bâton par jour), *Années* (un bâton par mois). Flèches ‹ › pour remonter dans le passé, bouton « Actuel » pour revenir à la période en cours, icône calendrier pour aller directement à une date. Total de la période, comparaison avec la période précédente, détail d’une barre au toucher. Les totaux sont calculés par le serveur (fonctions `admin_stats_series`, `admin_stats_hours`, `admin_stats_first_date`, heure d’Abidjan). L’aperçu contient ≈ 18 mois d’activité fictive pour illustrer ces vues.

**Assistant IA du gérant** : le bouton « ✨ Assistant IA » remplace « Déconnecter » (barre latérale sur ordinateur, en-tête sur mobile). La déconnexion se fait depuis « Mon profil » → « Se déconnecter ».
- Ouvre un panneau de discussion : point du jour automatique, questions libres en français, suggestions cliquables, liens vers les pages, bouton « Copier ».
- Sait répondre sur : chiffre d’affaires (n’importe quelle période : hier, semaine dernière, en mars, 2025…), meilleures ventes, réassort conseillé (rythme des 30 derniers jours), articles qui ne se vendent pas, idées de promotion, prévision de fin de mois / objectif, annulations et motifs, meilleurs clients et clients à relancer, nouveaux inscrits, villes / paiements / livraison, meilleurs jours et heures, valeur du stock, fiche d’un produit ou d’une commande (YS-…), rédaction de posts et de descriptions.
- Moteur d’analyse intégré (`src/pages/admin/assistant-engine.ts`) : fonctionne partout, y compris dans l’aperçu hors ligne.
- IA générative (sur le vrai site) : fonction Supabase `assistant-gerant` (réservée aux gérants). Elle s’active dès qu’une clé est ajoutée dans Supabase → Edge Functions → Secrets : `OPENAI_API_KEY` (modèle `OPENAI_MODEL`, par défaut gpt-4o-mini) **ou** `GEMINI_API_KEY` (modèle `GEMINI_MODEL`, par défaut gemini-2.5-flash). Sans clé, le site utilise automatiquement le moteur intégré.


## Sécurité des commandes (calcul côté serveur)
Depuis la migration `orders_server_side_totals`, le trigger `orders_before_insert` **ignore les montants envoyés par le navigateur** :
- prix et noms relus dans `catalog_products` (produit inexistant ou retiré → refus `PRODUCT_UNAVAILABLE`) ;
- quantités 1 à 99 (`INVALID_QTY`), stock vérifié et verrouillé (`OUT_OF_STOCK`) ;
- codes promo validés en base (`YVES10` −10 %, `BIENVENUE` −5 000 FCFA dès 30 000) dans la colonne `promo_code` ;
- livraison recalculée (Abidjan 2 000, intérieur 3 500, retrait 0, offerte dès 50 000 après remise) ;
- sous-total, remise, livraison et total réécrits par le serveur.
Si vous changez les frais ou les codes promo dans `src/lib/format.ts`, changez aussi la fonction `orders_before_insert`.

## Assistant IA — Google Gemini (activé)
- Secret Supabase **`GEMINI_API_KEY`** installé (jamais dans le code ni dans le navigateur).
- Fonction `supabase/functions/assistant-gerant` (v4) : réservée aux gérants (`is_admin`), clé envoyée en en-tête `x-goog-api-key`.
- Modèles essayés dans l'ordre (repli automatique si surcharge ou quota) : `gemini-3-flash-preview`, `gemini-3.5-flash-lite`, `gemini-3.1-flash-lite`, `gemini-flash-latest`. Pour changer : secret `GEMINI_MODEL` (liste séparée par des virgules).
- Données envoyées : chiffres calculés par `buildFacts` (ventes, commandes, stock, clients en **prénom + initiale** uniquement, sans téléphone, e-mail ni adresse) + limites des données.
- Si Gemini est indisponible, le moteur d'analyse intégré répond (questions « audit », « clients », ventes, stock…).
- Les réponses Gemini portent le badge « ✨ Gemini ». L'IA ne modifie aucune donnée : elle propose, le gérant valide dans le back-office.
- Changer de clé : Supabase → Edge Functions → Secrets → `GEMINI_API_KEY`.
