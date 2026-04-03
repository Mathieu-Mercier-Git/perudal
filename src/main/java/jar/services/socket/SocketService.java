package jar.services.socket;

import jar.services.game.beans.Lobby;
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

//    public void onMessage(WebSocketApp.SocketInfo socketInfo, String eventName, String gameCode, String[] data) {
//        ClientEvent clientEvent = ClientEvent.findByName(eventName);
//        if (clientEvent == null) {
//            // TODO : handle error
//            return;
//        }
//        switch (clientEvent) {
//            case JOIN_GAME -> {
//                // mise à jour dans le board de la partie en cours
//                List<Player> players = gameService.addPlayer(gameCode, NewGame.of(socketInfo.getId(), data[0], Integer.valueOf(data[1])), false);
//                // mise à jour au niveau des rooms
//                joinRoom(gameCode, socketInfo.getSocket());
//                sendLobby(gameCode, players);
//            }
//            case CREATE_GAME -> {
//                List<Player> players = gameService.addPlayer(gameCode, NewGame.of(socketInfo.getId(), data[0], Integer.valueOf(data[1])), true);
//                // mise à jour au niveau des rooms
//                joinRoom(gameCode, socketInfo.getSocket());
//                sendLobby(gameCode, players);
//            }
//            case QUIT_GAME -> {
//                List<Player> players = gameService.removePlayer(gameCode, socketInfo.getId());
//                // mise à jour au niveau des rooms
//                leaveRooms(socketInfo.getSocket());
//                sendLobby(gameCode, players);
//            }
//            case CANCEL_GAME -> {
//                gameService.removeGame(gameCode);
//                sendCancelGame(gameCode);
//                // mise à jour au niveau des rooms
//                removeRoom(gameCode); // TODO : bien tester qu'on a bien supprimé ce qu'il fallait (room, game)
//            }
//        }
//    }

    @Data
    @AllArgsConstructor(staticName="of")
    public static class Passport {
        private final UUID socketId;
        private final String gameCode;
    }
}
