package jar.services.game.beans;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;

import java.util.List;
import java.util.UUID;

@Getter
@Setter
@AllArgsConstructor(staticName="of")
public class Player { // TODO : Peut être créer un type PlayerLobby et Player tout court. PlayerLobby n'ayant besoin que de name et isAdmin?
    private UUID id;
    private String name;
    private int diceNumber;
    private List<Integer> dices;
    private Boolean isAdmin;
}
