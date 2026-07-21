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
import jar.services.socket.SocketService;
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
        String gameCode = generateGameCode();

        socketService.createGame(gameCode, newGame.getUserSocketId());

        games.computeIfAbsent(gameCode, k -> Game.of(new ConcurrentHashMap<>(), newGame.getDiceNumber()));
        List<Player> players = addPlayer(gameCode, newGame.getUserSocketId(), newGame.getUserName(), true);

        return Lobby.of(gameCode, players);
    }

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
        }

        games.put(startGame.getGameCode(), currentGame);

        GameInfo gameInfo = GameInfo.of(new ArrayList<>(currentGame.getPlayers().values()), currentGame.getDiceNumber(), startGame.getGameCode());

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

    // TODO : pas ouf de passer par le UUID, si la personne rafraichi la page, il perd la co
    public List<Player> addPlayer(String gameCode, UUID userSocketId, String username, boolean isAdmin) {
        Game game = games.get(gameCode);
        Map<UUID, Player> players = game.getPlayers();
        players.put(userSocketId, Player.of(username, game.getDiceNumber(), isAdmin));

        games.put(gameCode, Game.of(players, game.getDiceNumber()));

        return new ArrayList<>(games.get(gameCode).getPlayers().values());
    }

    public List<Player> removePlayer(String gameCode, UUID userSocketId) {
        Game game = games.get(gameCode);
        Map<UUID, Player> players = game.getPlayers();
        players.remove(userSocketId);

        games.put(gameCode, Game.of(players, game.getDiceNumber()));

        return new ArrayList<>(games.get(gameCode).getPlayers().values());
    }

    private String generateGameCode() {
        // TODO :
        return "123";
    }
}
