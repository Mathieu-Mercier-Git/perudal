package jar.services.game;

import com.coreoz.plume.jersey.errors.WsError;
import com.coreoz.plume.jersey.errors.WsException;
import jar.services.game.beans.ActionGame;
import jar.services.game.beans.Bid;
import jar.services.game.beans.Challenge;
import jar.services.game.beans.Game;
import jar.services.game.beans.GameInfo;
import jar.services.game.beans.GameSession;
import jar.services.game.beans.JoinGame;
import jar.services.game.beans.KickPlayer;
import jar.services.game.beans.Lobby;
import jar.services.game.beans.NewGame;
import jar.services.game.beans.PlaceBid;
import jar.services.game.beans.Player;
import jar.services.game.beans.ReconnectGame;
import jar.services.game.beans.RoundResult;
import jar.services.game.beans.RoundResultMessage;
import jar.services.game.beans.SetGameMode;
import jar.services.game.beans.StartGame;
import jar.services.game.beans.TurnInfo;
import jar.services.game.enums.ChallengeType;
import jar.services.game.enums.GameMode;
import jar.services.game.enums.GameStatus;
import jar.services.game.rules.BidRules;
import jar.services.socket.SocketService;
import jar.services.utils.GameUtils;
import jar.webservices.api.errors.CustomWsError;
import lombok.Getter;

import javax.inject.Inject;
import javax.inject.Singleton;
import java.time.Duration;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Getter
@Singleton
public class GameService {
    private static final int MAX_GAME_CODE_ATTEMPTS = 100;
    private static final int MIN_PLAYERS_TO_START = 2;

    private final SocketService socketService;
    private final Map<String, Game> games; // Map<GameCode, Game>

    @Inject
    public GameService(SocketService socketService) {
        this.socketService = socketService;
        this.games = new ConcurrentHashMap<>();
    }

    public GameSession createGame(NewGame newGame) {
        String gameCode = reserveGameCode(newGame.getDiceNumber());
        UUID playerId = UUID.randomUUID();

        socketService.createGame(gameCode, newGame.getUserSocketId());
        socketService.bindPlayer(playerId, newGame.getUserSocketId());

        addPlayer(gameCode, playerId, newGame.getUserName(), newGame.getUserEmoji(), true);

        return buildSession(playerId, gameCode, games.get(gameCode));
    }

    /**
     * Tire un code de partie libre et réserve la partie dans la foulée :
     * {@code putIfAbsent} garantit que deux créations simultanées ne peuvent pas
     * obtenir le même code.
     */
    private String reserveGameCode(int diceNumber) {
        for (int attempt = 0; attempt < MAX_GAME_CODE_ATTEMPTS; attempt++) {
            String gameCode = GameUtils.generateGameCode();
            Game game = Game.of(
                new ConcurrentHashMap<>(), diceNumber, GameStatus.LOBBY, false, null, Instant.now()
            );
            if (games.putIfAbsent(gameCode, game) == null) {
                return gameCode;
            }
        }
        throw new WsException(CustomWsError.NO_GAME_CODE_AVAILABLE);
    }

    /**
     * Supprime les parties abandonnées : elles ne sont retirées de la mémoire que
     * lorsqu'un admin annule sa partie, donc sans cette purge elles s'accumulent
     * indéfiniment. Appelée par {@link GamePurgeService}.
     *
     * @return le nombre de parties supprimées
     */
    public int purgeExpiredGames(Instant now, Duration inGameRetention, Duration lobbyRetention) {
        List<String> expiredGameCodes = games.entrySet().stream()
            .filter(entry -> isExpired(entry.getValue(), now, inGameRetention, lobbyRetention))
            .map(Map.Entry::getKey)
            .toList();

        expiredGameCodes.forEach(this::removeGame);
        return expiredGameCodes.size();
    }

    /** Supprime une partie de la mémoire, room de sockets comprise */
    private void removeGame(String gameCode) {
        games.remove(gameCode);
        socketService.closeRoom(gameCode);
    }

    /** Une partie expire selon son âge, avec un délai plus court pour un lobby jamais démarré */
    private static boolean isExpired(Game game, Instant now, Duration inGameRetention, Duration lobbyRetention) {
        if (game.getPlayers().isEmpty()) { // plus personne dedans : elle ne peut plus servir
            return true;
        }
        if (game.getCreatedAt() == null) { // partie créée avant l'ajout de l'horodatage
            return true;
        }
        Duration retention = game.getStatus() == GameStatus.IN_GAME ? inGameRetention : lobbyRetention;
        return game.getCreatedAt().plus(retention).isBefore(now);
    }

