# Manoir de la Champagne

Site du gîte **Manoir de la Champagne** (Millières, Manche) : 7 pages publiques et un espace propriétaires pour modifier les textes, les photos, les tarifs et la bannière d'événements, et suivre les demandes de réservation.

- **Front** : Vite + React 19 + Tailwind 4 + shadcn/ui (`src/`)
- **API** : Node 22 + Express 5 + SQLite intégré (`node:sqlite`) (`server/`)
- **Données par défaut** : `shared/` (textes, photos, tarifs), utilisées au premier démarrage et comme repli côté front
- **Déploiement** : une seule image Docker qui sert l'API, les photos envoyées et le site construit

## Pages

| Public | Admin (`/admin`) |
| --- | --- |
| `/` Accueil (bandeau de réservation, bannière d'événement) | `/admin/connexion` Connexion |
| `/le-gite` Le Gîte | `/admin` Tableau de bord (KPI, activité, demandes) |
| `/jardins-spa` Jardins & Spa | `/admin/contenu` Contenu des pages |
| `/tarifs` Tarifs & conditions | `/admin/photos` Photos & médias |
| `/region` La Région | `/admin/banniere` Bannière & événements |
| `/avis` Avis clients | `/admin/tarifs` Tarifs |
| `/contact` Contact & accès (pré-rempli depuis le bandeau) | |

## Développement

```bash
pnpm install
pnpm --dir server install
```

Dans deux terminaux :

```bash
ADMIN_EMAIL=moi@example.test ADMIN_PASSWORD=un-mot-de-passe pnpm dev:api
```

```bash
pnpm dev
```

Le site tourne sur http://localhost:5173 (Vite redirige `/api` et `/uploads` vers l'API sur le port 3000). La base SQLite et les photos envoyées sont dans `server/data/` (ignoré par git).

> Sous Windows, gardez le projet dans un chemin court (par ex. `Documents\…`) : au-delà de 260 caractères, Vite ne trouve plus ses dépendances.

## Déploiement sur le VPS (Docker Compose)

1. Cloner le dépôt sur le VPS puis créer le fichier d'environnement :

   ```bash
   cp .env.example .env
   openssl rand -hex 32   # à coller dans SESSION_SECRET
   ```

   Renseigner au minimum `SESSION_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` (le compte est créé au premier démarrage seulement).

2. Construire et lancer :

   ```bash
   docker compose up -d --build
   ```

3. Le conteneur écoute sur `127.0.0.1:3000` (modifiable via `HOST_PORT`). Placer un reverse proxy HTTPS devant, par exemple avec Caddy :

   ```caddy
   manoirdelachampagne.fr {
     encode gzip
     reverse_proxy 127.0.0.1:3000
   }
   ```

   Les cookies de session sont `Secure` en production : le site doit être servi en HTTPS (sinon `COOKIE_SECURE=false`).

### Mettre à jour

```bash
git pull
docker compose up -d --build
```

### Comptes administrateurs

Ajouter un compte (ou réinitialiser un mot de passe) :

```bash
docker compose exec site node --disable-warning=ExperimentalWarning src/create-user.js loic@example.fr "nouveau-mot-de-passe" "Loïc Courteille"
```

### Sauvegardes

Tout l'état du site (base SQLite + photos envoyées) est dans le volume `manoir-data`, monté sur `/data` :

```bash
docker run --rm -v gite_manoir_champagne_manoir-data:/data -v "$PWD":/backup alpine \
  tar czf /backup/manoir-$(date +%F).tar.gz -C /data .
```

(Le nom exact du volume est donné par `docker volume ls`.)

### Notifications e-mail

Si les variables `SMTP_*` et `NOTIFY_EMAIL` sont renseignées, chaque demande envoyée depuis la page Contact est aussi transmise par e-mail (avec `Reply-To` sur le voyageur). Sans elles, les demandes restent consultables dans le tableau de bord.

## Ce qui reste à faire

- Traductions EN / DE (le sélecteur affiche « bientôt disponible »)
- Vrais avis Abritel, lien Abritel, itinéraires, photos de la région et du spa (éditables depuis l'admin)
- Mentions légales, politique de confidentialité, plan du site
- Vraie carte d'accès (OpenStreetMap / Google Maps, avec consentement RGPD si besoin)
- Redimensionnement automatique des photos envoyées

## Scripts

- `pnpm dev` — front en développement
- `pnpm dev:api` — API en développement (rechargement auto)
- `pnpm build` — build du front
- `pnpm format` — Prettier

## Licence

MIT
