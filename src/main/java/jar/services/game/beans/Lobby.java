package jar.services.game.beans;

import jar.services.game.enums.GameMode;
import lombok.AllArgsConstructor;
import lombok.Getter;

import java.util.List;

@Getter
@AllArgsConstructor(staticName="of")
public class Lobby {
    private String gameCode;
    private List<Player> players;
    private GameMode mode;
}
