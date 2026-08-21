package jar.services.game.beans;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Getter
@AllArgsConstructor(staticName="of")
@NoArgsConstructor
public class KickPlayer {
    private UUID playerId; // l'admin qui exclut
    private UUID kickedPlayerId; // le joueur exclu
    private String gameCode;
}
