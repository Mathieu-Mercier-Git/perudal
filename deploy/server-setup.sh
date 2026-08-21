#!/usr/bin/env bash
# Provisionnement initial du serveur Perudal — À EXÉCUTER UNE SEULE FOIS, SUR LE SERVEUR, EN ROOT.
#
# Usage (depuis le serveur, connecté en root) :
#   bash server-setup.sh mon-domaine.fr
#
# Ce script :
#   1. installe Java 17 et Caddy
#   2. crée l'utilisateur système "perudal" et les dossiers /opt/perudal/{backend,front}
#   3. génère le fichier de secrets /etc/perudal/env
#   4. installe le service systemd et la configuration Caddy
#   5. configure le pare-feu (SSH, HTTP, HTTPS uniquement)
#
# Prérequis : Ubuntu 22.04 ou 24.04, et les fichiers perudal.service et Caddyfile
# présents dans le même dossier que ce script.

set -euo pipefail

if [[ $# -ne 1 ]]; then
    echo "Usage : bash server-setup.sh <domaine>  (ex. bash server-setup.sh perudal.fr)" >&2
    exit 1
fi

DOMAIN="$1"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [[ $EUID -ne 0 ]]; then
    echo "Ce script doit être lancé en root (ou via sudo)." >&2
    exit 1
fi

echo "=== 1/5 Installation de Java 17 et des outils de base ==="
apt-get update
apt-get install -y openjdk-17-jre-headless rsync curl ufw

echo "=== 2/5 Installation de Caddy (dépôt officiel) ==="
if ! command -v caddy >/dev/null; then
    apt-get install -y debian-keyring debian-archive-keyring apt-transport-https
    curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' \
        | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
    curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' \
        > /etc/apt/sources.list.d/caddy-stable.list
    apt-get update
    apt-get install -y caddy
fi

echo "=== 3/5 Utilisateur, dossiers et secrets ==="
id -u perudal >/dev/null 2>&1 || useradd --system --home /opt/perudal --shell /usr/sbin/nologin perudal
mkdir -p /opt/perudal/backend /opt/perudal/front /etc/perudal

if [[ ! -f /etc/perudal/env ]]; then
    # Mot de passe requis en production pour /api/swagger et /api/monitoring/*
    # (openssl plutôt qu'un pipe sur /dev/urandom : head y déclenche un SIGPIPE fatal avec pipefail)
    INTERNAL_PASSWORD="$(openssl rand -hex 16)"
    cat > /etc/perudal/env <<EOF
PERUDAL_INTERNAL_API_USERNAME=internal-api
PERUDAL_INTERNAL_API_PASSWORD=${INTERNAL_PASSWORD}
EOF
    chmod 600 /etc/perudal/env
    echo "Identifiants de l'API interne (Swagger/monitoring) écrits dans /etc/perudal/env :"
    echo "  utilisateur : internal-api"
    echo "  mot de passe : ${INTERNAL_PASSWORD}"
    echo "Notez-les quelque part (ils restent lisibles en root dans /etc/perudal/env)."
fi
chown -R perudal:perudal /opt/perudal

echo "=== 4/5 Service systemd et configuration Caddy ==="
cp "${SCRIPT_DIR}/perudal.service" /etc/systemd/system/perudal.service
sed "s/DOMAINE_A_REMPLACER/${DOMAIN}/" "${SCRIPT_DIR}/Caddyfile" > /etc/caddy/Caddyfile
systemctl daemon-reload
systemctl enable perudal
# Le service backend démarrera au premier déploiement (deploy.sh) ; Caddy peut démarrer maintenant
systemctl reload caddy || systemctl restart caddy

echo "=== 5/5 Pare-feu (SSH, HTTP, HTTPS) ==="
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

echo
echo "Serveur prêt. Prochaine étape : lancer deploy/deploy.sh depuis votre machine."
