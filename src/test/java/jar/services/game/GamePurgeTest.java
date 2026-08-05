package jar.services.game;

import jar.services.game.beans.ActionGame;
import jar.services.game.beans.Game;
import jar.services.game.beans.GameSession;
import jar.services.game.beans.JoinGame;
import jar.services.game.beans.NewGame;
import jar.services.game.enums.GameStatus;
import jar.services.socket.SocketService;
import jar.services.utils.ParserService;
import org.assertj.core.api.Assertions;
import org.junit.Test;

import java.time.Duration;
import java.time.Instant;
import java.util.UUID;

/**
 * Vérifie la purge des parties abandonnées : le job ne tournant qu'une fois par jour,
 * ces règles ne sont pas observables autrement qu'en test.
 */
public class GamePurgeTest {
    private static final Duration IN_GAME_RETENTION = Duration.ofHours(24);
    private static final Duration LOBBY_RETENTION = Duration.ofHours(2);
    private static final Instant NOW = Instant.parse("2026-08-04T00:00:00Z");

    private static GameService newGameService() {
        return new GameService(new SocketService(new ParserService()));
    }

    private static String createGame(GameService gameService, GameStatus status, Duration age) {
        GameSession session = gameService.createGame(NewGame.of(UUID.randomUUID(), "Mathieu", 5));
        String gameCode = session.getGame().getGameCode();
        Game game = gameService.getGames().get(gameCode);
        game.setStatus(status);
        game.setCreatedAt(NOW.minus(age));
        return gameCode;
    }

    @Test
    public void purgeExpiredGames__removes_a_lobby_older_than_the_lobby_retention() {
        GameService gameService = newGameService();
        String gameCode = createGame(gameService, GameStatus.LOBBY, Duration.ofHours(3));

        int purgedGames = gameService.purgeExpiredGames(NOW, IN_GAME_RETENTION, LOBBY_RETENTION);

        Assertions.assertThat(purgedGames).isEqualTo(1);
        Assertions.assertThat(gameService.getGames()).doesNotContainKey(gameCode);
    }

    @Test
    public void purgeExpiredGames__keeps_a_lobby_younger_than_the_lobby_retention() {
        GameService gameService = newGameService();
        String gameCode = createGame(gameService, GameStatus.LOBBY, Duration.ofHours(1));

        int purgedGames = gameService.purgeExpiredGames(NOW, IN_GAME_RETENTION, LOBBY_RETENTION);

        Assertions.assertThat(purgedGames).isZero();
        Assertions.assertThat(gameService.getGames()).containsKey(gameCode);
    }

    @Test
    public void purgeExpiredGames__removes_a_started_game_older_than_the_in_game_retention() {
        GameService gameService = newGameService();
        String gameCode = createGame(gameService, GameStatus.IN_GAME, Duration.ofHours(25));

        int purgedGames = gameService.purgeExpiredGames(NOW, IN_GAME_RETENTION, LOBBY_RETENTION);

        Assertions.assertThat(purgedGames).isEqualTo(1);
        Assertions.assertThat(gameService.getGames()).doesNotContainKey(gameCode);
    }

    @Test
    public void purgeExpiredGames__removes_a_recent_game_left_without_any_player() {
        GameService gameService = newGameService();
        String gameCode = createGame(gameService, GameStatus.IN_GAME, Duration.ofMinutes(5));
        gameService.getGames().get(gameCode).getPlayers().clear();

        int purgedGames = gameService.purgeExpiredGames(NOW, IN_GAME_RETENTION, LOBBY_RETENTION);

        Assertions.assertThat(purgedGames).isEqualTo(1);
        Assertions.assertThat(gameService.getGames()).doesNotContainKey(gameCode);
    }

    @Test
    public void quitGame__removes_the_game_as_soon_as_the_last_player_leaves() {
        GameService gameService = newGameService();
        GameSession session = gameService.createGame(NewGame.of(UUID.randomUUID(), "Mathieu", 5));
        String gameCode = session.getGame().getGameCode();

        gameService.quitGame(ActionGame.of(session.getPlayerId(), gameCode));

        Assertions.assertThat(gameService.getGames()).doesNotContainKey(gameCode);
    }

    @Test
    public void quitGame__keeps_the_game_while_players_remain() {
        GameService gameService = newGameService();
        GameSession creatorSession = gameService.createGame(NewGame.of(UUID.randomUUID(), "Mathieu", 5));
        String gameCode = creatorSession.getGame().getGameCode();
        gameService.joinGame(JoinGame.of(UUID.randomUUID(), "Camille", gameCode));

        gameService.quitGame(ActionGame.of(creatorSession.getPlayerId(), gameCode));

        Assertions.assertThat(gameService.getGames()).containsKey(gameCode);
    }

    /** Le cœur de la règle à deux seuils : le même âge ne décide pas du même sort */
    @Test
    public void purgeExpiredGames__keeps_a_started_game_that_would_have_expired_as_a_lobby() {
        GameService gameService = newGameService();
        String startedGameCode = createGame(gameService, GameStatus.IN_GAME, Duration.ofHours(5));
        String lobbyGameCode = createGame(gameService, GameStatus.LOBBY, Duration.ofHours(5));

        int purgedGames = gameService.purgeExpiredGames(NOW, IN_GAME_RETENTION, LOBBY_RETENTION);

        Assertions.assertThat(purgedGames).isEqualTo(1);
        Assertions.assertThat(gameService.getGames()).containsKey(startedGameCode);
        Assertions.assertThat(gameService.getGames()).doesNotContainKey(lobbyGameCode);
    }
}
