package jar.services.socket;

import jar.services.utils.ParserService;
import org.assertj.core.api.Assertions;
import org.glassfish.grizzly.websockets.WebSocket;
import org.junit.Test;

import java.lang.reflect.Proxy;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Vérifie qu'une socket morte restée dans une room ne bloque pas la diffusion :
 * c'est ce qui rendait le bouton « Révéler tous les dés » sans effet.
 */
public class SocketServiceTest {

    /** Socket factice : enregistre les messages reçus, et se comporte comme Grizzly une fois fermée */
    private static class FakeSocket {
        private final List<String> received = new ArrayList<>();
        private boolean connected = true;
        private final WebSocket socket = (WebSocket) Proxy.newProxyInstance(
            WebSocket.class.getClassLoader(),
            new Class<?>[] { WebSocket.class },
            (proxy, method, args) -> switch (method.getName()) {
                case "isConnected" -> connected;
                case "send" -> {
                    if (!connected) {
                        throw new RuntimeException("Socket is not connected.");
                    }
                    received.add((String) args[0]);
                    yield null;
                }
                case "hashCode" -> System.identityHashCode(proxy);
                case "equals" -> proxy == args[0];
                default -> null;
            }
        );
    }

    private static FakeSocket connect(SocketService socketService, String gameCode) {
        FakeSocket fakeSocket = new FakeSocket();
        UUID socketId = UUID.randomUUID();
        socketService.onConnect(fakeSocket.socket, socketId);
        socketService.reconnect(gameCode, UUID.randomUUID(), socketId);
        return fakeSocket;
    }

    @Test
    public void broadcast__should_reach_live_sockets_placed_after_a_dead_socket() {
        SocketService socketService = new SocketService(new ParserService());
        FakeSocket deadSocket = connect(socketService, "K161");
        FakeSocket liveSocket = connect(socketService, "K161");
        deadSocket.connected = false; // fermée sans que onClose() n'ait été appelé

        socketService.broadcast("K161", "message");

        Assertions.assertThat(liveSocket.received).containsExactly("message");
    }

    @Test
    public void broadcast__should_remove_dead_sockets_from_the_room() {
        SocketService socketService = new SocketService(new ParserService());
        FakeSocket deadSocket = connect(socketService, "K161");
        connect(socketService, "K161");
        deadSocket.connected = false;

        socketService.broadcast("K161", "first");
        deadSocket.connected = true; // si elle était encore dans la room, elle recevrait le 2e message
        socketService.broadcast("K161", "second");

        Assertions.assertThat(deadSocket.received).isEmpty();
    }

    @Test
    public void joinRoom__should_leave_the_previous_room() {
        SocketService socketService = new SocketService(new ParserService());
        FakeSocket fakeSocket = new FakeSocket();
        UUID socketId = UUID.randomUUID();
        socketService.onConnect(fakeSocket.socket, socketId);
        socketService.reconnect("AAAA", UUID.randomUUID(), socketId);
        socketService.reconnect("BBBB", UUID.randomUUID(), socketId);

        socketService.broadcast("AAAA", "message");

        Assertions.assertThat(fakeSocket.received).isEmpty();
    }
}
