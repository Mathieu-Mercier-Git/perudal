package jar.services.socket.beans;

import jar.services.socket.enums.ServerEvent;
import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor(staticName="of")
public class SocketResponse {
//    private ResponseStatus status;
    private ServerEvent event;
    private Object body;
}
