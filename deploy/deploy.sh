#!/usr/bin/env bash
# Déploiement de Perudal — À EXÉCUTER DEPUIS VOTRE MACHINE (pas sur le serveur).
#
# Usage :
#   bash deploy/deploy.sh
#
# Prérequis :
#   - deploy/deploy.env existe (copiez deploy/deploy.env.example) et contient PERUDAL_SERVER
#   - le serveur a été provisionné une première fois avec server-setup.sh
#   - connexion SSH par clé au serveur (ssh $PERUDAL_SERVER doit fonctionner sans mot de passe)
#
# Le script : compile le backend (Maven) et le frontend (Yarn), synchronise le tout
# sur le serveur avec rsync, puis redémarre le service backend.

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${PROJECT_DIR}/deploy/deploy.env"

if [[ ! -f "$ENV_FILE" ]]; then
    echo "Fichier ${ENV_FILE} manquant." >&2
    echo "Copiez deploy/deploy.env.example vers deploy/deploy.env et renseignez PERUDAL_SERVER." >&2
    exit 1
fi
# shellcheck source=deploy.env.example
source "$ENV_FILE"
: "${PERUDAL_SERVER:?PERUDAL_SERVER doit être défini dans deploy/deploy.env (ex. root@203.0.113.10)}"

# Sur macOS, Maven peut pointer vers un vieux JDK (ex. 13 via Homebrew) alors que
# le projet requiert Java 17 : on force JAVA_HOME sur le JDK 17 installé.
if [[ "$(uname)" == "Darwin" ]]; then
    JAVA_HOME="$(/usr/libexec/java_home -v 17)"
    export JAVA_HOME
fi

echo "=== 1/4 Build du backend (mvn package) ==="
(cd "$PROJECT_DIR" && mvn --quiet package)

# Yarn 3 requiert Node >= 18 : si le Node par défaut est trop vieux,
# on utilise le plus récent Node 18 installé via nvm.
NODE_MAJOR="$(node -v 2>/dev/null | sed 's/^v\([0-9]*\).*/\1/' || echo 0)"
if [[ "${NODE_MAJOR:-0}" -lt 18 ]]; then
    NVM_NODE_18="$(ls -d "$HOME"/.nvm/versions/node/v18.* 2>/dev/null | sort -V | tail -1 || true)"
    if [[ -n "$NVM_NODE_18" ]]; then
        export PATH="${NVM_NODE_18}/bin:$PATH"
    fi
fi

echo "=== 2/4 Build du frontend (yarn build) ==="
(cd "$PROJECT_DIR/admin-ui" && yarn build)

echo "=== 3/4 Synchronisation vers ${PERUDAL_SERVER} ==="
rsync -az --delete "$PROJECT_DIR/target/dist/perudal/lib/" "${PERUDAL_SERVER}:/opt/perudal/backend/lib/"
rsync -az --delete "$PROJECT_DIR/admin-ui/build/" "${PERUDAL_SERVER}:/opt/perudal/front/"

echo "=== 4/4 Redémarrage du backend ==="
# NB : le redémarrage coupe les parties en cours (état en mémoire) — déployez à une heure creuse
# chmod : rsync recopie les permissions des fichiers locaux, parfois restrictives,
# or Caddy (utilisateur caddy) doit pouvoir lire les fichiers du front
ssh "$PERUDAL_SERVER" 'chown -R perudal:perudal /opt/perudal && chmod -R u+rwX,go+rX /opt/perudal && systemctl restart perudal && sleep 3 && systemctl --no-pager status perudal'

echo
echo "Déploiement terminé."
