package jar.services.game.beans;

import jar.services.game.enums.GameMode;
import jar.services.game.enums.GameStatus;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Getter
@Setter
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

    private GameMode mode = GameMode.LOCAL;
    // État propre au mode en ligne (inutilisé en local)
    /** Ordre de jeu fixe, tiré au sort au lancement */
    private List<UUID> playerOrder = new ArrayList<>();
    private UUID currentPlayerId;
    /** Mise à battre, null en début de manche */
    private Bid currentBid;
    /** Mises de la manche en cours, dans l'ordre */
    private List<Bid> roundBids = new ArrayList<>();
    private RoundResult lastRoundResult;
    /**
     * Joueurs partis pendant la manche en cours : leurs dés restent comptés jusqu'à
     * la résolution de la manche, mais ils ne peuvent plus perdre ni gagner de dé.
     * Ils restent aussi dans {@link #playerOrder} jusque-là, pour savoir qui ouvre
     * la manche suivante si le perdant désigné est l'un d'eux.
     */
    private Map<UUID, Player> departedPlayers = new LinkedHashMap<>();
    /**
     * Joueurs ayant quitté la partie en cours, dans l'ordre des départs. Affichage
     * seulement (« a quitté la partie ») : ils n'ont plus de dés et ne jouent plus.
     * Commun aux modes local et en ligne.
     */
    private List<Player> leftPlayers = new ArrayList<>();

    public static Game of(Map<UUID, Player> players, int diceNumber, GameStatus status, Boolean isPlanificato,
                          UUID playerIdFinishTurn, Instant createdAt) {
        Game game = new Game();
        game.setPlayers(players);
        game.setDiceNumber(diceNumber);
        game.setStatus(status);
        game.setIsPlanificato(isPlanificato);
        game.setPlayerIdFinishTurn(playerIdFinishTurn);
        game.setCreatedAt(createdAt);
        return game;
    }
}
