package jar.services.socket;

import lombok.AllArgsConstructor;
import lombok.Data;
import org.glassfish.grizzly.http.HttpRequestPacket;
import org.glassfish.grizzly.websockets.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.inject.Inject;
import javax.inject.Singleton;
import java.util.Arrays;
import java.util.UUID;

@Singleton
public class WebSocketApp extends WebSocketApplication {
    private static final Logger logger = LoggerFactory.getLogger(WebSocketApp.class);

    private final SocketService socketService;
    private final DataService dataService;

    @Inject
    public WebSocketApp(SocketService socketService, DataService dataService) {
        this.socketService = socketService;
        this.dataService = dataService;
    }

    @Override
    public WebSocket createSocket(ProtocolHandler handler, HttpRequestPacket requestPacket,
                                  WebSocketListener... listeners) {
        return new SimpleWebSocket(
            handler,
            new WebSocketListenerApp(socketService, dataService)
        );
    }

    private static class WebSocketListenerApp implements WebSocketListener {
        private final SocketService socketService;
        private final DataService dataService;

        private WebSocketListenerApp(SocketService socketService, DataService dataService) {
            this.socketService = socketService;
            this.dataService = dataService;
        }

        @Override
        public void onClose(WebSocket socket, DataFrame frame) {
            SocketInfo socketInfo = dataService.getSockets().remove(socket);
            socketService.onClose(socketInfo);
            logger.info("A socket has been closed");
        }

        @Override
        public void onConnect(WebSocket socket) {
            UUID idSocket = UUID.randomUUID();
            dataService.getSockets().put(socket, new SocketInfo(idSocket, socket));
            logger.info("A socket has been opened");
            socket.send("id:" + idSocket);
        }

        @Override
        public void onMessage(WebSocket socket, String text) {
            try {
                SocketInfo socketInfo = dataService.getSockets().get(socket);
                if (socketInfo == null) {
                    logger.error("Un message a été reçu via un socket qui n'a pas été déclaré");
                } else {
                    logger.info("[" + socketInfo.getId() + "] : " + text);
                    String[] dataMessage = text.split("/");
                    if (dataMessage.length < 3) {
                        return;
                    }
                    String event = dataMessage[0];
                    String gameCode = dataMessage[1];
                    String[] data = Arrays.copyOfRange(dataMessage, 2, dataMessage.length);

                    socketService.onMessage(socketInfo, event, gameCode, data);
                }
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


    @AllArgsConstructor
    @Data
    public static class SocketInfo {
        private final UUID id;
        private final WebSocket socket;
    }
}