    // TODO : ajouter une limite maximum de joueurs dans une partie, et gérer le cas où la partie est pleine
    public GameSession joinGame(JoinGame joinGame) {
        // Le code contient une lettre : on tolère une saisie en minuscules ou avec des espaces
        String gameCode = GameUtils.normalizeGameCode(joinGame.getGameCode());
        if (gameCode == null) {
            throw new WsException(CustomWsError.GAME_NOT_FOUND);
        }
        Game game = games.get(gameCode);
        if (game == null) {
            throw new WsException(CustomWsError.GAME_NOT_FOUND);
        }
        // Un joueur arrivé en cours de partie n'aurait ni dés ni place dans l'ordre de jeu.
        // Un joueur déjà inscrit qui revient passe par reconnect(), pas par ici.
        if (game.getStatus() == GameStatus.IN_GAME) {
            throw new WsException(CustomWsError.GAME_ALREADY_STARTED);
        }
        UUID playerId = UUID.randomUUID();
        List<Player> players = addPlayer(gameCode, playerId, joinGame.getUserName(), joinGame.getUserEmoji(), false);

        Lobby lobby = Lobby.of(gameCode, players, game.getMode());
        socketService.joinGame(joinGame.getUserSocketId(), lobby);
        socketService.bindPlayer(playerId, joinGame.getUserSocketId());

        return buildSession(playerId, gameCode, game);
    }

    /**
     * Reprise d'une partie après une coupure : on rattache la nouvelle socket au
     * joueur existant et on lui restitue l'état courant.
     */
    public GameSession reconnect(ReconnectGame reconnectGame) {
        Game game = games.get(reconnectGame.getGameCode());
        if (game == null) {
            throw new WsException(CustomWsError.GAME_NOT_FOUND);
        }
        if (!game.getPlayers().containsKey(reconnectGame.getPlayerId())) {
            throw new WsException(CustomWsError.PLAYER_NOT_FOUND);
        }

        socketService.reconnect(reconnectGame.getGameCode(), reconnectGame.getPlayerId(), reconnectGame.getSocketId());

        return buildSession(reconnectGame.getPlayerId(), reconnectGame.getGameCode(), game);
    }

    /**
     * Choix du mode de jeu : réservé à l'admin, tant que la partie n'est pas lancée.
     * Rien n'est diffusé : seul l'admin voit le mode dans le lobby, les autres joueurs
     * le reçoivent avec la partie au lancement.
     */
    public void setMode(SetGameMode setGameMode) {
        Game game = games.get(setGameMode.getGameCode());
        if (game == null) {
            throw new WsException(CustomWsError.GAME_NOT_FOUND);
        }
        if (setGameMode.getMode() == null) {
            throw new WsException(WsError.FIELD_REQUIRED);
        }
        synchronized (game) {
            requireAdmin(game, setGameMode.getPlayerId());
            if (game.getStatus() != GameStatus.LOBBY) {
                throw new WsException(CustomWsError.GAME_ALREADY_STARTED);
            }
            game.setMode(setGameMode.getMode());
        }
    }

    public void startGame(StartGame startGame) {
        Game currentGame = games.get(startGame.getGameCode());
        if (currentGame == null) {
            throw new WsException(CustomWsError.GAME_NOT_FOUND);
        }
        if (currentGame.getPlayers().size() < MIN_PLAYERS_TO_START) {
            throw new WsException(CustomWsError.NOT_ENOUGH_PLAYERS);
        }

        synchronized (currentGame) {
            currentGame.setDiceNumber(startGame.getDiceNumber());
            currentGame.setStatus(GameStatus.IN_GAME);
            currentGame.setIsPlanificato(false);
            // Le premier joueur à jouer est tiré au sort parmi les joueurs présents
            List<UUID> playerIds = new ArrayList<>(currentGame.getPlayers().keySet());
            currentGame.setPlayerIdFinishTurn(playerIds.get(new Random().nextInt(playerIds.size())));
            for (Player player : currentGame.getPlayers().values()) {
                player.setDiceNumber(startGame.getDiceNumber());
                player.setDices(GameUtils.rollDices(startGame.getDiceNumber()));
            }

            if (currentGame.getMode() == GameMode.ONLINE) {
                // L'ordre de jeu est tiré au sort une fois pour toutes, et le premier de cet ordre ouvre la partie
                Collections.shuffle(playerIds);
                currentGame.setPlayerOrder(new ArrayList<>(playerIds));
                currentGame.setPlayerIdFinishTurn(playerIds.get(0));
                currentGame.setCurrentPlayerId(playerIds.get(0));
                resetRound(currentGame);
                currentGame.setLastRoundResult(null);
            }

            games.put(startGame.getGameCode(), currentGame);
            socketService.startGame(toGameInfo(startGame.getGameCode(), currentGame));
        }
    }

