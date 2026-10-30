package jar.services.game.beans;

import jar.services.game.enums.GameMode;
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
    private GameMode mode;
    // Champs du mode en ligne (vides en local)
    private List<UUID> playerOrder;
    private UUID currentPlayerId;
    private Bid currentBid;
    private List<Bid> roundBids;
    private RoundResult lastRoundResult;
    /** Joueurs partis pendant la manche : leurs dés comptent encore jusqu'à sa résolution */
    private List<Player> departedPlayers;
}
