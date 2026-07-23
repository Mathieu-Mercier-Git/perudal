package jar.services.socket;

import jar.services.game.beans.GameInfo;
import jar.services.game.beans.Lobby;
import jar.services.socket.enums.ClientEvent;
import jar.services.socket.enums.ServerEvent;
import jar.services.socket.beans.SocketResponse;
import jar.services.utils.ParserService;
import lombok.AllArgsConstructor;
import lombok.Data;
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

    private final ParserService parserService;
    private final Map<String, List<WebSocket>> socketsByGame;
    private final Map<UUID, WebSocket> socketById;
    private final Map<WebSocket, Passport> IdAndGameCodebySocket;

    @Inject
    public SocketService(ParserService parserService) {
        this.parserService = parserService;
        this.socketsByGame = new HashMap<>();
        this.socketById = new HashMap<>();
        this.IdAndGameCodebySocket = new HashMap<>();
    }

    public void onConnect(WebSocket socket, UUID socketId) {
        socketById.put(socketId, socket);
        IdAndGameCodebySocket.put(socket, Passport.of(socketId, null));
    }

    public void onClose(WebSocket socket) {
        Passport passport = IdAndGameCodebySocket.get(socket); // TODO : test si passport != null
        if (passport == null) {
            return;
        }
        socketById.remove(passport.getSocketId()); // On supprime la socket de sa liste de référence
        leaveRoom(socket, passport);
        IdAndGameCodebySocket.remove(socket);

    }

    public void createGame(String gameCode, UUID socketId) {
        if (socketsByGame.containsKey(gameCode)) {
            logger.error("Game with the code {} already exists", gameCode);
            // TODO : handle
        }
        joinRoom(gameCode, socketId);
    }

    public void joinGame(UUID socketId, Lobby lobby) {
        String gameCode = lobby.getGameCode();
        if (!socketsByGame.containsKey(gameCode)) {
            logger.error("Game with the code {} doesn't exist", gameCode);
            // TODO : handle
        }
        joinRoom(gameCode, socketId);
        sendLobby(lobby);
    }

    public void startGame(GameInfo gameInfo) {
        List<WebSocket> sockets = socketsByGame.get(gameInfo.getGameCode());
        for (WebSocket socket: sockets) {
            IdAndGameCodebySocket.computeIfPresent(socket,
                (key, passport) -> Passport.of(passport.getSocketId(), null));
        }
        sendStartGame(gameInfo);
    }

    public void quitGame(UUID socketId, Lobby lobby) {
        WebSocket socket = socketById.get(socketId);
        Passport passport = IdAndGameCodebySocket.get(socket);
        leaveRoom(socket, passport);
        sendLobby(lobby);
    }

    public void cancelGame(String gameCode) {
        List<WebSocket> sockets = socketsByGame.get(gameCode);
        for (WebSocket socket: sockets) {
            IdAndGameCodebySocket.computeIfPresent(socket,
                (key, passport) -> Passport.of(passport.getSocketId(), null));
        }
        sendCancelGame(gameCode); // On envoie les informations avant de supprimer l'élément (Important)
        socketsByGame.remove(gameCode);
    }

    private void joinRoom(String gameCode, UUID socketId) {
        WebSocket socket = socketById.get(socketId); // TODO : test si socket != null

        IdAndGameCodebySocket.computeIfPresent(socket, // TODO : test si passport != null
            (key, passport) -> Passport.of(passport.getSocketId(), gameCode));

        socketsByGame.computeIfAbsent(gameCode, k -> new ArrayList<>());
        socketsByGame.put(
            gameCode,
            Stream.concat(
                socketsByGame.get(gameCode).stream(),
                Stream.of(socket)
            ).toList()
        );
    }

    private void leaveRoom(WebSocket socket, Passport passport) {
        String gameCode = passport.getGameCode();
        socketsByGame.computeIfAbsent(gameCode, k -> new ArrayList<>());
        socketsByGame.put(gameCode, socketsByGame.get(gameCode).stream().filter(s -> s != socket).toList());

        IdAndGameCodebySocket.put(socket, Passport.of(passport.socketId, null));
    }

    private void sendLobby(Lobby lobby) {
        SocketResponse response = SocketResponse.of( // works with event and body
//            ResponseStatus.SUCCESS,
            ServerEvent.UPDATED_LOBBY,
            lobby
        );
        broadcast(lobby.getGameCode(), response);
    }

    private void sendCancelGame(String gameCode) {
        SocketResponse response = SocketResponse.of(
//            ResponseStatus.SUCCESS,
            ServerEvent.CANCEL_GAME,
            gameCode
        );
        broadcast(gameCode, response);
    }

    private void sendStartGame(GameInfo gameInfo) {
        SocketResponse response = SocketResponse.of(
            ServerEvent.START_GAME,
            gameInfo
        );
        broadcast(gameInfo.getGameCode(), response);
    }

    private void sendRevealDices(String gameCode) {
        SocketResponse response = SocketResponse.of(
            ServerEvent.REVEAL_DICES,
            gameCode
        );
        broadcast(gameCode, response);
    }

//    private WebSocket retrieveSocketFromId(UUID idSocket) {
//        for (Map.Entry<WebSocket, WebSocketApp.SocketInfo> entry : gameService.getSockets().entrySet()) {
//            if (entry.getValue().getId().equals(idSocket)) return entry.getKey();
//        }
//        return null;
//    }

//    private void joinRoom(String gameCode, WebSocket socket) {
//        leaveRooms(socket); // Delete to be sure that the socket will be updated with its proper gameCode
//        roomSockets.computeIfAbsent(gameCode, k -> new ArrayList<>());
//        roomSockets.put(
//            gameCode,
//            Stream.concat(
//                roomSockets.get(gameCode).stream(),
//                Stream.of(socket)
//            ).toList()
//        );
//
//        socketRoom.put(socket, gameCode);
//    }

    public void broadcast(String gameCode, SocketResponse response) {
        String stringBody = parserService.parseObject(response);
        for (WebSocket socket : socketsByGame.get(gameCode)) {
            socket.send(stringBody);
        }
    }

    public void broadcast(String gameCode, String message) {
        for (WebSocket socket : socketsByGame.get(gameCode)) {
            socket.send(message);
        }
    }

    public void onMessage(WebSocket socket, String eventKey, String gameCode) {
        ClientEvent clientEvent = ClientEvent.findByName(eventKey);
        if (clientEvent == null) {
            logger.error("Unknown client event received: {}", eventKey);
            return;
        }
        if (clientEvent == ClientEvent.REVEAL_DICES) {
            sendRevealDices(gameCode);
        }
    }

    @Data
    @AllArgsConstructor(staticName="of")
    public static class Passport {
        private final UUID socketId;
        private final String gameCode;
    }
}
