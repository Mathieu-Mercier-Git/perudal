package jar.services.socket;

import lombok.Getter;
import org.glassfish.grizzly.websockets.WebSocket;

import javax.inject.Inject;
import javax.inject.Singleton;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Singleton
public class DataService {

    @Getter
    private final Map<WebSocket, WebSocketApp.SocketInfo> sockets;

    @Inject
    public DataService() {
        this.sockets= new ConcurrentHashMap<>();
    }

    public boolean updatePlayerSocket(String gameCode, String idPlayer, UUID idSocket) {
        return true;
    }
}
