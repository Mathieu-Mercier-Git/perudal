package jar.services.game;

import com.coreoz.plume.jersey.errors.WsError;
import com.coreoz.plume.jersey.errors.WsException;
import jar.services.game.beans.ActionGame;
import jar.services.game.beans.Challenge;
import jar.services.game.beans.Game;
import jar.services.game.beans.GameInfo;
import jar.services.game.beans.GameSession;
import jar.services.game.beans.JoinGame;
import jar.services.game.beans.NewGame;
import jar.services.game.beans.PlaceBid;
import jar.services.game.beans.Player;
import jar.services.game.beans.ReconnectGame;
import jar.services.game.beans.RoundResult;
import jar.services.game.beans.SetGameMode;
import jar.services.game.beans.StartGame;
import jar.services.game.beans.TurnInfo;
import jar.services.game.enums.ChallengeType;
import jar.services.game.enums.GameMode;
import jar.services.game.enums.GameStatus;
import jar.services.socket.SocketService;
import jar.services.utils.ParserService;
import jar.webservices.api.errors.CustomWsError;
import org.assertj.core.api.Assertions;
import org.assertj.core.api.ThrowableAssert;
import org.junit.Test;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Mode en ligne : ordre de jeu, tours, mises et résolution des manches par le serveur.
 * Les dés sont imposés à la main après le lancement pour rendre les verdicts déterministes.
 */
public class OnlineGameServiceTest {
    private static final int DICE_NUMBER = 5;

    private final GameService gameService = new GameService(new SocketService(new ParserService()));

    /** Partie de test : les joueurs sont rangés dans l'ordre de jeu, le premier commence */
    private static class TestGame {
        private String gameCode;
        private List<UUID> playerIds = new ArrayList<>();

        UUID player(int position) {
            return playerIds.get(position - 1);
        }
    }

    private TestGame newGame(GameMode mode, int playerCount) {
        TestGame testGame = new TestGame();
        GameSession adminSession = gameService.createGame(NewGame.of(UUID.randomUUID(), "Joueur 1", "🦊", DICE_NUMBER));
        testGame.gameCode = adminSession.getGame().getGameCode();
        testGame.playerIds.add(adminSession.getPlayerId());
        for (int i = 2; i <= playerCount; i++) {
            GameSession session = gameService.joinGame(JoinGame.of(UUID.randomUUID(), "Joueur " + i, "🐸", testGame.gameCode));
            testGame.playerIds.add(session.getPlayerId());
        }
        gameService.setMode(SetGameMode.of(testGame.gameCode, adminSession.getPlayerId(), mode));
        return testGame;
    }

    /** Lance la partie puis impose un ordre connu : joueur 1, 2, 3… et le joueur 1 commence */
    private TestGame startedOnlineGame(int playerCount) {
        TestGame testGame = newGame(GameMode.ONLINE, playerCount);
        gameService.startGame(StartGame.of(testGame.gameCode, DICE_NUMBER));
        Game game = game(testGame);
        game.setPlayerOrder(new ArrayList<>(testGame.playerIds));
        game.setCurrentPlayerId(testGame.player(1));
        game.setPlayerIdFinishTurn(testGame.player(1));
        return testGame;
    }

    private Game game(TestGame testGame) {
        return gameService.getGames().get(testGame.gameCode);
    }

    private Player player(TestGame testGame, int position) {
        return game(testGame).getPlayers().get(testGame.player(position));
    }

    private void setDices(TestGame testGame, int position, Integer... dices) {
        Player player = player(testGame, position);
        player.setDices(new ArrayList<>(List.of(dices)));
        player.setDiceNumber(dices.length);
    }

    private void bid(TestGame testGame, int position, int quantity, int face) {
        gameService.placeBid(PlaceBid.of(testGame.gameCode, testGame.player(position), quantity, face));
    }

    private void challenge(TestGame testGame, int position, ChallengeType type) {
        gameService.challenge(Challenge.of(testGame.gameCode, testGame.player(position), type));
    }

    private static void assertError(ThrowableAssert.ThrowingCallable action, WsError error) {
        Assertions.assertThatThrownBy(action)
            .isInstanceOf(WsException.class)
            .satisfies(exception -> Assertions.assertThat(((WsException) exception).getError()).isEqualTo(error));
    }

    // Lobby et lancement

