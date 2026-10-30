package jar.services.game.beans;

import jar.services.game.enums.ChallengeType;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Getter
@AllArgsConstructor(staticName = "of")
@NoArgsConstructor
public class Challenge {
    private String gameCode;
    private UUID playerId;
    private ChallengeType type;
}
