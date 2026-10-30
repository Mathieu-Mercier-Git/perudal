package jar.services.game.beans;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.UUID;

/** Mise d'un joueur : {@code quantity} dés montrant {@code face} (1 = perudo) */
@Getter
@AllArgsConstructor(staticName = "of")
@NoArgsConstructor
public class Bid {
    private UUID playerId;
    private int quantity;
    private int face;
}