    @Test
    public void setMode__switches_the_lobby_to_online() {
        TestGame testGame = newGame(GameMode.ONLINE, 2);

        Assertions.assertThat(game(testGame).getMode()).isEqualTo(GameMode.ONLINE);
    }

    @Test
    public void setMode__is_refused_to_a_non_admin_player() {
        TestGame testGame = newGame(GameMode.LOCAL, 2);

        assertError(
            () -> gameService.setMode(SetGameMode.of(testGame.gameCode, testGame.player(2), GameMode.ONLINE)),
            CustomWsError.NOT_GAME_ADMIN
        );
    }

    @Test
    public void setMode__is_refused_once_the_game_has_started() {
        TestGame testGame = startedOnlineGame(2);

        assertError(
            () -> gameService.setMode(SetGameMode.of(testGame.gameCode, testGame.player(1), GameMode.LOCAL)),
            CustomWsError.GAME_ALREADY_STARTED
        );
    }

    @Test
    public void startGame__generates_a_fixed_order_with_every_player_once() {
        TestGame testGame = newGame(GameMode.ONLINE, 4);

        gameService.startGame(StartGame.of(testGame.gameCode, DICE_NUMBER));

        Game game = game(testGame);
        Assertions.assertThat(game.getPlayerOrder()).containsExactlyInAnyOrderElementsOf(testGame.playerIds);
        Assertions.assertThat(game.getCurrentPlayerId()).isEqualTo(game.getPlayerOrder().get(0));
        Assertions.assertThat(game.getPlayerIdFinishTurn()).isEqualTo(game.getPlayerOrder().get(0));
        Assertions.assertThat(game.getCurrentBid()).isNull();
        Assertions.assertThat(game.getRoundBids()).isEmpty();
    }

    @Test
    public void startGame__is_refused_to_a_single_player_in_both_modes() {
        for (GameMode mode : GameMode.values()) {
            TestGame testGame = newGame(mode, 1);

            assertError(
                () -> gameService.startGame(StartGame.of(testGame.gameCode, DICE_NUMBER)),
                CustomWsError.NOT_ENOUGH_PLAYERS
            );
        }
    }

    @Test
    public void joinGame__is_refused_once_the_game_has_started() {
        TestGame testGame = startedOnlineGame(2);

        assertError(
            () -> gameService.joinGame(JoinGame.of(UUID.randomUUID(), "Retard", "🐢", testGame.gameCode)),
            CustomWsError.GAME_ALREADY_STARTED
        );
    }

    // Tours et mises

    @Test
    public void placeBid__records_the_bid_and_passes_to_the_next_player() {
        TestGame testGame = startedOnlineGame(3);

        bid(testGame, 1, 2, 4);

        Game game = game(testGame);
        Assertions.assertThat(game.getCurrentBid().getQuantity()).isEqualTo(2);
        Assertions.assertThat(game.getCurrentBid().getFace()).isEqualTo(4);
        Assertions.assertThat(game.getRoundBids()).hasSize(1);
        Assertions.assertThat(game.getCurrentPlayerId()).isEqualTo(testGame.player(2));
    }

    @Test
    public void placeBid__loops_back_to_the_first_player() {
        TestGame testGame = startedOnlineGame(2);

        bid(testGame, 1, 2, 4);
        bid(testGame, 2, 3, 4);

        Assertions.assertThat(game(testGame).getCurrentPlayerId()).isEqualTo(testGame.player(1));
    }

    @Test
    public void placeBid__skips_eliminated_players() {
        TestGame testGame = startedOnlineGame(3);
        setDices(testGame, 2);

        bid(testGame, 1, 2, 4);

        Assertions.assertThat(game(testGame).getCurrentPlayerId()).isEqualTo(testGame.player(3));
    }

    @Test
    public void placeBid__is_refused_out_of_turn() {
        TestGame testGame = startedOnlineGame(3);

        assertError(() -> bid(testGame, 2, 2, 4), CustomWsError.NOT_YOUR_TURN);
    }

    @Test
    public void placeBid__is_refused_when_too_weak() {
        TestGame testGame = startedOnlineGame(3);
        bid(testGame, 1, 4, 5);

        assertError(() -> bid(testGame, 2, 4, 4), CustomWsError.INVALID_BID);
        Assertions.assertThat(game(testGame).getCurrentPlayerId()).isEqualTo(testGame.player(2));
    }

    @Test
    public void placeBid__refuses_an_opening_in_perudos() {
        TestGame testGame = startedOnlineGame(2);

        assertError(() -> bid(testGame, 1, 2, 1), CustomWsError.INVALID_BID);
    }

