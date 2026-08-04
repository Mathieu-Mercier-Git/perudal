package jar.services.game.beans;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.UUID;

/**
 * Reprise d'une partie après une coupure (verrouillage du téléphone, rechargement
 * de page…). Le {@code playerId} est l'identité durable conservée par le client,
 * le {@code socketId} est la nouvelle connexion à rattacher à la room.
 */
@Getter
@AllArgsConstructor(staticName = "of")
@NoArgsConstructor
public class ReconnectGame {
    private String gameCode;
    private UUID playerId;
    private UUID socketId;
}