    public void quitGame(ActionGame actionGame) {
        Game game = games.get(actionGame.getGameCode());
        if (game == null) {
            throw new WsException(CustomWsError.GAME_NOT_FOUND);
        }
        List<Player> players;
        synchronized (game) {
            boolean isOnlineGameInProgress = game.getMode() == GameMode.ONLINE && game.getStatus() == GameStatus.IN_GAME;
            Player leavingPlayer = game.getPlayers().get(actionGame.getPlayerId());
            players = removePlayer(actionGame.getGameCode(), actionGame.getPlayerId());

            Lobby lobby = Lobby.of(actionGame.getGameCode(), players, game.getMode());
            socketService.quitGame(actionGame.getPlayerId(), lobby);

            if (isOnlineGameInProgress && leavingPlayer != null && !players.isEmpty()) {
                leaveOnlineGame(game, leavingPlayer);
                // Les joueurs restants doivent voir le nouvel ordre et, le cas échéant, le nouveau joueur courant
                socketService.bidPlaced(toGameInfo(actionGame.getGameCode(), game));
            }
        }

        // Le dernier joueur est parti : la partie ne peut plus servir à personne, on la
        // supprime sans attendre la purge quotidienne. Aucun risque de viser une partie
        // encore vivante : une déconnexion ne retire jamais un joueur (c'est ce qui
        // permet la reconnexion), seul un départ explicite le fait.
        if (players.isEmpty()) {
            removeGame(actionGame.getGameCode());
        }
    }

    /**
     * Départ d'un joueur en pleine partie en ligne. S'il avait encore des dés, ils
     * restent comptés jusqu'à la fin de la manche, mais il ne peut plus perdre ni
     * gagner de dé. S'il était le joueur courant, la main passe au suivant en vie et
     * la mise en cours est conservée.
     */
    private void leaveOnlineGame(Game game, Player leavingPlayer) {
        UUID leavingPlayerId = leavingPlayer.getId();
        if (leavingPlayerId.equals(game.getCurrentPlayerId())) {
            game.setCurrentPlayerId(nextAlivePlayer(game, leavingPlayerId));
        }
        if (leavingPlayer.getDiceNumber() > 0) {
            // Gardé dans l'ordre jusqu'à la fin de la manche (cf. Game#departedPlayers)
            game.getDepartedPlayers().put(leavingPlayerId, leavingPlayer);
        } else {
            game.getPlayerOrder().remove(leavingPlayerId);
        }
    }

    /** Exclusion d'un joueur du lobby : réservée à l'admin de la partie */
    public void kickPlayer(KickPlayer kickPlayer) {
        Game game = games.get(kickPlayer.getGameCode());
        if (game == null) {
            throw new WsException(CustomWsError.GAME_NOT_FOUND);
        }
        requireAdmin(game, kickPlayer.getPlayerId());
        if (!game.getPlayers().containsKey(kickPlayer.getKickedPlayerId())) {
            throw new WsException(CustomWsError.PLAYER_NOT_FOUND);
        }

        List<Player> players = removePlayer(kickPlayer.getGameCode(), kickPlayer.getKickedPlayerId());
        socketService.kickPlayer(kickPlayer.getKickedPlayerId(), Lobby.of(kickPlayer.getGameCode(), players, game.getMode()));
    }

    public void cancelGame(ActionGame actionGame) {
        games.remove(actionGame.getGameCode());
        socketService.cancelGame(actionGame.getGameCode());
    }

