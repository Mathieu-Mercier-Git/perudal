package jar.services.game.rules;

import jar.services.game.beans.Bid;
import jar.services.game.beans.Player;

import java.util.Collection;

/**
 * Règles de mise du mode en ligne (pures, sans état). Le front applique les mêmes
 * pour guider le joueur, mais c'est le serveur qui fait foi.
 * <p>
 * Face 1 = perudo : joker en manche normale, face comme une autre en planificato.
 */
public final class BidRules {
    public static final int PERUDO = 1;
    private static final int MIN_FACE = 1;
    private static final int MAX_FACE = 6;

    /** En dessous de ce nombre de joueurs encore en jeu, le chiffre exact n'est plus autorisé */
    public static final int MIN_ALIVE_PLAYERS_FOR_EXACT = 3;

    private BidRules() {
        // classe utilitaire
    }

    /**
     * Le « chiffre exact » n'est pas autorisé en manche planificato, ni quand il ne reste
     * que deux joueurs en jeu.
     *
     * @param planificato  manche planificato
     * @param alivePlayers nombre de joueurs ayant encore au moins un dé
     */
    public static boolean isExactAllowed(boolean planificato, long alivePlayers) {
        return !planificato && alivePlayers >= MIN_ALIVE_PLAYERS_FOR_EXACT;
    }

    /**
     * @param previous    mise à battre, null à l'ouverture de la manche
     * @param next        nouvelle mise
     * @param planificato manche planificato : face verrouillée sur celle de l'ouverture
     * @param openingFace face de la mise d'ouverture (utilisée en planificato), null à l'ouverture
     * @param totalDice   nombre total de dés en jeu
     */
    public static boolean isValidBid(Bid previous, Bid next, boolean planificato, Integer openingFace, int totalDice) {
        if (next == null) {
            return false;
        }
        int q = next.getQuantity();
        int f = next.getFace();
        if (q < 1 || q > totalDice || f < MIN_FACE || f > MAX_FACE) {
            return false;
        }

        if (previous == null) { // ouverture : pas de perudos, sauf en planificato
            return planificato || f != PERUDO;
        }

        int pq = previous.getQuantity();
        int pf = previous.getFace();

        if (planificato) {
            int lockedFace = openingFace != null ? openingFace : pf;
            return f == lockedFace && q > pq;
        }

        boolean previousIsPerudo = pf == PERUDO;
        boolean nextIsPerudo = f == PERUDO;
        if (!previousIsPerudo && !nextIsPerudo) {
            return q > pq || (q == pq && f > pf);
        }
        if (!previousIsPerudo) { // classique -> perudo : au moins la moitié arrondie au-dessus
            return q >= ceilHalf(pq);
        }
        if (nextIsPerudo) { // perudo -> perudo
            return q > pq;
        }
        return q >= 2 * pq + 1; // perudo -> classique
    }

    /**
     * Nombre de dés montrant {@code face}, perudos compris comme jokers si la face
     * n'est pas elle-même le perudo et que la manche n'est pas planificato.
     */
    public static int countMatching(Collection<Player> players, int face, boolean planificato) {
        boolean jokers = areJokersCounted(face, planificato);
        return (int) players.stream()
            .flatMap(player -> player.getDices().stream())
            .filter(dice -> dice == face || (jokers && dice == PERUDO))
            .count();
    }

    public static boolean areJokersCounted(int face, boolean planificato) {
        return face != PERUDO && !planificato;
    }

    public static int totalDice(Collection<Player> players) {
        return players.stream().mapToInt(player -> player.getDices().size()).sum();
    }

    private static int ceilHalf(int quantity) {
        return (quantity + 1) / 2;
    }
}
