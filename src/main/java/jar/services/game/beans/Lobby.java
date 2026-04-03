package jar.services.game.beans;

import lombok.AllArgsConstructor;
import lombok.Getter;

import java.util.List;

@Getter
@AllArgsConstructor(staticName="of")
public class Lobby {
    private String gameCode;
    private List<Player> players;
}
