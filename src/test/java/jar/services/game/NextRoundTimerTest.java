package jar.services.game;

import jar.services.game.beans.ActionGame;
import jar.services.game.beans.Challenge;
import jar.services.game.beans.Game;
import jar.services.game.beans.GameSession;
import jar.services.game.beans.JoinGame;
import jar.services.game.beans.NewGame;
import jar.services.game.beans.PlaceBid;
import jar.services.game.beans.ReconnectGame;
import jar.services.game.beans.SetGameMode;
import jar.services.game.beans.StartGame;
import jar.services.game.enums.ChallengeType;
import jar.services.game.enums.GameMode;
import jar.services.socket.SocketService;
import jar.services.utils.ParserService;
import org.assertj.core.api.Assertions;
import org.junit.Test;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/** Mode en ligne : lancement automatique de la manche suivante après l'écran de résultat */
public class NextRoundTimerTest {
    private static final Duration DELAY = Duration.ofMillis(200);

    private final GameService gameService = new GameService(new SocketService(new ParserService()), DELAY);

    private UUID adminId;
    private UUID otherId;

    /** Partie à deux en ligne, dont la manche vient d'être résolue par « Menteur ! » */
    private String gameWithRoundResult() {
        GameSession adminSession = gameService.createGame(NewGame.of(UUID.randomUUID(), "Joueur 1", "🦊", 5));
        String gameCode = adminSession.getGame().getGameCode();
        adminId = adminSession.getPlayerId();
        otherId = gameService.joinGame(JoinGame.of(UUID.randomUUID(), "Joueur 2", "🐸", gameCode)).getPlayerId();
        gameService.setMode(SetGameMode.of(gameCode, adminId, GameMode.ONLINE));
        gameService.startGame(StartGame.of(gameCode, 5));
        Game game = gameService.getGames().get(gameCode);
        game.setPlayerOrder(new ArrayList<>(List.of(adminId, otherId)));
        game.setCurrentPlayerId(adminId);

        gameService.placeBid(PlaceBid.of(gameCode, adminId, 1, 2));
        gameService.challenge(Challenge.of(gameCode, otherId, ChallengeType.LIAR));
        return gameCode;
    }

    private Game game(String gameCode) {
        return gameService.getGames().get(gameCode);
    }

    @Test
    public void challenge__sends_the_remaining_time_before_the_next_round() {
        String gameCode = gameWithRoundResult();

        Long remaining = gameService
            .reconnect(ReconnectGame.of(gameCode, otherId, UUID.randomUUID()))
            .getGame()
            .getNextRoundInMs();

        Assertions.assertThat(remaining).isNotNull().isBetween(0L, DELAY.toMillis());
    }

    @Test
    public void next_round__starts_automatically_at_the_end_of_the_delay() throws InterruptedException {
        String gameCode = gameWithRoundResult();
        Assertions.assertThat(game(gameCode).getLastRoundResult()).isNotNull();

        Thread.sleep(DELAY.toMillis() * 4);

        Assertions.assertThat(game(gameCode).getLastRoundResult()).isNull();
        Assertions.assertThat(game(gameCode).getNextRoundAt()).isNull();
    }

    @Test
    public void next_round__by_the_admin_clears_the_timer() {
        String gameCode = gameWithRoundResult();

        gameService.nextRound(ActionGame.of(adminId, gameCode));

        Assertions.assertThat(game(gameCode).getNextRoundAt()).isNull();
        Assertions.assertThat(
            gameService.reconnect(ReconnectGame.of(gameCode, otherId, UUID.randomUUID())).getGame().getNextRoundInMs()
        ).isNull();
    }
}
