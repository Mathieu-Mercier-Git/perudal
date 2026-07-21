package jar.services.game.beans;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@AllArgsConstructor(staticName="of")
public class Player {
    private String name;
    private int diceNumber;
    private boolean isAdmin;
    // TODO : add Liste de dés
}
