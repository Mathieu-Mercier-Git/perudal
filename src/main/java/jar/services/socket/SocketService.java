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

/**
 * Achemine les évènements vers les sockets d'une partie.
 * <p>
 * La socket n'est qu'un moyen de transport : elle change à chaque reconnexion.
 * L'identité durable du joueur est le {@code playerId}, et {@link #socketByPlayer}
 * fait le lien entre les deux — c'est ce qui permet à un joueur de retrouver sa
 * place après un verrouillage du téléphone.
 */
@Singleton
public class SocketService {
    private static final Logger logger = LoggerFactory.getLogger(SocketService.class);

    private final ParserService parserService;
    private final Map<String, List<WebSocket>> socketsByGame;
    private final Map<UUID, WebSocket> socketById;
    private final Map<WebSocket, Passport> IdAndGameCodebySocket;
    private final Map<UUID, WebSocket> socketByPlayer;

    @Inject
    public SocketService(ParserService parserService) {
        this.parserService = parserService;
        this.socketsByGame = new HashMap<>();
        this.socketById = new HashMap<>();
        this.IdAndGameCodebySocket = new HashMap<>();
        this.socketByPlayer = new HashMap<>();
    }

    public void onConnect(WebSocket socket, UUID socketId) {
        socketById.put(socketId, socket);
        IdAndGameCodebySocket.put(socket, Passport.of(socketId, null));
    }

    public void onClose(WebSocket socket) {
        Passport passport = IdAndGameCodebySocket.get(socket);
        if (passport == null) {
            return;
        }
        socketById.remove(passport.getSocketId()); // On supprime la socket de sa liste de référence
        // Le joueur reste dans la partie : seule sa socket disparait, il pourra la reprendre
        // via reconnect(). On nettoie juste la référence morte.
        socketByPlayer.values().removeIf(knownSocket -> knownSocket == socket);
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

    /** Associe une identité de joueur à sa connexion courante */
    public void bindPlayer(UUID playerId, UUID socketId) {
        WebSocket socket = socketById.get(socketId);
        if (socket == null) {
            logger.error("Cannot bind player {}: unknown socket {}", playerId, socketId);
            return;
        }
        socketByPlayer.put(playerId, socket);
    }

    /** Rattache une nouvelle socket à la room et à l'identité du joueur qui revient */
    public void reconnect(String gameCode, UUID playerId, UUID socketId) {
        joinRoom(gameCode, socketId);
        bindPlayer(playerId, socketId);
    }

    public void startGame(GameInfo gameInfo) {
        sendStartGame(gameInfo);
    }

    public void finishTurn(GameInfo gameInfo) {
        sendFinishTurn(gameInfo);
    }

    public void quitGame(UUID playerId, Lobby lobby) {
        WebSocket socket = socketByPlayer.remove(playerId);
        if (socket != null) {
            Passport passport = IdAndGameCodebySocket.get(socket);
            if (passport != null) {
                leaveRoom(socket, passport);
            }
        }
        sendLobby(lobby);
    }

    public void cancelGame(String gameCode) {
        List<WebSocket> sockets = socketsByGame.get(gameCode);
        if (sockets != null) {
            for (WebSocket socket : sockets) {
                IdAndGameCodebySocket.computeIfPresent(socket,
                    (key, passport) -> Passport.of(passport.getSocketId(), null));
            }
        }
        sendCancelGame(gameCode); // On envoie les informations avant de supprimer l'élément (Important)
        socketsByGame.remove(gameCode);
    }

    private void joinRoom(String gameCode, UUID socketId) {
        WebSocket socket = socketById.get(socketId);
        if (socket == null) {
            logger.error("Cannot join room {}: unknown socket {}", gameCode, socketId);
            return;
        }

        IdAndGameCodebySocket.computeIfPresent(socket,
            (key, passport) -> Passport.of(passport.getSocketId(), gameCode));

        List<WebSocket> roomSockets = socketsByGame.computeIfAbsent(gameCode, k -> new ArrayList<>());
        if (roomSockets.contains(socket)) { // une reconnexion ne doit pas dupliquer la socket dans la room
            return;
        }
        socketsByGame.put(
            gameCode,
            Stream.concat(
                roomSockets.stream(),
                Stream.of(socket)
            ).toList()
        );
    }

    private void leaveRoom(WebSocket socket, Passport passport) {
        String gameCode = passport.getGameCode();
        if (gameCode == null) { // socket qui n'a rejoint aucune partie
            return;
        }
        List<WebSocket> roomSockets = socketsByGame.get(gameCode);
        if (roomSockets != null) {
            socketsByGame.put(gameCode, roomSockets.stream().filter(s -> s != socket).toList());
        }

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

    private void sendFinishTurn(GameInfo gameInfo) {
        SocketResponse response = SocketResponse.of(
            ServerEvent.FINISH_TURN,
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

    public void broadcast(String gameCode, SocketResponse response) {
        broadcast(gameCode, parserService.parseObject(response));
    }

    public void broadcast(String gameCode, String message) {
        List<WebSocket> sockets = socketsByGame.get(gameCode);
        if (sockets == null) {
            logger.warn("Cannot broadcast: no room for the game {}", gameCode);
            return;
        }
        for (WebSocket socket : sockets) {
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