    @Test
    public void placeBid__refuses_more_dice_than_on_the_table() {
        TestGame testGame = startedOnlineGame(2);

        assertError(() -> bid(testGame, 1, 2 * DICE_NUMBER + 1, 3), CustomWsError.INVALID_BID);
    }

    @Test
    public void placeBid__locks_the_face_in_planificato() {
        TestGame testGame = startedOnlineGame(2);
        game(testGame).setIsPlanificato(true);
        bid(testGame, 1, 2, 1); // ouverture en perudos autorisée en planificato

        assertError(() -> bid(testGame, 2, 5, 3), CustomWsError.INVALID_BID);
        bid(testGame, 2, 3, 1);
    }

    @Test
    public void placeBid__is_refused_in_local_mode() {
        TestGame testGame = newGame(GameMode.LOCAL, 2);
        gameService.startGame(StartGame.of(testGame.gameCode, DICE_NUMBER));

        assertError(() -> bid(testGame, 1, 2, 4), CustomWsError.WRONG_GAME_MODE);
    }

    @Test
    public void placeBid__is_refused_before_the_game_starts() {
        TestGame testGame = newGame(GameMode.ONLINE, 2);

        assertError(() -> bid(testGame, 1, 2, 4), CustomWsError.GAME_NOT_STARTED);
    }

    @Test
    public void challenge__is_refused_without_a_bid() {
        TestGame testGame = startedOnlineGame(2);

        assertError(() -> challenge(testGame, 1, ChallengeType.LIAR), CustomWsError.NO_BID_TO_CHALLENGE);
    }

    @Test
    public void challenge__is_refused_out_of_turn() {
        TestGame testGame = startedOnlineGame(3);
        bid(testGame, 1, 2, 4);

        assertError(() -> challenge(testGame, 3, ChallengeType.LIAR), CustomWsError.NOT_YOUR_TURN);
    }

    // Menteur

    @Test
    public void nextRound__clears_the_round_result_for_the_admin() {
        TestGame testGame = startedOnlineGame(2);
        bid(testGame, 1, 1, 2);
        challenge(testGame, 2, ChallengeType.LIAR);

        gameService.nextRound(ActionGame.of(testGame.player(1), testGame.gameCode));

        Assertions.assertThat(game(testGame).getLastRoundResult()).isNull();
    }

    @Test
    public void nextRound__is_refused_to_a_non_admin_player() {
        TestGame testGame = startedOnlineGame(2);
        bid(testGame, 1, 1, 2);
        challenge(testGame, 2, ChallengeType.LIAR);

        assertError(
            () -> gameService.nextRound(ActionGame.of(testGame.player(2), testGame.gameCode)),
            CustomWsError.NOT_GAME_ADMIN
        );
        Assertions.assertThat(game(testGame).getLastRoundResult()).isNotNull();
    }

    @Test
    public void nextRound__is_refused_in_local_mode() {
        TestGame testGame = startedLocalGame(2);

        assertError(
            () -> gameService.nextRound(ActionGame.of(testGame.player(1), testGame.gameCode)),
            CustomWsError.WRONG_GAME_MODE
        );
    }

    @Test
    public void reconnect__restores_the_round_result_until_the_admin_goes_on() {
        TestGame testGame = startedOnlineGame(2);
        bid(testGame, 1, 1, 2);
        challenge(testGame, 2, ChallengeType.LIAR);
        ReconnectGame reconnectGame = ReconnectGame.of(testGame.gameCode, testGame.player(2), UUID.randomUUID());

        Assertions.assertThat(gameService.reconnect(reconnectGame).getGame().getLastRoundResult()).isNotNull();

        gameService.nextRound(ActionGame.of(testGame.player(1), testGame.gameCode));

        Assertions.assertThat(gameService.reconnect(reconnectGame).getGame().getLastRoundResult()).isNull();
    }

