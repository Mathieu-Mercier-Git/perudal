package jar.services.game.beans;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@AllArgsConstructor(staticName="of")
@NoArgsConstructor
public class StartGame {
    private String gameCode;
    private int diceNumber;
}
