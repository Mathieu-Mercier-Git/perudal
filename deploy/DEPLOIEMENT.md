# Déployer Perudal en production

Architecture cible : un seul petit VPS Linux qui héberge tout.

```
Navigateur ──HTTPS/WSS──> Caddy (ports 80/443)
                            ├── /api/*   ──> backend Java (localhost:8080)
                            ├── /socket  ──> backend Java (localhost:8080, WebSocket)
                            └── le reste ──> fichiers statiques React (/opt/perudal/front)
```

Le frontend appelle `/api` et `/socket` en relatif : aucune URL n'est à configurer
côté code, tout passe par le même domaine. Pas de base de données à installer
(l'état des parties est en mémoire).

## Étape 1 — Louer un VPS (~5 €/mois)

À faire soi-même (création de compte + paiement). Hébergeurs adaptés :
- **Hetzner Cloud** (hetzner.com/cloud) : CX22, ~4,5 €/mois — excellent rapport qualité/prix
- **OVHcloud** (ovhcloud.com) : VPS "Starter" ou "Value" — hébergeur français
- **Scaleway** (scaleway.com) : Stardust/DEV1-S — français aussi

Configuration à choisir lors de la commande :
- **OS : Ubuntu 24.04 LTS**
- 2 Go de RAM suffisent largement (1 Go peut suffire)
- Localisation : un datacenter en Europe (Falkenstein, Gravelines, Paris…)
- **Clé SSH** : fournir sa clé publique à la commande (voir ci-dessous)

### Créer une clé SSH (si vous n'en avez pas)

```bash
ssh-keygen -t ed25519
```

(Entrée à chaque question ; la clé publique à copier chez l'hébergeur s'affiche avec
`cat ~/.ssh/id_ed25519.pub`.)

À la fin de cette étape vous avez **l'adresse IP publique** du serveur, et
`ssh root@IP_DU_SERVEUR` fonctionne.

## Étape 2 — Acheter un nom de domaine (~10 €/an)

À faire soi-même également. Registrars sérieux : OVH, Gandi, Cloudflare Registrar,
Namecheap. N'importe quelle extension convient (.fr, .com, .games…).

Puis, dans la zone DNS du domaine, créer un enregistrement :

| Type | Nom            | Valeur         |
|------|----------------|----------------|
| A    | `@` (ou un sous-domaine, ex. `jeu`) | IP du serveur |

La propagation prend de quelques minutes à quelques heures. Vérifier avec :

```bash
dig +short mon-domaine.fr
```

→ doit afficher l'IP du serveur avant de passer à l'étape 4 (sinon Caddy ne pourra
pas obtenir le certificat HTTPS).

## Étape 3 — Envoyer les fichiers de provisionnement sur le serveur

Depuis la racine du projet, sur votre machine :

```bash
scp deploy/server-setup.sh deploy/perudal.service deploy/Caddyfile root@IP_DU_SERVEUR:/root/
```

## Étape 4 — Provisionner le serveur (une seule fois)

```bash
ssh root@IP_DU_SERVEUR "bash /root/server-setup.sh mon-domaine.fr"
```

Le script installe Java 17 et Caddy, crée l'utilisateur `perudal`, les dossiers,
le service systemd, le pare-feu, et génère le mot de passe de l'API interne
(Swagger/monitoring) dans `/etc/perudal/env` — **notez-le, il s'affiche à l'écran**.

## Étape 5 — Déployer l'application

Une seule fois : créer sa configuration locale de déploiement.

```bash
cp deploy/deploy.env.example deploy/deploy.env
```

Éditer `deploy/deploy.env` et mettre `PERUDAL_SERVER=root@IP_DU_SERVEUR`.

Puis, à chaque déploiement (le premier comme les suivants) :

```bash
bash deploy/deploy.sh
```

Le script compile le backend et le frontend, synchronise le tout sur le serveur
et redémarre le service.

⚠️ Un redéploiement redémarre le backend et **coupe les parties en cours**
(l'état est en mémoire) : déployez à une heure creuse.

## Étape 6 — Vérifier

- Ouvrir `https://mon-domaine.fr` : la page d'accueil doit s'afficher **en HTTPS**
  (cadenas, certificat automatique).
- Créer une partie, puis la rejoindre depuis un second appareil (ou une fenêtre
  de navigation privée) : le lobby doit se mettre à jour en temps réel — c'est la
  preuve que le WebSocket (`wss:`) fonctionne à travers Caddy.
- Swagger : `https://mon-domaine.fr/api/swagger` (identifiants de `/etc/perudal/env`).

## Dépannage

| Symptôme | Piste |
|----------|-------|
| Le site ne répond pas | `systemctl status caddy` sur le serveur ; DNS propagé ? (`dig +short mon-domaine.fr`) |
| Erreur de certificat HTTPS | Le DNS ne pointait pas encore vers le serveur quand Caddy a démarré : `systemctl restart caddy` une fois le DNS propagé |
| La page s'affiche mais rien en temps réel | Logs backend : `journalctl -u perudal -f` ; vérifier que `/socket` répond (onglet Réseau du navigateur, connexion WS en vert) |
| Le backend ne démarre pas | `journalctl -u perudal -n 50` pour lire l'erreur |

## Coût total

~5 €/mois (VPS) + ~10 €/an (domaine). Rien d'autre.
