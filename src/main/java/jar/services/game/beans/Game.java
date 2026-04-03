package jar.services.game.beans;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.Map;
import java.util.UUID;

@Getter
@AllArgsConstructor(staticName="of")
@NoArgsConstructor
public class Game {
    private Map<UUID, Player> players;
    private int diceNumber;
}