    @Test
    public void liar__won_makes_the_bidder_lose_a_dice_and_open_the_next_round() {
        TestGame testGame = startedOnlineGame(2);
        setDices(testGame, 1, 5, 1, 3, 6, 2);
        setDices(testGame, 2, 5, 4, 4, 6, 3);
        bid(testGame, 1, 4, 5); // 2 « 5 » + 1 perudo = 3

        challenge(testGame, 2, ChallengeType.LIAR);

        Game game = game(testGame);
        RoundResult result = game.getLastRoundResult();
        Assertions.assertThat(result.getActualCount()).isEqualTo(3);
        Assertions.assertThat(result.isJokersCounted()).isTrue();
        Assertions.assertThat(result.isChallengerWon()).isTrue();
        Assertions.assertThat(result.getDiceChanges()).containsExactly(Assertions.entry(testGame.player(1), -1));
        Assertions.assertThat(result.getNextStarterId()).isEqualTo(testGame.player(1));
        Assertions.assertThat(result.getFaceCounts()).containsEntry(5, 2).containsEntry(1, 1).containsEntry(4, 2);
        Assertions.assertThat(player(testGame, 1).getDiceNumber()).isEqualTo(4);
        Assertions.assertThat(player(testGame, 1).getDices()).hasSize(4);
        Assertions.assertThat(game.getCurrentPlayerId()).isEqualTo(testGame.player(1));
        Assertions.assertThat(game.getCurrentBid()).isNull();
        Assertions.assertThat(game.getRoundBids()).isEmpty();
    }

    @Test
    public void liar__reveals_the_dices_of_the_resolved_round() {
        TestGame testGame = startedOnlineGame(2);
        setDices(testGame, 1, 5, 1, 3, 6, 2);
        setDices(testGame, 2, 5, 4, 4, 6, 3);
        bid(testGame, 1, 4, 5);

        challenge(testGame, 2, ChallengeType.LIAR);

        Assertions.assertThat(game(testGame).getLastRoundResult().getRevealedPlayers())
            .filteredOn(revealed -> revealed.getId().equals(testGame.player(1)))
            .singleElement()
            .satisfies(revealed -> Assertions.assertThat(revealed.getDices()).containsExactly(5, 1, 3, 6, 2));
    }

    @Test
    public void liar__lost_makes_the_challenger_lose_a_dice() {
        TestGame testGame = startedOnlineGame(2);
        setDices(testGame, 1, 5, 1, 3, 6, 2);
        setDices(testGame, 2, 5, 4, 4, 6, 3);
        bid(testGame, 1, 3, 5); // exactement 3 : la mise était bonne

        challenge(testGame, 2, ChallengeType.LIAR);

        RoundResult result = game(testGame).getLastRoundResult();
        Assertions.assertThat(result.isChallengerWon()).isFalse();
        Assertions.assertThat(player(testGame, 2).getDiceNumber()).isEqualTo(4);
        Assertions.assertThat(player(testGame, 1).getDiceNumber()).isEqualTo(5);
        Assertions.assertThat(result.getNextStarterId()).isEqualTo(testGame.player(2));
    }

    @Test
    public void liar__does_not_count_perudos_as_jokers_in_planificato() {
        TestGame testGame = startedOnlineGame(2);
        game(testGame).setIsPlanificato(true);
        setDices(testGame, 1, 5, 1, 3, 6, 2);
        setDices(testGame, 2, 5, 4, 4, 6, 3);
        bid(testGame, 1, 3, 5); // 2 « 5 » seulement : les perudos ne comptent pas

        challenge(testGame, 2, ChallengeType.LIAR);

        RoundResult result = game(testGame).getLastRoundResult();
        Assertions.assertThat(result.getActualCount()).isEqualTo(2);
        Assertions.assertThat(result.isJokersCounted()).isFalse();
        Assertions.assertThat(result.isChallengerWon()).isTrue();
    }

    @Test
    public void liar__on_perudos_counts_perudos_only_once() {
        TestGame testGame = startedOnlineGame(2);
        setDices(testGame, 1, 1, 1, 3, 6, 2);
        setDices(testGame, 2, 5, 4, 4, 6, 3);
        bid(testGame, 1, 3, 2);
        bid(testGame, 2, 2, 1); // 2 perudos : il y en a 2

        challenge(testGame, 1, ChallengeType.LIAR);

        RoundResult result = game(testGame).getLastRoundResult();
        Assertions.assertThat(result.getActualCount()).isEqualTo(2);
        Assertions.assertThat(result.isJokersCounted()).isFalse();
        Assertions.assertThat(result.isChallengerWon()).isFalse();
    }

