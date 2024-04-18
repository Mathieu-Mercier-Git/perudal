package jar.services.game.beans;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor(staticName="of")
public class Player {
    private String name;
    private int diceNumber;
    // TODO : add Liste de dés
}
