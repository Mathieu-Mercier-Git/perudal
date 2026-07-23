package jar.services.socket;

import jar.services.game.GameService;
import org.glassfish.grizzly.http.HttpRequestPacket;
import org.glassfish.grizzly.websockets.DataFrame;
import org.glassfish.grizzly.websockets.ProtocolHandler;
import org.glassfish.grizzly.websockets.SimpleWebSocket;
import org.glassfish.grizzly.websockets.WebSocket;
import org.glassfish.grizzly.websockets.WebSocketApplication;
import org.glassfish.grizzly.websockets.WebSocketListener;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.inject.Inject;
import javax.inject.Singleton;
import java.util.UUID;

@Singleton
public class WebSocketApp extends WebSocketApplication {
    private static final Logger logger = LoggerFactory.getLogger(WebSocketApp.class);

    private final SocketService socketService;

    @Inject
    public WebSocketApp(SocketService socketService, GameService gameService) {
        this.socketService = socketService;
    }

    @Override
    public WebSocket createSocket(ProtocolHandler handler, HttpRequestPacket requestPacket,
                                  WebSocketListener... listeners) {
        return new SimpleWebSocket(
            handler,
            new WebSocketListenerApp(socketService)
        );
    }

    private static class WebSocketListenerApp implements WebSocketListener {
        private final SocketService socketService;

        private WebSocketListenerApp(SocketService socketService) {
            this.socketService = socketService;
        }

        @Override
        public void onConnect(WebSocket socket) {
            UUID idSocket = UUID.randomUUID();
            socketService.onConnect(socket, idSocket);
            logger.info("A socket has been opened");
            socket.send("id:" + idSocket);
        }

        @Override
        public void onClose(WebSocket socket, DataFrame frame) {
            socketService.onClose(socket);
            logger.info("A socket has been closed");
        }

        @Override
        public void onMessage(WebSocket socket, String text) {
            int dataMinimumLength = 2;
            try {
                String[] dataMessage = text.split("/");
                if (dataMessage.length < dataMinimumLength) {
                    return;
                }
                String eventKey = dataMessage[0];
                String gameCode = dataMessage[1];

                socketService.onMessage(socket, eventKey, gameCode);
            } catch (Exception e) {
                logger.warn("Cannot handle message", e);
            }
        }

        @Override
        public void onMessage(WebSocket socket, byte[] bytes) {
        }


        @Override
        public void onPing(WebSocket socket, byte[] bytes) {
        }

        @Override
        public void onPong(WebSocket socket, byte[] bytes) {
        }

        @Override
        public void onFragment(WebSocket socket, String fragment, boolean last) {
        }

        @Override
        public void onFragment(WebSocket socket, byte[] fragment, boolean last) {
        }

    }
}