    @Test
    public void liar__makes_the_next_round_planificato_when_the_loser_falls_to_one_dice() {
        TestGame testGame = startedOnlineGame(2);
        setDices(testGame, 1, 5, 3);
        setDices(testGame, 2, 4, 4, 6);
        bid(testGame, 1, 3, 5);

        challenge(testGame, 2, ChallengeType.LIAR);

        Assertions.assertThat(player(testGame, 1).getDiceNumber()).isEqualTo(1);
        Assertions.assertThat(game(testGame).getIsPlanificato()).isTrue();
    }

    @Test
    public void liar__result_tells_the_resolved_round_was_planificato_even_on_a_bid_of_ones() {
        TestGame testGame = startedOnlineGame(2);
        game(testGame).setIsPlanificato(true);
        setDices(testGame, 1, 1, 1, 3, 6, 2);
        setDices(testGame, 2, 5, 4, 4, 6, 3);
        bid(testGame, 1, 2, 1);

        challenge(testGame, 2, ChallengeType.LIAR);

        RoundResult result = game(testGame).getLastRoundResult();
        Assertions.assertThat(result.isPlanificato()).isTrue();
        Assertions.assertThat(game(testGame).getIsPlanificato()).isFalse();
    }

    @Test
    public void liar__result_is_not_planificato_when_only_the_next_round_is() {
        TestGame testGame = startedOnlineGame(2);
        setDices(testGame, 1, 5, 3);
        setDices(testGame, 2, 4, 4, 6);
        bid(testGame, 1, 3, 5);

        challenge(testGame, 2, ChallengeType.LIAR);

        Assertions.assertThat(game(testGame).getLastRoundResult().isPlanificato()).isFalse();
        Assertions.assertThat(game(testGame).getIsPlanificato()).isTrue();
    }

    @Test
    public void liar__lets_the_next_alive_player_open_when_the_loser_is_eliminated() {
        TestGame testGame = startedOnlineGame(3);
        setDices(testGame, 1, 3, 3);
        setDices(testGame, 2, 4);
        setDices(testGame, 3, 6, 6);
        bid(testGame, 1, 2, 3);
        bid(testGame, 2, 3, 3); // il n'y a que 2 « 3 »

        challenge(testGame, 3, ChallengeType.LIAR);

        Game game = game(testGame);
        Assertions.assertThat(player(testGame, 2).getDiceNumber()).isZero();
        Assertions.assertThat(player(testGame, 2).getDices()).isEmpty();
        Assertions.assertThat(game.getLastRoundResult().getNextStarterId()).isEqualTo(testGame.player(3));
        Assertions.assertThat(game.getCurrentPlayerId()).isEqualTo(testGame.player(3));
    }

    @Test
    public void liar__can_end_the_game() {
        TestGame testGame = startedOnlineGame(2);
        setDices(testGame, 1, 3, 3);
        setDices(testGame, 2, 4);
        bid(testGame, 1, 2, 3);
        bid(testGame, 2, 3, 3); // il n'y a que 2 « 3 » : le joueur 2 perd son dernier dé

        challenge(testGame, 1, ChallengeType.LIAR);

        List<Player> playersWithDices = game(testGame).getPlayers().values().stream()
            .filter(player -> player.getDiceNumber() > 0)
            .toList();
        Assertions.assertThat(playersWithDices).extracting(Player::getId).containsExactly(testGame.player(1));
    }

    // Chiffre exact

    @Test
    public void exact__won_below_the_maximum_gives_a_dice() {
        TestGame testGame = startedOnlineGame(3);
        setDices(testGame, 1, 5, 1, 3, 6, 2);
        setDices(testGame, 2, 5, 4, 4, 6);
        setDices(testGame, 3, 2, 3, 4, 6, 6);
        bid(testGame, 1, 3, 5);

        challenge(testGame, 2, ChallengeType.EXACT);

        RoundResult result = game(testGame).getLastRoundResult();
        Assertions.assertThat(result.isChallengerWon()).isTrue();
        Assertions.assertThat(result.getDiceChanges()).containsExactly(Assertions.entry(testGame.player(2), 1));
        Assertions.assertThat(player(testGame, 2).getDiceNumber()).isEqualTo(DICE_NUMBER);
        Assertions.assertThat(player(testGame, 1).getDiceNumber()).isEqualTo(DICE_NUMBER);
        Assertions.assertThat(result.getNextStarterId()).isEqualTo(testGame.player(2));
    }

