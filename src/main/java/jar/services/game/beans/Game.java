package jar.services.game.beans;

import jar.services.game.enums.GameStatus;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

@Getter
@Setter
@AllArgsConstructor(staticName="of")
@NoArgsConstructor
public class Game {
    /** Joueurs indexés par leur identité durable (playerId), pas par leur socket */
    private Map<UUID, Player> players;
    private int diceNumber;
    private GameStatus status;
    // État du tour courant : conservé ici (et plus seulement diffusé) pour pouvoir
    // le restituer à un joueur qui se reconnecte
    private Boolean isPlanificato;
    private UUID playerIdFinishTurn;
    /** Date de création, utilisée par la purge des parties abandonnées */
    private Instant createdAt;
}
