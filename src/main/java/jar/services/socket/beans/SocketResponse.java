package jar.services.socket.beans;

import jar.services.game.enums.GameEvent;
import jar.services.socket.enums.ResponseStatus;
import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor(staticName="of")
public class SocketResponse {
    private ResponseStatus status;
    private GameEvent event;
    private Object body;
}