    @Test
    public void exact__won_at_the_maximum_makes_every_other_alive_player_lose_a_dice() {
        TestGame testGame = startedOnlineGame(3);
        setDices(testGame, 1, 5, 1, 3, 6, 2);
        setDices(testGame, 2, 5, 4, 4, 6, 3);
        setDices(testGame, 3, 2, 2);
        bid(testGame, 1, 3, 5);

        challenge(testGame, 2, ChallengeType.EXACT);

        RoundResult result = game(testGame).getLastRoundResult();
        Assertions.assertThat(player(testGame, 2).getDiceNumber()).isEqualTo(DICE_NUMBER);
        Assertions.assertThat(player(testGame, 1).getDiceNumber()).isEqualTo(4);
        Assertions.assertThat(player(testGame, 3).getDiceNumber()).isEqualTo(1);
        Assertions.assertThat(result.getDiceChanges())
            .containsEntry(testGame.player(1), -1)
            .containsEntry(testGame.player(3), -1)
            .doesNotContainKey(testGame.player(2));
        // Règle conservée du mode local : ce cas ne déclenche pas le planificato
        Assertions.assertThat(game(testGame).getIsPlanificato()).isFalse();
    }

    @Test
    public void exact__won_at_the_maximum_does_not_touch_eliminated_players() {
        TestGame testGame = startedOnlineGame(4);
        setDices(testGame, 1, 5, 1, 3, 6, 2);
        setDices(testGame, 2, 5, 4, 4, 6, 3);
        setDices(testGame, 3, 2, 2);
        setDices(testGame, 4);
        bid(testGame, 1, 3, 5);

        challenge(testGame, 2, ChallengeType.EXACT);

        Assertions.assertThat(player(testGame, 4).getDiceNumber()).isZero();
    }

    @Test
    public void exact__lost_takes_a_dice_from_the_announcer_who_opens_the_next_round() {
        TestGame testGame = startedOnlineGame(3);
        setDices(testGame, 1, 5, 1, 3, 6, 2);
        setDices(testGame, 2, 5, 4, 4, 6, 3);
        setDices(testGame, 3, 2, 3, 4, 6, 6);
        bid(testGame, 1, 4, 5); // il y en a 3

        challenge(testGame, 2, ChallengeType.EXACT);

        RoundResult result = game(testGame).getLastRoundResult();
        Assertions.assertThat(result.isChallengerWon()).isFalse();
        Assertions.assertThat(player(testGame, 2).getDiceNumber()).isEqualTo(4);
        Assertions.assertThat(result.getNextStarterId()).isEqualTo(testGame.player(2));
    }

    @Test
    public void exact__is_refused_when_only_two_players_are_left() {
        TestGame testGame = startedOnlineGame(2);
        bid(testGame, 1, 3, 5);

        assertError(() -> challenge(testGame, 2, ChallengeType.EXACT), CustomWsError.EXACT_NOT_ALLOWED);
        Assertions.assertThat(game(testGame).getLastRoundResult()).isNull();
    }

    @Test
    public void exact__is_refused_when_eliminated_players_leave_only_two_players() {
        TestGame testGame = startedOnlineGame(3);
        setDices(testGame, 3);
        bid(testGame, 1, 3, 5);

        assertError(() -> challenge(testGame, 2, ChallengeType.EXACT), CustomWsError.EXACT_NOT_ALLOWED);
    }

    @Test
    public void exact__is_refused_in_planificato() {
        TestGame testGame = startedOnlineGame(3);
        game(testGame).setIsPlanificato(true);
        bid(testGame, 1, 3, 5);

        assertError(() -> challenge(testGame, 2, ChallengeType.EXACT), CustomWsError.EXACT_NOT_ALLOWED);
        Assertions.assertThat(game(testGame).getLastRoundResult()).isNull();
    }

    // Départ d'un joueur

    @Test
    public void quit__by_the_current_player_passes_the_turn_and_keeps_the_bid() {
        TestGame testGame = startedOnlineGame(3);
        bid(testGame, 1, 2, 4);

        gameService.quitGame(ActionGame.of(testGame.player(2), testGame.gameCode));

        Game game = game(testGame);
        Assertions.assertThat(game.getCurrentPlayerId()).isEqualTo(testGame.player(3));
        Assertions.assertThat(game.getCurrentBid().getQuantity()).isEqualTo(2);
    }

