package jar.services.socket;

import jar.services.game.GameService;
import jar.services.game.beans.Player;
import jar.services.game.enums.GameEvent;
import jar.services.socket.beans.SocketResponse;
import jar.services.socket.enums.ResponseStatus;
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

    // TODO : foutre les events ailleurs
    private final String EVENT_START_KEY = "start";
    private final String EVENT_PLAY_KEY = "play";
    private final String EVENT_UPDATE_DAMAGES_KEY = "damages";
    private final String EVENT_JOIN_GAME_KEY = "join_game"; // TODO : use
    private final String EVENT_EXIT_GAME_KEY = "exit_game";
    private final String EVENT_CAN_ULTIMATE_KEY = "can_ultimate";
    private final String EVENT_NOTIFY_CELL_POSITION_KEY = "notify_cell_position";
    private final String EVENT_WAITING_COUTDOWN_KEY = "waiting_countdown";
    private final String EVENT_FREE_PHASE_COUTDOWN_KEY = "free_phase_countdown";
    private final String EVENT_SWITCH_PHASE_KEY = "switch_phase";

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

    public void broadcast(String gameCode, Object body) {
        String stringBody = parserService.parseObject(body);
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
        switch (eventName) {
            case EVENT_JOIN_GAME_KEY -> {
                String idPlayer = data[0];
                // mise à jour dans le board de la partie en cours
                List<Player> players = gameService.updateGamePlayers(gameCode, socketInfo.getId(), data[0], Integer.valueOf(data[1]));
                // mise à jour au niveau des rooms
                joinRoom(gameCode, socketInfo.getSocket());
                sendLobby(gameCode, players);
            }
        }
    }

    public void onClose(WebSocketApp.SocketInfo socketInfo) {
        leaveRooms(socketInfo.getSocket());
    }

    private void sendLobby(String gameCode, List<Player> players) {
        SocketResponse response = SocketResponse.of(
            ResponseStatus.SUCCESS,
            GameEvent.UPDATED_LOBBY,
            players
        );
        broadcast(gameCode, response);
    }

    public void updateDamages(String gameCode, String idPlayer1, int hpPlayer1, int damagePlayer1, String idPlayer2, int hpPlayer2, int damagePlayer2) {
        broadcast(gameCode, String.join("/", EVENT_UPDATE_DAMAGES_KEY, idPlayer1, String.valueOf(hpPlayer1), String.valueOf(damagePlayer1), idPlayer2, String.valueOf(hpPlayer2), String.valueOf(damagePlayer2)));
    }

    public void canUltimate(UUID idSocket, boolean canUltimate) {
        WebSocket socket = retrieveSocketFromId(idSocket);
        if (socket != null) socket.send(String.join("/", EVENT_CAN_ULTIMATE_KEY, String.valueOf(canUltimate)));
    }

    public void waitingCountdown(String gameCode, String idPlayer, int waitingCountdown) {
        broadcast(gameCode, String.join("/", List.of(EVENT_WAITING_COUTDOWN_KEY, idPlayer, String.valueOf(waitingCountdown))));
    }

//    public void switchPhase(String gameCode, PHASE currentPhase) {
//        broadcast(gameCode, String.join("/", List.of(EVENT_SWITCH_PHASE_KEY, currentPhase.name())));
//    }

    public void freePhaseCountdown(String gameCode, int freePhaseCountdown) {
        broadcast(gameCode, String.join("/", List.of(EVENT_FREE_PHASE_COUTDOWN_KEY, String.valueOf(freePhaseCountdown))));
    }
}
