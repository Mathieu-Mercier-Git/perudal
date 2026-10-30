package jar.services.game.beans;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Getter
@AllArgsConstructor(staticName = "of")
@NoArgsConstructor
public class PlaceBid {
    private String gameCode;
    private UUID playerId;
    private int quantity;
    private int face;
}