    /**
     * Relance les dés de tous les joueurs sans toucher au reste de l'état du tour
     * (nombre de dés, planificato, joueur qui commence). Réservée à l'admin, et
     * interdite en ligne : l'admin ne doit pas pouvoir court-circuiter la manche.
     */
    public void rollDices(ActionGame actionGame) {
        Game game = games.get(actionGame.getGameCode());
        if (game == null) {
            throw new WsException(CustomWsError.GAME_NOT_FOUND);
        }
        requireLocalMode(game);
        requireAdmin(game, actionGame.getPlayerId());

        for (Player player : game.getPlayers().values()) {
            player.setDices(GameUtils.rollDices(player.getDiceNumber()));
        }
        socketService.rollDices(toGameInfo(actionGame.getGameCode(), game));
    }

    /** Fin de tour décidée par l'admin, en mode local uniquement */
    public void finishTurn(TurnInfo turnInfo) {
        Game game = games.get(turnInfo.getGameCode());
        if (game == null) {
            throw new WsException(CustomWsError.GAME_NOT_FOUND);
        }
        requireLocalMode(game);

        Player currentplayer = game.getPlayers().get(turnInfo.getPlayerId());
        boolean isPlanificato = false;
        if (turnInfo.isHasLost()) {
            isPlanificato = loseOneDice(currentplayer, new HashMap<>());
        } else { // Cas d'un chiffre exact
            winExact(game, currentplayer, new HashMap<>());
        }

        rollAllDices(game);
        // L'état du tour est conservé pour pouvoir le restituer à une reconnexion
        game.setIsPlanificato(isPlanificato);
        game.setPlayerIdFinishTurn(turnInfo.getPlayerId());
        games.put(turnInfo.getGameCode(), game);
        socketService.finishTurn(toGameInfo(turnInfo.getGameCode(), game));
    }

    /** Mise du joueur courant, en mode en ligne */
    public void placeBid(PlaceBid placeBid) {
        Game game = games.get(placeBid.getGameCode());
        synchronized (requireOnlineGame(game)) {
            requireCurrentPlayer(game, placeBid.getPlayerId());

            Bid bid = Bid.of(placeBid.getPlayerId(), placeBid.getQuantity(), placeBid.getFace());
            Integer openingFace = game.getRoundBids().isEmpty() ? null : game.getRoundBids().get(0).getFace();
            boolean isValid = BidRules.isValidBid(
                game.getCurrentBid(), bid, isPlanificato(game), openingFace, BidRules.totalDice(diceOnTable(game))
            );
            if (!isValid) {
                throw new WsException(CustomWsError.INVALID_BID);
            }

            game.setCurrentBid(bid);
            game.getRoundBids().add(bid);
            game.setCurrentPlayerId(nextAlivePlayer(game, placeBid.getPlayerId()));
            socketService.bidPlaced(toGameInfo(placeBid.getGameCode(), game));
        }
    }

    /**
     * « Menteur ! » ou « Chiffre exact » sur la mise en cours : le serveur révèle les
     * dés, calcule le verdict, applique les changements de dés et ouvre la manche suivante.
     */
    public void challenge(Challenge challenge) {
        Game game = games.get(challenge.getGameCode());
        synchronized (requireOnlineGame(game)) {
            Player challenger = requireCurrentPlayer(game, challenge.getPlayerId());
            if (challenge.getType() == null) {
                throw new WsException(WsError.FIELD_REQUIRED);
            }
            Bid bid = game.getCurrentBid();
            if (bid == null) {
                throw new WsException(CustomWsError.NO_BID_TO_CHALLENGE);
            }

            boolean planificato = isPlanificato(game);
            List<Player> table = diceOnTable(game);
            int actualCount = BidRules.countMatching(table, bid.getFace(), planificato);
            Map<Integer, Integer> faceCounts = countFaces(table);
            List<Player> revealedPlayers = table.stream().map(GameService::copyPlayer).toList();

            Map<UUID, Integer> diceChanges = new HashMap<>();
            boolean challengerWon;
            boolean nextPlanificato = false;
            UUID starterId;
            if (challenge.getType() == ChallengeType.LIAR) {
                challengerWon = actualCount < bid.getQuantity();
                starterId = challengerWon ? bid.getPlayerId() : challenger.getId();
                // Un joueur parti en cours de manche ne perd rien : sa défaite compte pour du beurre
                Player loser = game.getPlayers().get(starterId);
                if (loser != null) {
                    nextPlanificato = loseOneDice(loser, diceChanges);
                }
            } else {
                challengerWon = actualCount == bid.getQuantity();
                starterId = challenger.getId();
                if (challengerWon) {
                    winExact(game, challenger, diceChanges);
                } else {
                    nextPlanificato = loseOneDice(challenger, diceChanges);
                }
            }

            // Le perdant ouvre la manche suivante, ou le suivant en vie s'il est éliminé (ou parti)
            UUID nextStarterId = isAlive(game, starterId) ? starterId : nextAlivePlayer(game, starterId);
            closeDepartures(game);

            rollAllDices(game);
            game.setIsPlanificato(nextPlanificato);
            game.setPlayerIdFinishTurn(nextStarterId);
            game.setCurrentPlayerId(nextStarterId);
            resetRound(game);

            RoundResult result = RoundResult.of(
                challenge.getType(),
                challenger.getId(),
                bid.getPlayerId(),
                bid,
                actualCount,
                faceCounts,
                BidRules.areJokersCounted(bid.getFace(), planificato),
                planificato,
                challengerWon,
                diceChanges,
                nextStarterId,
                revealedPlayers
            );
            game.setLastRoundResult(result);
            socketService.roundResult(RoundResultMessage.of(result, toGameInfo(challenge.getGameCode(), game)));
        }
    }

