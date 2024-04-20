package jar.services.socket;

import jar.services.game.GameService;
import jar.services.game.beans.Lobby;
import jar.services.game.beans.Player;
import jar.services.socket.enums.ClientEvent;
import jar.services.socket.enums.ServerEvent;
import jar.services.socket.beans.SocketResponse;
import jar.services.utils.ParserService;
import org.glassfish.grizzly.websockets.WebSocket;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.inject.Inject;
import javax.inject.Singleton;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Stream;

@Singleton
public class SocketService {
    private static final Logger logger = LoggerFactory.getLogger(SocketService.class);

    private final GameService gameService;
    private final ParserService parserService;
    private final Map<String, List<WebSocket>> roomSockets;
    private final Map<WebSocket, String> socketRoom;

    @Inject
    public SocketService(GameService gameService, ParserService parserService) {
        this.parserService = parserService;
        this.roomSockets = new HashMap<>();
        this.socketRoom = new HashMap<>();
        this.gameService = gameService;
    }

    private WebSocket retrieveSocketFromId(UUID idSocket) {
        for (Map.Entry<WebSocket, WebSocketApp.SocketInfo> entry : gameService.getSockets().entrySet()) {
            if (entry.getValue().getId().equals(idSocket)) return entry.getKey();
        }
        return null;
    }

    private void joinRoom(String gameCode, WebSocket socket) {
        leaveRooms(socket); // Delete to be sure that the socket will be updated with its proper gameCode
        roomSockets.computeIfAbsent(gameCode, k -> new ArrayList<>());
        roomSockets.put(
            gameCode,
            Stream.concat(
                roomSockets.get(gameCode).stream(),
                Stream.of(socket)
            ).toList()
        );

        socketRoom.put(socket, gameCode);
    }

    private void leaveRooms(WebSocket socket) {
        String currentRoom = this.socketRoom.get(socket);
        if (currentRoom != null) {
            socketRoom.remove(socket);
            roomSockets.computeIfAbsent(currentRoom, k -> new ArrayList<>());
            roomSockets.put(currentRoom, roomSockets.get(currentRoom).stream().filter(s -> s != socket).toList());
        }
    }

    public void broadcast(String gameCode, SocketResponse response) {
        String stringBody = parserService.parseObject(response);
        for (WebSocket socket : roomSockets.get(gameCode)) {
            socket.send(stringBody);
        }
    }

    public void broadcast(String gameCode, String message) {
        for (WebSocket socket : roomSockets.get(gameCode)) {
            socket.send(message);
        }
    }

    public void onMessage(WebSocketApp.SocketInfo socketInfo, String eventName, String gameCode, String[] data) {
        ClientEvent clientEvent = ClientEvent.findByName(eventName);
        if (clientEvent == null) {
            // TODO : handle error
            return;
        }
        switch (clientEvent) {
            case JOIN_GAME -> {
                String idPlayer = data[0];
                // mise à jour dans le board de la partie en cours
                List<Player> players = gameService.updateGamePlayers(gameCode, socketInfo.getId(), data[0], Integer.valueOf(data[1]), false);
                // mise à jour au niveau des rooms
                joinRoom(gameCode, socketInfo.getSocket());
                sendLobby(gameCode, players, Integer.valueOf(data[1]));
            }
            case CREATE_GAME -> {
                List<Player> players = gameService.updateGamePlayers(gameCode, socketInfo.getId(), data[0], Integer.valueOf(data[1]), true);
                // mise à jour au niveau des rooms
                joinRoom(gameCode, socketInfo.getSocket());
                sendLobby(gameCode, players, Integer.valueOf(data[1]));
            }
        }
    }

    public void onClose(WebSocketApp.SocketInfo socketInfo) {
        leaveRooms(socketInfo.getSocket());
    }

    private void sendLobby(String gameCode, List<Player> players, int diceNumber) {
        SocketResponse response = SocketResponse.of( // works with event and body
//            ResponseStatus.SUCCESS,
            ServerEvent.UPDATED_LOBBY,
            Lobby.of(gameCode, players, diceNumber)
        );
        broadcast(gameCode, response);
    }
}
