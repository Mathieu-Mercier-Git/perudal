package jar.services.game.beans;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Getter
@AllArgsConstructor(staticName="of")
@NoArgsConstructor
public class NewGame {
    private UUID userSocketId;
    private String userName;
    private int diceNumber;
}
