# Perudal — Mode « En ligne » : cahier de mise en place

> Document destiné à Claude Code. À lire en entier avant de coder.
> Maquettes de référence (HTML, s'ouvrent dans un navigateur) : `docs/mode-en-ligne/maquettes/`.
> Elles utilisent une syntaxe de template (`{{…}}`, `<sc-for>`, `<sc-if>`) : c'est le **rendu visuel et les textes** qui comptent, pas le code.
> L'image `/_blob/…` des maquettes correspond à `/assets/images/toucan.png`.

## 1. Contexte et objectif

Perudal est aujourd'hui un jeu **local** : les joueurs se parlent à côté (même pièce ou appel). Les mises se disent à voix haute, et l'admin révèle les dés puis désigne le perdant (`FinishTurnPopin`).

On ajoute un second mode, **« En ligne »**. Chaque joueur fait son action dans l'appli, à son tour et dans un ordre fixe : il parie, crie « Menteur ! » ou annonce « Chiffre exact ». **Le serveur calcule le résultat.** On peut alors jouer sans autre canal de communication.

**Contrainte absolue : le mode Local ne doit pas changer de comportement.** Les endpoints, événements socket et écrans existants restent identiques quand `mode = LOCAL`.

## 2. Périmètre et découpage en lots

Réaliser les lots dans l'ordre. Faire une proposition de plan avant chaque lot, et vérifier (tests, lint, type-check) à la fin de chaque lot.

| Lot | Contenu |
|---|---|
| **1. Back** | Modèle (`GameMode`, ordre, tour, mises), règles de mise, résolution Menteur / Chiffre exact, endpoints, événements socket, tests JUnit |
| **2. Front : Lobby** | Switch Local / En ligne sous l'encart Pérucode |
| **3. Front : Partie en ligne** | Écrans 2, 3, 4C, 5/6 + logique de mise côté front + tests Jest |
| **4. Anti-triche (séparé, optionnel)** | Ne plus envoyer les dés des adversaires au client en mode En ligne (voir §8) |

Fichiers des maquettes à utiliser :

| Écran | Maquette | Rôle |
|---|---|---|
| 1 | `Main.dc.html` | Lobby avec choix du mode |
| 2 | `Attente.dc.html` | Partie, tour d'un autre joueur |
| 3 | `MonTour.dc.html` | Mon tour : les 3 choix |
| 4 | `ParierC.dc.html` | Mon tour : sélection de la mise (modèle « cadenas à 2 molettes ») |
| 5 | `ResultatMenteur.dc.html` | Fin de manche après « Menteur ! » |
| 6 | `ResultatExact.dc.html` | Fin de manche après « Chiffre exact » (même écran que 5, variante) |

## 3. Règles de gestion

Source des règles : `admin-ui/src/components/pages/rules/Rules.tsx`. Ce qui suit les traduit pour le mode En ligne. **Le serveur fait foi** : le front applique les mêmes règles pour guider l'utilisateur, le back revalide tout.

### 3.1 Mode de jeu

- `GameMode { LOCAL, ONLINE }`. Valeur par défaut : `LOCAL` (les parties existantes ne changent pas).
- Seul l'admin peut changer le mode, uniquement quand la partie est au statut `LOBBY`.
- Le mode est diffusé à tous les joueurs du lobby (les non-admins le voient sans pouvoir le modifier).
- Une fois la partie lancée, le mode est figé.

### 3.2 Ordre de jeu (fixe)

- Au lancement d'une partie `ONLINE`, le serveur **mélange aléatoirement** les joueurs une fois pour toutes : `playerOrder: List<UUID>`. Les positions affichées valent 1 à N.
- L'ordre ne change plus de la partie. Un joueur éliminé (0 dé) garde sa position mais il est **sauté**.
- « Joueur suivant » = le prochain joueur de `playerOrder` encore en vie (plus de 0 dé), en bouclant.
- Le premier joueur de la première manche est le premier de `playerOrder` (position 1) : il n'y a pas d'autre tirage au sort.

### 3.3 Déroulé d'une manche

1. Chaque joueur en vie a ses dés relancés (déjà le cas en fin de manche).
2. Le **joueur qui ouvre la manche** doit **parier** : pas de Menteur ni de Chiffre exact sans mise précédente.
3. Ensuite, chaque joueur, à son tour, choisit **une** action parmi :
   - **Parier** : une mise strictement plus forte (§3.4). Le tour passe au joueur suivant.
   - **Menteur !** : conteste la dernière mise. La manche se termine (§3.5).
   - **Chiffre exact** : affirme que la dernière mise est exactement juste. La manche se termine (§3.6).
4. Seul le **joueur courant** peut agir. Simplification assumée en ligne : contrairement aux règles « à la table », personne ne peut dire « Chiffre exact » en dehors de son tour.

### 3.4 Validité d'une mise

Une mise = `quantity` (≥ 1, ≤ nombre total de dés en jeu) et `face` (1 à 6). **Face 1 = perudo** (toucan).

Notations : `(pq, pf)` = mise à battre, `(q, f)` = nouvelle mise.

**Ouverture de manche (aucune mise précédente)**
- Manche normale : `f ∈ [2..6]`, `q ≥ 1`. **On ne peut pas ouvrir en perudos.**
- Manche **planificato** : toutes les faces sont autorisées, perudo compris.

**Surenchère en manche normale**

| Mise à battre | Nouvelle mise | Condition |
|---|---|---|
| classique (`pf ≥ 2`) | classique (`f ≥ 2`) | `q > pq` (n'importe quelle face) **ou** `q == pq && f > pf` |
| classique | perudo (`f = 1`) | `q ≥ ceil(pq / 2)` |
| perudo | perudo | `q > pq` |
| perudo | classique | `q ≥ 2 × pq + 1` (n'importe quelle face 2..6) |

Exemples : après 4 × 5, `4 × 6`, `5 × 2` et `2 perudos` sont valides, mais `4 × 4` et `1 perudo` ne le sont pas. Après 4 perudos, `5 perudos` et `9 × 3` sont valides, mais `8 × 6` ne l'est pas.

**Surenchère en manche planificato** (§3.7)
- La face est **verrouillée** sur celle de l'ouverture. On ne peut qu'augmenter : `f == faceOuverture && q > pq`.

### 3.5 Résolution « Menteur ! »

- `compte` = nombre de dés (de tous les joueurs en vie) montrant `pf`, **plus les perudos** si `pf ≠ 1` et que la manche n'est pas planificato (ils servent alors de jokers).
- Si `compte ≥ pq` : la mise était bonne, **le joueur qui a crié « Menteur » perd un dé**.
- Sinon : **le joueur qui avait misé perd un dé**.
- Le perdant ouvre la manche suivante. S'il vient d'être éliminé, c'est le joueur suivant en vie (dans l'ordre fixe) qui ouvre.

### 3.6 Résolution « Chiffre exact »

- Même calcul de `compte`.
- Si `compte == pq` (exactement) : le joueur gagne un dé. S'il a déjà le nombre maximum de dés, **tous les autres joueurs en perdent un**. C'est le comportement actuel de `finishTurn(hasLost = false)`, à conserver.
- Sinon : le joueur **perd un dé**.
- Dans tous les cas, ce joueur ouvre la manche suivante (ou le suivant en vie s'il est éliminé).

### 3.7 Planificato

On garde la règle déjà codée dans `finishTurn` : un joueur qui **perd** un dé et tombe à 1 rend la manche suivante planificato (`isPlanificato`).

En manche planificato :
- les perudos **ne sont pas des jokers** ;
- l'ouvreur peut ouvrir sur n'importe quelle face (perudo compris) ;
- la face ne peut plus changer ensuite (§3.4).

### 3.8 Fin de partie

Quand il ne reste qu'un joueur avec des dés, il gagne. On réutilise `FinishGamePopin`, affichée après l'écran de résultat (quand l'admin clique sur « Tour suivant »).

### 3.9 Départ d'un joueur en cours de partie en ligne

- Le joueur est retiré de `playerOrder`.
- S'il était le joueur courant, la main passe au joueur suivant en vie. La mise en cours est conservée.
- S'il reste moins de 2 joueurs en vie, la partie se termine (gagnant = celui qui reste).

## 4. Lot 1 : Back (Java)

### 4.1 Modèle

- `services/game/enums/GameMode.java` : `LOCAL`, `ONLINE`.
- `services/game/enums/ChallengeType.java` : `LIAR`, `EXACT`.
- `services/game/beans/Bid.java` : `playerId`, `quantity`, `face`.
- `Game` : ajouter
  - `mode` (défaut `LOCAL`) ;
  - `playerOrder: List<UUID>` ;
  - `currentPlayerId: UUID` ;
  - `currentBid: Bid` (null en début de manche) ;
  - `roundBids: List<Bid>` (historique de la manche : sert à afficher « a parié… » par joueur et la face d'ouverture en planificato) ;
  - `lastRoundResult: RoundResult` (pour la reconnexion).
- `RoundResult` (nouveau bean diffusé) :
  - `type: ChallengeType` ;
  - `challengerId`, `bidderId` ;
  - `bid: Bid` ;
  - `actualCount` ;
  - `faceCounts: Map<Integer, Integer>` (nombre de dés par face 1..6) ;
  - `jokersCounted: boolean` ;
  - `challengerWon: boolean` ;
  - `diceChanges: Map<UUID, Integer>` (−1 / +1 par joueur concerné) ;
  - `nextStarterId` ;
  - `revealedPlayers: List<Player>` (dés **de la manche résolue**, avant la relance).
- `Lobby` : ajouter `mode`.
- `GameInfo` : ajouter `mode`, `playerOrder`, `currentPlayerId`, `currentBid`, `roundBids`, `lastRoundResult`. Mettre à jour `toGameInfo` et `buildSession` pour que la reconnexion restitue l'état en ligne.

### 4.2 Règles pures, testables

Créer `services/game/rules/BidRules.java` (statique, sans dépendance) :
- `isValidBid(Bid previous, Bid next, boolean planificato, Integer openingFace, int totalDice)` ;
- `countMatching(List<Player> players, int face, boolean planificato)`.

Couvrir **chaque ligne du tableau §3.4** et les cas limites par des tests (ouverture en perudo refusée, planificato à face verrouillée, `q > totalDice`, arrondi `ceil` sur une quantité impaire…).

### 4.3 Service

Dans `GameService` :
- `setMode(SetGameMode)` : admin seulement, statut `LOBBY` seulement, puis diffusion `UPDATED_LOBBY` (le `Lobby` porte `mode`).
- `startGame` : si `ONLINE`, mélanger `playerOrder`, `currentPlayerId = playerIdFinishTurn` (tiré au sort), vider `currentBid` et `roundBids`.
- `placeBid(PlaceBid)` : vérifier, dans cet ordre :
  1. la partie existe et est `IN_GAME` ;
  2. elle est `ONLINE` ;
  3. c'est bien `currentPlayerId` ;
  4. le joueur est en vie ;
  5. `BidRules.isValidBid`.

  Ensuite : enregistrer la mise, passer au joueur suivant, diffuser `BID_PLACED` avec le `GameInfo`.
- `challenge(Challenge)` : mêmes vérifications, plus une `currentBid` non nulle. Calculer le résultat (§3.5 / §3.6). Appliquer les changements de dés en **factorisant la logique existante de `finishTurn`** (ne pas la dupliquer). Calculer le planificato et le prochain ouvreur, puis relancer les dés. Remettre à zéro `currentBid` et `roundBids`, et poser `currentPlayerId = nextStarterId`. Diffuser `ROUND_RESULT` avec un corps `{ result: RoundResult, game: GameInfo }`.
- `finishTurn` et `rollDices` : refuser si `mode == ONLINE`, car l'admin ne doit pas pouvoir court-circuiter la manche. Le comportement en `LOCAL` est inchangé.
- `quitGame` en cours de partie en ligne : appliquer §3.9.
- **Concurrence** : `placeBid` et `challenge` doivent être atomiques par partie (`synchronized (game)`), pour éviter deux actions simultanées sur le même tour.

### 4.4 API REST (`GameWs`)

| Méthode | Route | Corps | Effet |
|---|---|---|---|
| PUT | `/game/mode` | `{ gameCode, playerId, mode }` | Change le mode (admin, lobby) |
| PUT | `/game/bid` | `{ gameCode, playerId, quantity, face }` | Place une mise |
| PUT | `/game/challenge` | `{ gameCode, playerId, type: LIAR \| EXACT }` | Menteur / Chiffre exact |

Nouvelles erreurs dans `CustomWsError` : `GAME_NOT_STARTED`, `WRONG_GAME_MODE`, `NOT_YOUR_TURN`, `INVALID_BID`, `NO_BID_TO_CHALLENGE`.

### 4.5 Socket

- `ServerEvent` (back **et** `admin-ui/src/services/socket/SocketTypes.ts`) : ajouter `BID_PLACED` et `ROUND_RESULT`.
- `SocketService` : ajouter `sendBidPlaced(GameInfo)` et `sendRoundResult(...)` sur le modèle de `sendFinishTurn`.

### 4.6 Tests back (JUnit, `src/test/java/jar/services/game/`)

- `BidRulesTest` : tous les cas du §3.4.
- `OnlineGameServiceTest` :
  - ordre fixe généré au lancement ;
  - refus hors tour ;
  - refus d'un Menteur sans mise ;
  - Menteur gagné et perdu ;
  - Chiffre exact gagné (avec et sans max de dés) et perdu ;
  - perudos jokers et non-jokers (planificato) ;
  - prochain ouvreur quand le perdant est éliminé ;
  - fin de partie ;
  - `finishTurn` refusé en `ONLINE` ;
  - **non-régression du mode `LOCAL`**.
- Lancer `mvn test`.

## 5. Lot 2 : Front, Lobby (écran 1, `Main.dc.html`)

Dans `components/pages/lobby/Lobby.tsx`, **sous l'encart Pérucode** :
- **Libellé** : petit titre mono « MODE DE JEU ».
- **Interrupteur à deux boutons** (2 colonnes, fond `--surf`, bord `--line`, rayon 14px, padding 4px) : « Local » (icône personnes) et « En ligne » (icône globe). Segment actif : fond `--accent`, texte `--accent-ink`. Segment inactif : transparent, texte `--ink2`. Ce sont de vrais `<button>` avec `aria-pressed`.
- **Texte d'aide sous l'interrupteur** (13px, `--ink2`) :
  - Local : « Vous êtes dans la même pièce ou en appel : les mises se disent à voix haute, l'appli gère les dés. »
  - En ligne : « Chacun mise à son tour directement dans l'appli. Idéal à distance : pas besoin d'un autre canal pour se parler. »
- **Mention dans la liste des participants** : en mode En ligne, afficher à droite du titre « ordre tiré au sort au lancement » (12px, italique).
- **Joueur non-admin** : il voit l'interrupteur en lecture seule (désactivé, même rendu), mis à jour via `UPDATED_LOBBY`.
- **Branchement** : `GameApi.setMode`, `GameService.setMode`, `LobbyType.mode`.

## 6. Lot 3 : Front, partie en ligne

### 6.1 Organisation

- Dans `Game.tsx`, si `game.mode === ONLINE`, rendre un nouveau composant `components/pages/game/online/OnlineGame.tsx`. **Ne pas modifier le rendu Local.**
- Sous-composants suggérés :
  - `PlayerOrderList` (écrans 2 et 3) ;
  - `MyTurnPanel` (écran 3) ;
  - `BidSelector` (écran 4C) ;
  - `RoundResultView` (écrans 5 et 6) ;
  - `BidLabel` (« 4 × [dé] », réutilisé partout).
- **Réutiliser** :
  - le header existant (titre, pastille du total de dés, bouton menu → `GameMenuPopin`) ;
  - `Dice` (ajouter des tailles : modificateurs `dice--xs` 22px, `dice--sm` 34px, `dice--xl` 84px) ;
  - `DiceCounter` pour le décompte ;
  - `PlayerName` ;
  - `ActionButton` ;
  - le pattern de compte à rebours annulable de `reveal-button`.
- **`GameMenuPopin` en mode En ligne** : masquer « Relancer les dés ».
- **Styles** : suivre le style existant (classes BEM globales, comme `assets/scss/pages/_game.scss`). Créer `assets/scss/pages/_online-game.scss` et l'importer comme les autres pages. Utiliser **uniquement les variables de `_theme.scss`** :
  - doré = `--t-accent` / `--t-accent-soft` / `--t-accent-line` ;
  - vert = `--jade` / `--jade-line` ;
  - orangé = `--terra-txt` / `--terra-soft` / `--terra-line` ;
  - crème = `--accent`.
- **Logique de mise front** : `services/game/BidRules.ts` (miroir de §3.4), avec `isValidBid`, `minimalValidBid`, `invalidReason`. Tests Jest dans `BidRules.test.ts`.
- **État** : dans `GameService.ts`, ajouter un observable `roundResult`, et les méthodes `placeBid(quantity, face)` et `challenge(type)`. Ajouter les listeners `BID_PLACED` (met à jour `game`) et `ROUND_RESULT` (stocke `result`, met à jour `game`).

### 6.2 Écran 2 : tour d'un autre joueur (`Attente.dc.html`)

- **Titre** : « Partie en ligne ». Si la manche est planificato, garder le titre existant « Pla pla planificato ».
- **Ligne d'info** : « Au tour de **{emoji nom}** », le nom en `--t-accent`.
- **Liste des joueurs** dans l'**ordre fixe**, un encart par joueur :
  - pastille ronde avec la **position** (26px, police mono) ;
  - nom (`PlayerName`) ;
  - badge « TOI » pour le joueur courant de l'appareil.
- **À droite de chaque encart** :
  - si le joueur a parié dans la manche : « a parié **q ×** [dé xs] » (sa dernière mise) ;
  - si c'est le joueur en train de jouer : « réfléchit… », avec 3 points animés dorés ;
  - sinon : « en attente ».
- **Sous le nom** : une rangée de mini-dés masqués (22px), un par dé restant. On voit ainsi le nombre de dés de chacun.
- **Mises en avant** :
  - joueur en train de jouer : encart en surbrillance dorée et pastille de position pleine dorée ;
  - mon encart : bordure en pointillés ;
  - joueur éliminé : encart grisé, texte « éliminé », sans dés.
- **Barre du bas** (inchangée par rapport au Local) : « Tes dés » avec « ta position N » à droite, les dés masqués et le bouton « Voir mes dés » / « Masquer mes dés ». Pas de bouton admin « Révéler ».

### 6.3 Écran 3 : mon tour (`MonTour.dc.html`)

- **Ligne d'info** : « À toi de jouer ! » en `--t-accent`, gras.
- **Liste compacte** (lignes de 44px) dans l'ordre fixe :
  - position, nom, badge « TOI » ;
  - à droite, la dernière mise du joueur si elle existe (« q × [dé] »), **puis toujours** une pastille « [carré] N dés » (dés restants). Pastille en police mono 12px.
  - Ma ligne est en surbrillance dorée.
- **Panneau du bas** (coins supérieurs arrondis 22px, bord haut doré) :
  - encart **« MISE À BATTRE »** : pastille de position, nom du joueur, puis en grand « **4 ×** » (30px mono) et un dé de 38px ;
  - **« Tes dés »** visibles automatiquement (dés de 50px) ;
  - bouton **Parier** (principal, icône flèche montante, pleine largeur) ;
  - sur une ligne, en 2 colonnes : **Menteur !** (style danger, terracotta) et **Chiffre exact** (style vert jade).
- **Ouverture de manche** (pas de mise à battre) :
  - remplacer l'encart par « Tu ouvres la manche » ;
  - masquer ou désactiver Menteur et Chiffre exact.
- **Menteur et Chiffre exact** : ils déclenchent l'action après un **compte à rebours annulable de 2 s**, comme « Révéler tous les dés » (le libellé devient « Annuler » et une barre de progression avance).
- **Parier** : affiche l'écran 4. C'est un état local de l'écran, pas une route.

### 6.4 Écran 4 : sélection de la mise, modèle 4C (`ParierC.dc.html`)

- **Haut d'écran** : bande horizontale des joueurs dans l'ordre fixe (5 colonnes, ou défilement si plus de joueurs). Pour chacun :
  - pastille de position (la mienne en doré) ;
  - nom (hauteur de ligne fixe de 18px, pour garder l'alignement même sans emoji) ;
  - pastille « N dés ».
- **Panneau du bas** :
  1. **Ligne de contexte** : petite étiquette « {nom} **q ×** [dé] » (mise à battre) à gauche, mes dés en 34px à droite.
  2. **Cadenas à 2 molettes**, sur une grille `1fr auto 1fr` :
     - colonne **« DÉS »** : flèche ▲ (bouton de 68px de haut, chevron de 36px), boîte de valeur de 120px de haut avec le nombre en 72px mono, flèche ▼ ;
     - au centre, « × » en 34px ;
     - colonne **« VALEUR »** : mêmes flèches, avec dans la boîte un dé de 84px. La molette va du **perudo (1) au 6**.
     - Quand la face vaut 1, le libellé devient **« PERUDO »** et la boîte passe en fond et bord dorés.
     - Bornes : nombre de 1 au total des dés en jeu, face de 1 à 6 (pas de boucle).
  3. **Encart de validation** (15px gras, padding 10 × 14, rayon 14) :
     - valide : vert jade avec une coche et le seul texte « Mise valide » ;
     - invalide : terracotta avec une icône d'alerte et un message **spécifique au cas** :
       - classique après classique : « Mise trop faible : monte le nombre ou la valeur » ;
       - perudo après classique : « Mise trop faible : il faut au moins 2 perudos » ;
       - classique après perudo : « Mise trop faible : il faut au moins 9 dés pour quitter les perudos » ;
       - perudo après perudo : « Mise trop faible : il faut plus de 4 perudos » ;
       - ouverture en perudo : « On ne peut pas ouvrir une manche en perudos » ;
       - planificato : « Planificato : la valeur reste {face}, monte seulement le nombre ».
  4. **Boutons** (grille `1fr 2fr`) : « Retour » (secondaire, revient à l'écran 3) et « Valider la mise » (principal, **désactivé si la mise est invalide**, chargement pendant l'appel). En cas d'erreur serveur, afficher la notification existante et rester sur l'écran.
- **Pré-remplissage** : la plus petite mise valide.
  - après `(pq, pf)` classique : `(pq, pf + 1)` si `pf < 6`, sinon `(pq + 1, 2)` ;
  - après des perudos : `(pq + 1, 1)` ;
  - à l'ouverture : `(1, 2)`.
- **Planificato** :
  - après l'ouverture, les flèches de valeur sont désactivées ;
  - à l'ouverture, tout est autorisé.
- **Ouverture en manche normale** : la molette de valeur reste utilisable sur 1. L'encart affiche alors l'erreur, et le bouton Valider est désactivé.

### 6.5 Écrans 5 et 6 : résultat de manche (`ResultatMenteur.dc.html`, `ResultatExact.dc.html`)

Ils s'affichent pour **tous les joueurs** à la réception de `ROUND_RESULT`, et restent affichés jusqu'à ce que l'admin clique sur « Tour suivant » (`PUT /game/next-round`, puis évènement `NEXT_ROUND` diffusé à tous). Un joueur qui se reconnecte entre-temps retrouve le résultat.

- **Titre** : « Fin du tour ».
- **Ligne d'info** :
  - « Tu as dit « Menteur ! » à Hugo », « Léa t'a dit « Menteur ! » » ou « Léa a dit « Menteur ! » à Hugo » ;
  - variante : « Léa a annoncé « Chiffre exact » sur la mise de Hugo » (ou « sur ta mise »).
- **Encart verdict**, du point de vue du joueur de l'appareil :
  - **vert** (coche) s'il a gagné ou gagné un dé : « Gagné 👑 » ;
  - **terracotta** (croix) s'il perd un dé : « Perdu 🫤 » ;
  - **neutre doré** s'il n'est pas concerné : « Hugo perd un dé ».
  - Ligne de séparation, puis « MISE **4 ×** [dé] » et « SUR LA TABLE **3 ×** [dé] », au même format pour les comparer d'un coup d'œil.
- **« Résultat du tour »** : grille de 6 faces (dé de 34px + « ×n »). Mettre en surbrillance la face misée et le perudo s'il compte comme joker (réutiliser ou adapter `DiceCounter`).
- **Liste des joueurs** dans l'ordre fixe : position, nom et **tous les dés révélés** (22px).
  - Les dés qui comptent pour la mise sont entourés de doré, les autres atténués (opacité 0,4).
  - Le joueur qui perd un dé a sa ligne en terracotta et un badge « −1 dé », aligné d'un joueur à l'autre, juste avant la colonne de dés.
  - Le joueur qui gagne un dé a un badge vert « +1 dé ».
- **Barre du bas** : « {nom} commence le prochain tour » (ou « Tu commences le prochain tour ») et le bouton principal « Tour suivant → », réservé à l'admin. Les autres joueurs voient à la place un bouton désactivé « En attente du meneur ». Au clic de l'admin : tous les joueurs quittent le résultat et voient l'écran 2 ou 3 de la nouvelle manche. Si la partie est terminée : `FinishGamePopin`.

### 6.6 Vérifications front

`yarn typescript`, `yarn eslint`, `yarn stylelint` et `yarn test` doivent passer. Tester au téléphone (390px de large) : rien ne doit déborder, et les cibles tactiles doivent faire au moins 44px.

## 7. Critères d'acceptation

- [ ] En mode Local, rien ne change (parcours complet testé : lobby → révéler → fin du tour → fin de partie).
- [ ] L'admin bascule le mode dans le lobby ; les autres le voient en direct sans pouvoir le changer.
- [ ] En ligne, l'ordre est fixe toute la partie, la position de chacun est visible et les éliminés sont sautés.
- [ ] Seul le joueur courant peut agir ; une action hors tour est refusée par le serveur.
- [ ] Toutes les règles du §3.4 sont respectées par le front (guidage) **et** le back (refus).
- [ ] Menteur et Chiffre exact révèlent les dés de tous et affichent immédiatement le verdict calculé par le serveur.
- [ ] Perudos jokers en manche normale, non jokers en planificato.
- [ ] Le bon joueur ouvre la manche suivante, y compris quand le perdant est éliminé.
- [ ] Un joueur qui se reconnecte en pleine manche retrouve l'état (ordre, joueur courant, mise en cours).
- [ ] Les tests back et front passent.

## 8. Lot 4 (séparé) : anti-triche

**Problème** : `GameInfo` contient les dés de **tous** les joueurs et il est diffusé à tout le monde. Le front ne fait que les masquer à l'affichage. En ligne, un joueur pourrait lire les dés des autres avec les outils du navigateur.

**Solution, limitée à `mode == ONLINE`** :
- Pendant une manche, chaque joueur ne reçoit que **ses** dés. Pour les autres, seul `diceNumber` est envoyé et `dices` est vide.
  - Diffusion socket : envoyer un message **par joueur**. La correspondance `playerId ↔ socket` existe déjà via `bindPlayer`.
  - Réponses REST (`reconnect`, `join`, `buildSession`) : même filtrage selon le `playerId` demandeur.
- Les dés révélés n'arrivent qu'avec `ROUND_RESULT.revealedPlayers`.
- Ajouter un test : un joueur ne reçoit jamais les dés d'un autre avant `ROUND_RESULT`.

**Impact sur le mode Local** : aucun. Le filtrage est conditionné à `mode == ONLINE`. En Local, « Révéler tous les dés » continue de s'appuyer sur les dés déjà présents côté client.

## 9. Hors périmètre (à ne pas faire maintenant)

- Minuteur de tour ou passage automatique si un joueur ne joue pas.
- Annonce de « Chiffre exact » en dehors de son tour.
- Historique des manches précédentes.

## 10. Divers

`CLAUDE.md` est en partie obsolète : les joueurs sont aujourd'hui identifiés par un `playerId` durable avec reconnexion, et non plus par l'UUID de la socket. À la fin, le mettre à jour avec le mode En ligne (nouveaux endpoints, événements, `BidRules`).
