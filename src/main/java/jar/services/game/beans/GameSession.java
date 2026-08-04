package jar.services.game.beans;

import jar.services.game.enums.GameStatus;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.UUID;

/**
 * Réponse REST adressée à UN joueur : son identité durable ({@code playerId}) et
 * l'état courant de la partie.
 * <p>
 * Contrairement à {@link Lobby} et {@link GameInfo} qui sont diffusés à toute la
 * room, ce bean n'est jamais broadcasté : le {@code playerId} qu'il porte désigne
 * le destinataire de la réponse.
 */
@Getter
@AllArgsConstructor(staticName = "of")
@NoArgsConstructor
public class GameSession {
    private UUID playerId;
    private GameStatus status;
    private GameInfo game;
}
