package jar.services.game.beans;

import jar.services.game.enums.GameMode;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Getter
@AllArgsConstructor(staticName = "of")
@NoArgsConstructor
public class SetGameMode {
    private String gameCode;
    private UUID playerId; // l'admin qui change le mode
    private GameMode mode;
}