    /**
     * Fin de l'écran de résultat, réservée à l'admin : tous les joueurs passent en même
     * temps à la manche suivante. Tant qu'il n'a pas validé, le résultat reste dans la
     * partie pour être réaffiché à un joueur qui se reconnecte, l'admin compris.
     */
    public void nextRound(ActionGame actionGame) {
        Game game = games.get(actionGame.getGameCode());
        synchronized (requireOnlineGame(game)) {
            requireAdmin(game, actionGame.getPlayerId());

            game.setLastRoundResult(null);
            socketService.nextRound(toGameInfo(actionGame.getGameCode(), game));
        }
    }

    // Changements de dés, communs aux modes local et en ligne

    /**
     * Le joueur perd un dé.
     *
     * @return vrai si la manche suivante est planificato (le joueur tombe à 1 dé)
     */
    private static boolean loseOneDice(Player player, Map<UUID, Integer> diceChanges) {
        boolean isPlanificato = player.getDiceNumber() == 2;
        player.setDiceNumber(player.getDiceNumber() - 1);
        diceChanges.put(player.getId(), -1);
        return isPlanificato;
    }

    /**
     * Chiffre exact réussi : le joueur gagne un dé. S'il a déjà le maximum, tous les
     * autres joueurs encore en jeu en perdent un.
     */
    private static void winExact(Game game, Player player, Map<UUID, Integer> diceChanges) {
        if (player.getDiceNumber() < game.getDiceNumber()) {
            player.setDiceNumber(player.getDiceNumber() + 1);
            diceChanges.put(player.getId(), 1);
            return;
        }
        for (Player otherPlayer : game.getPlayers().values()) {
            if (otherPlayer.getId().equals(player.getId()) || otherPlayer.getDiceNumber() <= 0) {
                continue;
            }
            otherPlayer.setDiceNumber(otherPlayer.getDiceNumber() - 1);
            diceChanges.put(otherPlayer.getId(), -1);
        }
    }

    private static void rollAllDices(Game game) {
        for (Player player : game.getPlayers().values()) {
            player.setDices(GameUtils.rollDices(player.getDiceNumber()));
        }
    }

    // Outils du mode en ligne

    private static Game requireOnlineGame(Game game) {
        if (game == null) {
            throw new WsException(CustomWsError.GAME_NOT_FOUND);
        }
        if (game.getStatus() != GameStatus.IN_GAME) {
            throw new WsException(CustomWsError.GAME_NOT_STARTED);
        }
        if (game.getMode() != GameMode.ONLINE) {
            throw new WsException(CustomWsError.WRONG_GAME_MODE);
        }
        return game;
    }

    /** Seul le joueur courant, encore en vie, peut agir */
    private static Player requireCurrentPlayer(Game game, UUID playerId) {
        if (playerId == null || !playerId.equals(game.getCurrentPlayerId())) {
            throw new WsException(CustomWsError.NOT_YOUR_TURN);
        }
        if (!isAlive(game, playerId)) {
            throw new WsException(CustomWsError.NOT_YOUR_TURN);
        }
        return game.getPlayers().get(playerId);
    }

    private static boolean isAlive(Game game, UUID playerId) {
        Player player = game.getPlayers().get(playerId);
        return player != null && player.getDiceNumber() > 0;
    }

