package jar.services.game;

import com.coreoz.plume.jersey.errors.WsException;
import jar.services.game.beans.ActionGame;
import jar.services.game.beans.Game;
import jar.services.game.beans.GameInfo;
import jar.services.game.beans.GameSession;
import jar.services.game.beans.JoinGame;
import jar.services.game.beans.Lobby;
import jar.services.game.beans.NewGame;
import jar.services.game.beans.Player;
import jar.services.game.beans.ReconnectGame;
import jar.services.game.beans.StartGame;
import jar.services.game.beans.TurnInfo;
import jar.services.game.enums.GameStatus;
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

        List<Player> players = addPlayer(gameCode, playerId, newGame.getUserName(), true);

        return buildSession(playerId, gameCode, games.get(gameCode), players);
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
    // TODO : gérer si la partie a déjà commencé
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
        UUID playerId = UUID.randomUUID();
        List<Player> players = addPlayer(gameCode, playerId, joinGame.getUserName(), false);

        Lobby lobby = Lobby.of(gameCode, players);
        socketService.joinGame(joinGame.getUserSocketId(), lobby);
        socketService.bindPlayer(playerId, joinGame.getUserSocketId());

        return buildSession(playerId, gameCode, game, players);
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

        return buildSession(
            reconnectGame.getPlayerId(),
            reconnectGame.getGameCode(),
            game,
            new ArrayList<>(game.getPlayers().values())
        );
    }

    public void startGame(StartGame startGame) {
        Game currentGame = games.get(startGame.getGameCode());
        if (currentGame == null) {
            throw new WsException(CustomWsError.GAME_NOT_FOUND);
        }

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

        games.put(startGame.getGameCode(), currentGame);
        socketService.startGame(toGameInfo(startGame.getGameCode(), currentGame));
    }

    public void quitGame(ActionGame actionGame) {
        if (!games.containsKey(actionGame.getGameCode())) {
            throw new WsException(CustomWsError.GAME_NOT_FOUND);
        }
        List<Player> players = removePlayer(actionGame.getGameCode(), actionGame.getPlayerId());

        Lobby lobby = Lobby.of(actionGame.getGameCode(), players);
        socketService.quitGame(actionGame.getPlayerId(), lobby);

        // Le dernier joueur est parti : la partie ne peut plus servir à personne, on la
        // supprime sans attendre la purge quotidienne. Aucun risque de viser une partie
        // encore vivante : une déconnexion ne retire jamais un joueur (c'est ce qui
        // permet la reconnexion), seul un départ explicite le fait.
        if (players.isEmpty()) {
            removeGame(actionGame.getGameCode());
        }
    }

    public void cancelGame(ActionGame actionGame) {
        games.remove(actionGame.getGameCode());
        socketService.cancelGame(actionGame.getGameCode());
    }

    public void finishTurn(TurnInfo turnInfo) {
        Game game = games.get(turnInfo.getGameCode());
        if (game == null) {
            throw new WsException(CustomWsError.GAME_NOT_FOUND);
        }
        Map<UUID, Player> players = game.getPlayers();

        Player currentplayer = players.get(turnInfo.getPlayerId());
        boolean isPlanificato = false;
        if (turnInfo.isHasLost()) {
            isPlanificato = currentplayer.getDiceNumber() == 2;
            currentplayer.setDiceNumber(currentplayer.getDiceNumber() - 1);
        } else { // Cas d'un chiffre exact
            if (currentplayer.getDiceNumber() < game.getDiceNumber()) {
                currentplayer.setDiceNumber(currentplayer.getDiceNumber() + 1);
            } else { // Si le joueur a déjà la max de dés, tous les autres joueurs perdent un dés
                for (Player player : game.getPlayers().values()) {
                    if (player.getId().equals(turnInfo.getPlayerId())) {
                        continue;
                    }
                    player.setDiceNumber(player.getDiceNumber() - 1);
                }
            }
        }

        for (Player player : game.getPlayers().values()) {
            player.setDices(GameUtils.rollDices(player.getDiceNumber()));
        }
        // L'état du tour est conservé pour pouvoir le restituer à une reconnexion
        game.setIsPlanificato(isPlanificato);
        game.setPlayerIdFinishTurn(turnInfo.getPlayerId());
        games.put(turnInfo.getGameCode(), game);
        socketService.finishTurn(toGameInfo(turnInfo.getGameCode(), game));
    }

    private GameSession buildSession(UUID playerId, String gameCode, Game game, List<Player> players) {
        return GameSession.of(
            playerId,
            game.getStatus(),
            GameInfo.of(players, game.getDiceNumber(), gameCode, game.getIsPlanificato(), game.getPlayerIdFinishTurn())
        );
    }

    private GameInfo toGameInfo(String gameCode, Game game) {
        return GameInfo.of(
            new ArrayList<>(game.getPlayers().values()),
            game.getDiceNumber(),
            gameCode,
            game.getIsPlanificato(),
            game.getPlayerIdFinishTurn()
        );
    }

    private List<Player> addPlayer(String gameCode, UUID playerId, String username, boolean isAdmin) {
        Game game = games.get(gameCode);
        Map<UUID, Player> players = game.getPlayers();
        players.put(playerId, Player.of(playerId, username, game.getDiceNumber(), new ArrayList<>(), isAdmin));

        return new ArrayList<>(players.values());
    }

    private List<Player> removePlayer(String gameCode, UUID playerId) {
        Game game = games.get(gameCode);
        Map<UUID, Player> players = game.getPlayers();
        players.remove(playerId);

        return new ArrayList<>(players.values());
    }
}