    @Test
    public void quit__keeps_the_dices_of_the_departed_player_counted_until_the_end_of_the_round() {
        TestGame testGame = startedOnlineGame(3);
        setDices(testGame, 1, 2, 2);
        setDices(testGame, 2, 5, 5, 5);
        setDices(testGame, 3, 4, 4);
        bid(testGame, 1, 3, 5);
        gameService.quitGame(ActionGame.of(testGame.player(1), testGame.gameCode));
        bid(testGame, 2, 4, 5);

        challenge(testGame, 3, ChallengeType.LIAR); // 3 « 5 » sur la table : le joueur 2 bluffait

        RoundResult result = game(testGame).getLastRoundResult();
        Assertions.assertThat(result.getActualCount()).isEqualTo(3);
        Assertions.assertThat(result.getRevealedPlayers()).extracting(Player::getId).contains(testGame.player(1));
        Assertions.assertThat(game(testGame).getPlayerOrder()).doesNotContain(testGame.player(1));
        Assertions.assertThat(game(testGame).getDepartedPlayers()).isEmpty();
    }

    @Test
    public void quit__a_departed_loser_loses_nothing_and_the_next_alive_player_opens() {
        TestGame testGame = startedOnlineGame(3);
        setDices(testGame, 1, 2, 2);
        setDices(testGame, 2, 3, 3);
        setDices(testGame, 3, 4, 4);
        bid(testGame, 1, 3, 5); // il n'y a aucun « 5 »
        bid(testGame, 2, 4, 5);
        gameService.quitGame(ActionGame.of(testGame.player(2), testGame.gameCode));

        challenge(testGame, 3, ChallengeType.LIAR);

        RoundResult result = game(testGame).getLastRoundResult();
        Assertions.assertThat(result.isChallengerWon()).isTrue();
        Assertions.assertThat(result.getDiceChanges()).isEmpty();
        Assertions.assertThat(result.getNextStarterId()).isEqualTo(testGame.player(3));
        Assertions.assertThat(player(testGame, 1).getDiceNumber()).isEqualTo(2);
        Assertions.assertThat(player(testGame, 3).getDiceNumber()).isEqualTo(2);
    }

    @Test
    public void quit__hides_the_departed_player_from_the_broadcast_order() {
        TestGame testGame = startedOnlineGame(3);
        gameService.quitGame(ActionGame.of(testGame.player(3), testGame.gameCode));

        GameSession session = gameService.reconnect(ReconnectGame.of(testGame.gameCode, testGame.player(1), UUID.randomUUID()));

        Assertions.assertThat(session.getGame().getPlayerOrder()).containsExactly(testGame.player(1), testGame.player(2));
        Assertions.assertThat(session.getGame().getDepartedPlayers()).extracting(Player::getId).containsExactly(testGame.player(3));
    }

    // Reconnexion

    @Test
    public void reconnect__restores_the_online_round() {
        TestGame testGame = startedOnlineGame(3);
        bid(testGame, 1, 2, 4);

        GameSession session = gameService.reconnect(ReconnectGame.of(testGame.gameCode, testGame.player(3), UUID.randomUUID()));

        GameInfo gameInfo = session.getGame();
        Assertions.assertThat(session.getStatus()).isEqualTo(GameStatus.IN_GAME);
        Assertions.assertThat(gameInfo.getMode()).isEqualTo(GameMode.ONLINE);
        Assertions.assertThat(gameInfo.getPlayerOrder()).containsExactlyElementsOf(testGame.playerIds);
        Assertions.assertThat(gameInfo.getCurrentPlayerId()).isEqualTo(testGame.player(2));
        Assertions.assertThat(gameInfo.getCurrentBid().getQuantity()).isEqualTo(2);
        Assertions.assertThat(gameInfo.getRoundBids()).hasSize(1);
    }

    // Garde-fous et non-régression du mode local

    @Test
    public void finishTurn__is_refused_in_online_mode() {
        TestGame testGame = startedOnlineGame(2);

        assertError(
            () -> gameService.finishTurn(TurnInfo.of(testGame.gameCode, testGame.player(1), true)),
            CustomWsError.WRONG_GAME_MODE
        );
    }

    @Test
    public void rollDices__is_refused_in_online_mode() {
        TestGame testGame = startedOnlineGame(2);

        assertError(
            () -> gameService.rollDices(ActionGame.of(testGame.player(1), testGame.gameCode)),
            CustomWsError.WRONG_GAME_MODE
        );
    }

    private TestGame startedLocalGame(int playerCount) {
        TestGame testGame = newGame(GameMode.LOCAL, playerCount);
        gameService.startGame(StartGame.of(testGame.gameCode, DICE_NUMBER));
        return testGame;
    }

