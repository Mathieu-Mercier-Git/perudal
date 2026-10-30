package jar.services.game.beans;

import lombok.AllArgsConstructor;
import lombok.Getter;

/** Corps de l'évènement socket {@code ROUND_RESULT} : le verdict et l'état de la nouvelle manche */
@Getter
@AllArgsConstructor(staticName = "of")
public class RoundResultMessage {
    private RoundResult result;
    private GameInfo game;
}
