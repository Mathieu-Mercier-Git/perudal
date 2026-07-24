package jar.services.game.beans;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Getter
@AllArgsConstructor(staticName="of")
@NoArgsConstructor
public class TurnInfo {
    private String gameCode;
    private UUID playerId;
    private boolean hasLost;
}