    /**
     * Prochain joueur en vie dans l'ordre fixe, en bouclant. Les éliminés et les
     * joueurs partis sont sautés.
     */
    private static UUID nextAlivePlayer(Game game, UUID fromPlayerId) {
        List<UUID> order = game.getPlayerOrder();
        int fromIndex = order.indexOf(fromPlayerId);
        for (int offset = 1; offset <= order.size(); offset++) {
            UUID candidate = order.get(Math.floorMod(fromIndex + offset, order.size()));
            if (isAlive(game, candidate)) {
                return candidate;
            }
        }
        return null;
    }

    /** Dés de la manche en cours : joueurs présents et joueurs partis pendant la manche */
    private static List<Player> diceOnTable(Game game) {
        List<Player> table = new ArrayList<>(game.getPlayers().values());
        table.addAll(game.getDepartedPlayers().values());
        return table;
    }

    /** À la fin de la manche, les joueurs partis sortent définitivement de l'ordre de jeu */
    private static void closeDepartures(Game game) {
        game.getPlayerOrder().removeAll(game.getDepartedPlayers().keySet());
        game.getDepartedPlayers().clear();
    }

    private static void resetRound(Game game) {
        game.setCurrentBid(null);
        game.getRoundBids().clear();
        game.getDepartedPlayers().clear();
    }

    private static Map<Integer, Integer> countFaces(List<Player> players) {
        Map<Integer, Integer> faceCounts = new TreeMap<>();
        for (int face = 1; face <= 6; face++) {
            faceCounts.put(face, 0);
        }
        players.stream()
            .flatMap(player -> player.getDices().stream())
            .forEach(dice -> faceCounts.merge(dice, 1, Integer::sum));
        return faceCounts;
    }

    private static boolean isPlanificato(Game game) {
        return Boolean.TRUE.equals(game.getIsPlanificato());
    }

    private static Player copyPlayer(Player player) {
        return Player.of(
            player.getId(), player.getName(), player.getEmoji(), player.getDiceNumber(),
            new ArrayList<>(player.getDices()), player.getIsAdmin()
        );
    }

    // Contrôles et construction des réponses

    private static void requireAdmin(Game game, UUID playerId) {
        Player actor = playerId == null ? null : game.getPlayers().get(playerId);
        if (actor == null || !Boolean.TRUE.equals(actor.getIsAdmin())) {
            throw new WsException(CustomWsError.NOT_GAME_ADMIN);
        }
    }

    private static void requireLocalMode(Game game) {
        if (game.getMode() == GameMode.ONLINE) {
            throw new WsException(CustomWsError.WRONG_GAME_MODE);
        }
    }

    private GameSession buildSession(UUID playerId, String gameCode, Game game) {
        return GameSession.of(playerId, game.getStatus(), toGameInfo(gameCode, game));
    }

    /**
     * État diffusé ou renvoyé aux joueurs. Les listes sont copiées : une réponse REST
     * est sérialisée après la sortie du {@code synchronized}, pendant qu'une autre
     * action peut modifier la partie.
     */
    private GameInfo toGameInfo(String gameCode, Game game) {
        Set<UUID> departedPlayerIds = game.getDepartedPlayers().keySet();
        return GameInfo.of(
            new ArrayList<>(game.getPlayers().values()),
            game.getDiceNumber(),
            gameCode,
            game.getIsPlanificato(),
            game.getPlayerIdFinishTurn(),
            game.getMode(),
            game.getPlayerOrder().stream().filter(playerId -> !departedPlayerIds.contains(playerId)).toList(),
            game.getCurrentPlayerId(),
            game.getCurrentBid(),
            new ArrayList<>(game.getRoundBids()),
            game.getLastRoundResult(),
            new ArrayList<>(game.getDepartedPlayers().values())
        );
    }

    private List<Player> addPlayer(String gameCode, UUID playerId, String username, String emoji, boolean isAdmin) {
        Game game = games.get(gameCode);
        Map<UUID, Player> players = game.getPlayers();
        players.put(playerId, Player.of(playerId, username, GameUtils.sanitizePlayerEmoji(emoji), game.getDiceNumber(), new ArrayList<>(), isAdmin));

        return new ArrayList<>(players.values());
    }

    private List<Player> removePlayer(String gameCode, UUID playerId) {
        Game game = games.get(gameCode);
        Map<UUID, Player> players = game.getPlayers();
        players.remove(playerId);

        return new ArrayList<>(players.values());
    }
}
