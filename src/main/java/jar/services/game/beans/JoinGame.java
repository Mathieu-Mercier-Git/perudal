package jar.services.game.beans;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Getter
@AllArgsConstructor(staticName="of")
@NoArgsConstructor
public class JoinGame {
    private UUID userSocketId;
    private String userName;
    private String gameCode;
}