    @Test
    public void local__a_new_game_is_local_without_online_state() {
        TestGame testGame = startedLocalGame(2);

        Game game = game(testGame);
        Assertions.assertThat(game.getMode()).isEqualTo(GameMode.LOCAL);
        Assertions.assertThat(game.getPlayerOrder()).isEmpty();
        Assertions.assertThat(game.getCurrentPlayerId()).isNull();
        Assertions.assertThat(game.getPlayerIdFinishTurn()).isIn(testGame.playerIds);
        Assertions.assertThat(player(testGame, 1).getDices()).hasSize(DICE_NUMBER);
    }

    @Test
    public void local__finishTurn_lost_removes_a_dice_and_sets_planificato_at_one_dice() {
        TestGame testGame = startedLocalGame(2);
        setDices(testGame, 1, 2, 3);

        gameService.finishTurn(TurnInfo.of(testGame.gameCode, testGame.player(1), true));

        Game game = game(testGame);
        Assertions.assertThat(player(testGame, 1).getDiceNumber()).isEqualTo(1);
        Assertions.assertThat(player(testGame, 1).getDices()).hasSize(1);
        Assertions.assertThat(game.getIsPlanificato()).isTrue();
        Assertions.assertThat(game.getPlayerIdFinishTurn()).isEqualTo(testGame.player(1));
    }

    @Test
    public void local__finishTurn_exact_below_the_maximum_gives_a_dice() {
        TestGame testGame = startedLocalGame(3);
        setDices(testGame, 1, 2, 3);

        gameService.finishTurn(TurnInfo.of(testGame.gameCode, testGame.player(1), false));

        Assertions.assertThat(player(testGame, 1).getDiceNumber()).isEqualTo(3);
        Assertions.assertThat(player(testGame, 2).getDiceNumber()).isEqualTo(DICE_NUMBER);
        Assertions.assertThat(game(testGame).getIsPlanificato()).isFalse();
    }

    @Test
    public void local__finishTurn_exact_at_the_maximum_removes_a_dice_from_players_still_in_game() {
        TestGame testGame = startedLocalGame(4);
        setDices(testGame, 4);

        gameService.finishTurn(TurnInfo.of(testGame.gameCode, testGame.player(1), false));

        Assertions.assertThat(player(testGame, 1).getDiceNumber()).isEqualTo(DICE_NUMBER);
        Assertions.assertThat(player(testGame, 2).getDiceNumber()).isEqualTo(DICE_NUMBER - 1);
        Assertions.assertThat(player(testGame, 3).getDiceNumber()).isEqualTo(DICE_NUMBER - 1);
        Assertions.assertThat(player(testGame, 4).getDiceNumber()).isZero();
    }

    @Test
    public void local__finishTurn_exact_is_refused_with_two_players_left() {
        TestGame testGame = startedLocalGame(2);

        assertError(
            () -> gameService.finishTurn(TurnInfo.of(testGame.gameCode, testGame.player(1), false)),
            CustomWsError.EXACT_NOT_ALLOWED
        );
        Assertions.assertThat(player(testGame, 1).getDiceNumber()).isEqualTo(DICE_NUMBER);
    }

    @Test
    public void local__finishTurn_exact_is_refused_in_planificato() {
        TestGame testGame = startedLocalGame(3);
        game(testGame).setIsPlanificato(true);

        assertError(
            () -> gameService.finishTurn(TurnInfo.of(testGame.gameCode, testGame.player(1), false)),
            CustomWsError.EXACT_NOT_ALLOWED
        );
    }

    @Test
    public void local__rollDices_rerolls_without_changing_the_dice_numbers() {
        TestGame testGame = startedLocalGame(2);

        gameService.rollDices(ActionGame.of(testGame.player(1), testGame.gameCode));

        Assertions.assertThat(player(testGame, 1).getDices()).hasSize(DICE_NUMBER);
        Assertions.assertThat(player(testGame, 2).getDiceNumber()).isEqualTo(DICE_NUMBER);
    }

    @Test
    public void local__quit_during_the_game_does_not_touch_the_online_state() {
        TestGame testGame = startedLocalGame(3);

        gameService.quitGame(ActionGame.of(testGame.player(2), testGame.gameCode));

        Assertions.assertThat(game(testGame).getPlayers()).doesNotContainKey(testGame.player(2));
        Assertions.assertThat(game(testGame).getDepartedPlayers()).isEmpty();
    }
}
