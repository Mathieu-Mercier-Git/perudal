package jar.services.game.rules;

import jar.services.game.beans.Bid;
import jar.services.game.beans.Player;
import org.assertj.core.api.Assertions;
import org.junit.Test;

import java.util.List;
import java.util.UUID;

/** Chaque ligne du tableau de surenchère du SPEC (§3.4), plus les cas limites */
public class BidRulesTest {
    private static final int TOTAL_DICE = 25;

    private static Bid bid(int quantity, int face) {
        return Bid.of(UUID.randomUUID(), quantity, face);
    }

    private static boolean normal(Bid previous, Bid next) {
        return BidRules.isValidBid(previous, next, false, previous == null ? null : previous.getFace(), TOTAL_DICE);
    }

    private static Player player(Integer... dices) {
        return Player.of(UUID.randomUUID(), "p", "🎲", dices.length, List.of(dices), false);
    }

    // Ouverture

    @Test
    public void opening__accepts_any_classic_face() {
        for (int face = 2; face <= 6; face++) {
            Assertions.assertThat(normal(null, bid(1, face))).isTrue();
        }
    }

    @Test
    public void opening__refuses_perudos_in_a_normal_round() {
        Assertions.assertThat(normal(null, bid(3, 1))).isFalse();
    }

    @Test
    public void opening__accepts_perudos_in_planificato() {
        Assertions.assertThat(BidRules.isValidBid(null, bid(1, 1), true, null, TOTAL_DICE)).isTrue();
    }

    // Classique -> classique

    @Test
    public void classic_to_classic__accepts_a_higher_quantity_with_any_face() {
        Assertions.assertThat(normal(bid(4, 5), bid(5, 2))).isTrue();
    }

    @Test
    public void classic_to_classic__accepts_the_same_quantity_with_a_higher_face() {
        Assertions.assertThat(normal(bid(4, 5), bid(4, 6))).isTrue();
    }

    @Test
    public void classic_to_classic__refuses_the_same_quantity_with_a_lower_or_equal_face() {
        Assertions.assertThat(normal(bid(4, 5), bid(4, 4))).isFalse();
        Assertions.assertThat(normal(bid(4, 5), bid(4, 5))).isFalse();
    }

    @Test
    public void classic_to_classic__refuses_a_lower_quantity() {
        Assertions.assertThat(normal(bid(4, 5), bid(3, 6))).isFalse();
    }

    // Classique -> perudo

    @Test
    public void classic_to_perudo__requires_half_the_quantity_rounded_up() {
        Assertions.assertThat(normal(bid(4, 5), bid(2, 1))).isTrue();
        Assertions.assertThat(normal(bid(4, 5), bid(1, 1))).isFalse();
    }

    @Test
    public void classic_to_perudo__rounds_an_odd_quantity_up() {
        Assertions.assertThat(normal(bid(5, 3), bid(3, 1))).isTrue();
        Assertions.assertThat(normal(bid(5, 3), bid(2, 1))).isFalse();
        Assertions.assertThat(normal(bid(1, 3), bid(1, 1))).isTrue();
    }

    // Perudo -> perudo

    @Test
    public void perudo_to_perudo__requires_a_higher_quantity() {
        Assertions.assertThat(normal(bid(4, 1), bid(5, 1))).isTrue();
        Assertions.assertThat(normal(bid(4, 1), bid(4, 1))).isFalse();
    }

    // Perudo -> classique

    @Test
    public void perudo_to_classic__requires_twice_the_quantity_plus_one() {
        Assertions.assertThat(normal(bid(4, 1), bid(9, 3))).isTrue();
        Assertions.assertThat(normal(bid(4, 1), bid(9, 2))).isTrue();
        Assertions.assertThat(normal(bid(4, 1), bid(8, 6))).isFalse();
    }

    // Planificato

    @Test
    public void planificato__locks_the_face_of_the_opening() {
        Assertions.assertThat(BidRules.isValidBid(bid(2, 4), bid(3, 4), true, 4, TOTAL_DICE)).isTrue();
        Assertions.assertThat(BidRules.isValidBid(bid(2, 4), bid(3, 5), true, 4, TOTAL_DICE)).isFalse();
        Assertions.assertThat(BidRules.isValidBid(bid(2, 4), bid(2, 1), true, 4, TOTAL_DICE)).isFalse();
    }

    @Test
    public void planificato__only_allows_a_higher_quantity() {
        Assertions.assertThat(BidRules.isValidBid(bid(2, 4), bid(2, 4), true, 4, TOTAL_DICE)).isFalse();
    }

    @Test
    public void planificato__locks_perudos_too() {
        Assertions.assertThat(BidRules.isValidBid(bid(2, 1), bid(3, 1), true, 1, TOTAL_DICE)).isTrue();
        Assertions.assertThat(BidRules.isValidBid(bid(2, 1), bid(5, 3), true, 1, TOTAL_DICE)).isFalse();
    }

    // Bornes

    @Test
    public void bounds__refuse_a_quantity_above_the_dice_in_play() {
        Assertions.assertThat(BidRules.isValidBid(null, bid(11, 3), false, null, 10)).isFalse();
        Assertions.assertThat(BidRules.isValidBid(null, bid(10, 3), false, null, 10)).isTrue();
    }

    @Test
    public void bounds__refuse_a_null_quantity_or_a_face_out_of_range() {
        Assertions.assertThat(normal(null, bid(0, 3))).isFalse();
        Assertions.assertThat(normal(null, bid(2, 0))).isFalse();
        Assertions.assertThat(normal(null, bid(2, 7))).isFalse();
        Assertions.assertThat(normal(null, null)).isFalse();
    }

    // Comptage

    @Test
    public void countMatching__counts_perudos_as_jokers_in_a_normal_round() {
        List<Player> players = List.of(player(5, 1, 3), player(5, 2, 6));

        Assertions.assertThat(BidRules.countMatching(players, 5, false)).isEqualTo(3);
    }

    @Test
    public void countMatching__ignores_jokers_in_planificato() {
        List<Player> players = List.of(player(5, 1, 3), player(5, 2, 6));

        Assertions.assertThat(BidRules.countMatching(players, 5, true)).isEqualTo(2);
    }

    @Test
    public void countMatching__counts_perudos_once_on_a_perudo_bid() {
        List<Player> players = List.of(player(1, 1, 3), player(5, 1, 6));

        Assertions.assertThat(BidRules.countMatching(players, 1, false)).isEqualTo(3);
    }
}
