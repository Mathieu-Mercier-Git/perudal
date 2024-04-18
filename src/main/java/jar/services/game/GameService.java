package jar.services.game;

import jar.services.game.beans.Player;
import jar.services.socket.WebSocketApp;
import lombok.Getter;
import org.glassfish.grizzly.websockets.WebSocket;

import javax.inject.Inject;
import javax.inject.Singleton;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Getter
@Singleton
public class GameService {
    private final Map<WebSocket, WebSocketApp.SocketInfo> sockets;

    private final Map<String, Map<UUID, Player>> games;

    @Inject
    public GameService() {
        this.sockets = new ConcurrentHashMap<>();
        this.games = new ConcurrentHashMap<>();
    }

    // TODO : pas ouf de passer par le UUID, si la personne rafraichi la page, il perd la co
    public List<Player> updateGamePlayers(String gameCode, UUID playerId, String playerName, int diceNumber) {
        games.computeIfAbsent(gameCode, k -> new ConcurrentHashMap<>());

        Map<UUID, Player> players = games.get(gameCode);
        players.put(playerId, Player.of(playerName, diceNumber));

        games.put(gameCode, players);

        return new ArrayList<>(games.get(gameCode).values());
    }
}
