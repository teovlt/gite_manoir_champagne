# Manoir de la Champagne

Site du gîte **Manoir de la Champagne** (Millières, Manche), en **français, anglais et allemand**, avec un espace propriétaires pour gérer textes, photos, tarifs, événements, disponibilités, demandes de réservation et comptes.

- **Front** : Vite + React 19 + Tailwind 4 + shadcn/ui + react-i18next + Leaflet (`src/`)
- **API** : Node 22 + Express 5 + **MongoDB** (photos dans GridFS, optimisées en WebP avec sharp) (`server/`)
- **Données par défaut** : `shared/` (textes FR/EN/DE, photos, tarifs) — utilisées au premier démarrage et comme repli côté front
- **Déploiement** : une seule image Docker qui sert l'API, les photos et le site ; toutes les données sont dans MongoDB

## Fonctionnalités

**Site public** — `/` (français), `/en/…`, `/de/…`

| Page | Ce qui fonctionne |
| --- | --- |
| Accueil | Bandeau de réservation (vérifie les disponibilités puis pré-remplit Contact), bannière d'événement, galerie en lightbox, carte |
| Le Gîte, Jardins & Spa, La Région | Textes et photos gérés depuis l'admin, lightbox, apparitions au défilement |
| Tarifs | Grille, saisons et suppléments depuis l'admin, **calendrier des disponibilités** cliquable |
| Avis | Avis Google (`shared/google-reviews.json`, note et nombre d'avis), avis supplémentaires éditables, lien Abritel |
| Contact | Formulaire (demande enregistrée + e-mails), **carte OpenStreetMap**, itinéraire Google Maps / Waze / Plans, « depuis ma position », coordonnées GPS |
| Mentions légales, Confidentialité, Plan du site | Textes éditables dans l'admin |

Langue : sélecteur FR / EN / DE dans l'en-tête, détection de la langue du navigateur à la première visite, `hreflang`, `sitemap.xml` multilingue, `robots.txt`.

SEO : titres, descriptions et images de partage par page et par langue dans `shared/seo.json`. Le serveur les injecte dans le HTML (balises `<title>`, `canonical`, `hreflang`, Open Graph, données structurées `LodgingBusiness`) et renvoie un vrai 404 pour les pages inconnues. Les polices (Fraunces, Inter) sont servies par le site lui-même — aucune requête vers Google Fonts.

**Admin** — `/admin`

| Écran | Rôle |
| --- | --- |
| Tableau de bord | Demandes à traiter, activité, prochains séjours |
| Demandes | Répondre, confirmer (bloque les dates), refuser, notes internes |
| Calendrier | Bloquer des dates, import iCal Abritel / Airbnb / Booking (toutes les 30 min), lien d'export iCal à coller sur ces plateformes (dates bloquées et demandes confirmées, sans nom) |
| Contenu des pages | Tous les textes, par langue, avec le français en référence |
| Photos & médias | Glisser-déposer, remplacement, légendes par langue |
| Bannière & événements | Événements traduits, aperçu dans chaque langue |
| Tarifs | Prix, saisons (par langue), suppléments, historique des changements |
| Coordonnées & carte | Téléphone, adresse, lien Abritel, position GPS (recherche d'adresse ou clic sur la carte) |
| Utilisateurs | Comptes **administrateur** / **éditeur** : l'admin modifie nom, e-mail, rôle et mot de passe de chacun, envoie un lien de réinitialisation ou renvoie une invitation |
| Modèles d'e-mails | Objet et texte de chaque e-mail envoyé (variables `{{nom}}`…, aperçu, envoi de test, retour au texte d'origine), accusé de réception en FR / EN / DE |
| Mon compte | Nom, e-mail (confirmé par un lien envoyé à la nouvelle adresse), mot de passe actuel → nouveau, ou lien de réinitialisation par e-mail |

## Développement

```bash
pnpm install
pnpm --dir server install
```

Créer `server/.env` (ignoré par git) :

```bash
MONGODB_URI=mongodb://127.0.0.1:27017/manoir
ADMIN_EMAIL=moi@example.test
ADMIN_PASSWORD=un-mot-de-passe-long
PUBLIC_URL=http://localhost:5173
COOKIE_SECURE=false
```

MongoDB local, via Docker (`compose.dev.yaml`, image `mongo:7`, données gardées dans un volume) :

```bash
pnpm db:up      # démarre MongoDB sur 127.0.0.1:27017
pnpm db:down    # l'arrête, les données restent
pnpm db:reset   # l'arrête et efface toutes les données
```

Puis, dans deux terminaux :

```bash
pnpm dev:api
```

```bash
pnpm dev
```

Le site tourne sur http://localhost:5173 (Vite redirige `/api` et `/uploads` vers l'API sur le port 3000).

> Sous Windows, gardez le projet dans un chemin court (par ex. `Documents\…`) : au-delà de 260 caractères, Vite ne trouve plus ses dépendances.

## Déploiement sur le VPS

### Avec Dokploy

1. Application **Compose** pointant sur ce dépôt (branche `main`, fichier `compose.yaml`).
2. Onglet **Environment** : coller le contenu de `.env.example` et remplir au minimum `MONGODB_URI`, `PUBLIC_URL`, `SESSION_SECRET` (`openssl rand -hex 32`), `ADMIN_EMAIL`, `ADMIN_PASSWORD`.
3. Onglet **Domains** : **Service Name = `site`**, **Container Port = `3000`**, HTTPS activé.
4. Déployer. Le service est branché sur le réseau `dokploy-network` (déclaré dans `compose.yaml`) pour que Traefik puisse le joindre — sans lui, « Bad Gateway ».

Au premier démarrage, l'application crée les index MongoDB, insère les textes / photos / tarifs par défaut et le premier compte administrateur. Les redémarrages suivants ne modifient jamais ce que les propriétaires ont saisi.

> MongoDB hébergé chez Dokploy : créer une base « Mongo » dans le même projet et utiliser son URI interne. MongoDB Atlas : autoriser l'IP du VPS dans *Network Access*.

**Dépannage**

- `querySrv ESERVFAIL` / `ETIMEOUT` dans les logs : le DNS du VPS ne résout pas les URI `mongodb+srv://`. Utilisez la forme standard, qui liste les serveurs du cluster :
  `mongodb://utilisateur:motdepasse@hote-00:27017,hote-01:27017,hote-02:27017/manoir?ssl=true&replicaSet=atlas-xxxx-shard-0&authSource=admin&retryWrites=true&w=majority`.
  Atlas la donne dans *Connect › Drivers* en choisissant une ancienne version du driver Node (2.2.12). Les noms d'hôtes et le `replicaSet` s'obtiennent aussi depuis un poste où le DNS fonctionne : `nslookup -type=SRV _mongodb._tcp.<cluster>.mongodb.net` et `nslookup -type=TXT <cluster>.mongodb.net`. En option, `DNS_SERVERS` force d'autres résolveurs pour les requêtes SRV, si le VPS les autorise.
- `MongoServerSelectionError` : l'IP du VPS n'est pas autorisée dans Atlas, ou identifiants incorrects.
- Tant que la base est injoignable, l'application réessaie toutes les 3 à 30 s (le site répond « Bad Gateway » pendant ce temps) au lieu de redémarrer en boucle.

### Sans Dokploy

Retirer les sections `networks` de `compose.yaml`, publier le port (`ports: ["127.0.0.1:3000:3000"]` sur le service `site`), créer `.env` à partir de `.env.example`, puis :

```bash
docker compose up -d --build
```

et placer un reverse proxy HTTPS devant (Caddy : `reverse_proxy 127.0.0.1:3000`). Les cookies de session sont `Secure` en production : le site doit être servi en HTTPS (sinon `COOKIE_SECURE=false`).

### Comptes

Le premier compte vient de `ADMIN_EMAIL` / `ADMIN_PASSWORD`. Les suivants se créent dans **Admin › Utilisateurs**. En secours (mot de passe perdu sans e-mail configuré) :

```bash
docker compose exec site node src/create-user.js maryline@example.fr "nouveau-mot-de-passe" "Maryline Courteille"
```

### E-mails

Avec [Resend](https://resend.com) (`RESEND_API_KEY`, `MAIL_FROM` sur un domaine vérifié, `NOTIFY_EMAIL`) :

- les propriétaires (`NOTIFY_EMAIL`) reçoivent chaque demande, avec `Reply-To` sur le visiteur ;
- le visiteur reçoit un accusé de réception dans sa langue ;
- « Mot de passe oublié », les invitations d'utilisateurs et la confirmation d'un changement d'e-mail fonctionnent ;
- tous ces textes se modifient dans **Admin › Modèles d'e-mails**.

Sans clé Resend, les demandes restent consultables dans l'admin et les comptes se créent avec un mot de passe provisoire.

### Sauvegardes

Tout est dans MongoDB (y compris les photos, collection `uploads.*`) :

```bash
mongodump --uri "$MONGODB_URI" --archive=manoir-$(date +%F).gz --gzip
```

## Contenus encore à compléter (depuis l'admin)

- Vrais avis Abritel et lien de l'annonce (Avis, Coordonnées & carte)
- SIRET, directeur de publication et hébergeur (Mentions légales)
- Itinéraires « en voiture » / « en train » (Contact)
- Photos de la région, du spa, du jardin nord et des propriétaires (Photos & médias)
- Calendrier des saisons à confirmer (Tarifs)

## Scripts

- `pnpm dev` — front en développement
- `pnpm dev:api` — API en développement (rechargement auto, lit `server/.env`)
- `pnpm build` — build du front
- `pnpm format` — Prettier

## Licence

MIT
