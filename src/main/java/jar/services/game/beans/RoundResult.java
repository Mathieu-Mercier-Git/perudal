package jar.services.game.beans;

import jar.services.game.enums.ChallengeType;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Résultat d'une manche en ligne, calculé par le serveur et diffusé à tous les
 * joueurs. Il est aussi conservé dans la partie pour être restitué à une reconnexion.
 */
@Getter
@AllArgsConstructor(staticName = "of")
@NoArgsConstructor
public class RoundResult {
    private ChallengeType type;
    private UUID challengerId;
    private UUID bidderId;
    private Bid bid;
    private int actualCount;
    /** Nombre de dés par face (1 à 6) sur la table */
    private Map<Integer, Integer> faceCounts;
    /** Les perudos ont-ils compté comme jokers (faux en planificato ou sur une mise en perudos) */
    private boolean jokersCounted;
    private boolean challengerWon;
    /** Variation du nombre de dés des joueurs concernés (-1 / +1) */
    private Map<UUID, Integer> diceChanges;
    private UUID nextStarterId;
    /** Dés de la manche résolue, avant la relance (joueurs partis en cours de manche compris) */
    private List<Player> revealedPlayers;
}
