package jar.services.game;

import com.coreoz.plume.jersey.errors.WsException;
import jar.services.game.beans.ActionGame;
import jar.services.game.beans.Game;
import jar.services.game.beans.GameInfo;
import jar.services.game.beans.JoinGame;
import jar.services.game.beans.Lobby;
import jar.services.game.beans.NewGame;
import jar.services.game.beans.Player;
import jar.services.game.beans.StartGame;
import jar.services.game.beans.TurnInfo;
import jar.services.socket.SocketService;
import jar.services.utils.GameUtils;
import jar.webservices.api.errors.CustomWsError;
import lombok.Getter;

import javax.inject.Inject;
import javax.inject.Singleton;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Getter
@Singleton
public class GameService {
    private final SocketService socketService;
    private final Map<String, Game> games; // Map<GameCode, Game>

    @Inject
    public GameService(SocketService socketService) {
        this.socketService = socketService;
        this.games = new ConcurrentHashMap<>();
    }

    public Lobby createGame(NewGame newGame) {
        String gameCode = GameUtils.generateGameCode();

        socketService.createGame(gameCode, newGame.getUserSocketId());

        games.computeIfAbsent(gameCode, k -> Game.of(new ConcurrentHashMap<>(), newGame.getDiceNumber()));
        List<Player> players = addPlayer(gameCode, newGame.getUserSocketId(), newGame.getUserName(), true);

        return Lobby.of(gameCode, players);
    }

    // TODO : ajouter une limite maximum de joueurs dans une partie, et gérer le cas où la partie est pleine
    // TODO : gérer si la partie a déjà commencé
    public Lobby joinGame(JoinGame joinGame) {
        if (!games.containsKey(joinGame.getGameCode())) {
            throw new WsException(CustomWsError.GAME_NOT_FOUND);
        }
        List<Player> players = addPlayer(joinGame.getGameCode(), joinGame.getUserSocketId(), joinGame.getUserName(), false);

        Lobby lobby = Lobby.of(joinGame.getGameCode(), players);
        socketService.joinGame(joinGame.getUserSocketId(), lobby);

        return lobby;
    }

    public void startGame(StartGame startGame) {
        if (!games.containsKey(startGame.getGameCode())) {
            throw new WsException(CustomWsError.GAME_NOT_FOUND);
        }
        Game currentGame = games.get(startGame.getGameCode());

        currentGame.setDiceNumber(startGame.getDiceNumber());
        for (Player player : currentGame.getPlayers().values()) {
            player.setDiceNumber(startGame.getDiceNumber());
            player.setDices(GameUtils.rollDices(startGame.getDiceNumber()));
        }

        games.put(startGame.getGameCode(), currentGame);
        GameInfo gameInfo = GameInfo.of(new ArrayList<>(currentGame.getPlayers().values()), currentGame.getDiceNumber(), startGame.getGameCode(), false, null);
        socketService.startGame(gameInfo);
    }

    public void quitGame(ActionGame actionGame) {
        if (!games.containsKey(actionGame.getGameCode())) {
            throw new WsException(CustomWsError.GAME_NOT_FOUND);
        }
        List<Player> players = removePlayer(actionGame.getGameCode(), actionGame.getUserSocketId());

        Lobby lobby = Lobby.of(actionGame.getGameCode(), players);
        socketService.quitGame(actionGame.getUserSocketId(), lobby);
    }

    public void cancelGame(ActionGame actionGame) {
        games.remove(actionGame.getGameCode());
        socketService.cancelGame(actionGame.getGameCode());
    }

    public void finishTurn(TurnInfo turnInfo) {
        if (!games.containsKey(turnInfo.getGameCode())) {
            throw new WsException(CustomWsError.GAME_NOT_FOUND);
        }
        Game game = games.get(turnInfo.getGameCode());
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
        games.put(turnInfo.getGameCode(), game);
        GameInfo gameInfo = GameInfo.of(new ArrayList<>(game.getPlayers().values()), game.getDiceNumber(), turnInfo.getGameCode(), isPlanificato, turnInfo.getPlayerId());
        socketService.finishTurn(gameInfo);
    }

    // TODO : pas ouf de passer par le UUID, si la personne rafraichi la page, il perd la co
    private List<Player> addPlayer(String gameCode, UUID userSocketId, String username, boolean isAdmin) {
        Game game = games.get(gameCode);
        Map<UUID, Player> players = game.getPlayers();
        players.put(userSocketId, Player.of(userSocketId, username, game.getDiceNumber(), new ArrayList<>(), isAdmin));

        games.put(gameCode, Game.of(players, game.getDiceNumber()));

        return new ArrayList<>(games.get(gameCode).getPlayers().values());
    }

    private List<Player> removePlayer(String gameCode, UUID userSocketId) {
        Game game = games.get(gameCode);
        Map<UUID, Player> players = game.getPlayers();
        players.remove(userSocketId);

        games.put(gameCode, Game.of(players, game.getDiceNumber()));

        return new ArrayList<>(games.get(gameCode).getPlayers().values());
    }
}
