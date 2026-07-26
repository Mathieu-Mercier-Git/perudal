package jar.services.game.beans;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;
import java.util.UUID;

@Getter
@Setter
@AllArgsConstructor(staticName="of")
@NoArgsConstructor
public class GameInfo {
    private List<Player> players;
    private int diceNumber;
    private String gameCode;
    private Boolean isPlanificato;
    private UUID playerIdFinishTurn;
}
