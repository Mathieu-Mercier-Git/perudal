package jar.services.game;

import com.coreoz.wisp.Scheduler;
import com.coreoz.wisp.schedule.Schedules;
import jar.services.configuration.ConfigurationService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.inject.Inject;
import javax.inject.Singleton;
import java.time.Duration;
import java.time.Instant;

/**
 * Purge quotidienne des parties abandonnées.
 * <p>
 * Les parties vivent en mémoire dans {@link GameService} et ne sont supprimées que
 * lorsqu'un admin annule la sienne : une partie dont tout le monde ferme l'onglet
 * resterait donc indéfiniment. Ce job la supprime en fonction de son âge.
 * <p>
 * Ce service est lié en {@code asEagerSingleton()} dans {@code ApplicationModule}
 * pour que le job soit enregistré au démarrage : rien ne l'injecte par ailleurs.
 */
@Singleton
public class GamePurgeService {
    private static final Logger logger = LoggerFactory.getLogger(GamePurgeService.class);

    private static final String JOB_NAME = "purge-expired-games";

    private final GameService gameService;
    private final Duration inGameRetention;
    private final Duration lobbyRetention;

    @Inject
    public GamePurgeService(
        GameService gameService,
        Scheduler scheduler,
        ConfigurationService configurationService
    ) {
        this.gameService = gameService;
        this.inGameRetention = configurationService.gamePurgeInGameRetention();
        this.lobbyRetention = configurationService.gamePurgeLobbyRetention();

        String executionTime = configurationService.gamePurgeExecutionTime();
        scheduler.schedule(JOB_NAME, this::purge, Schedules.executeAt(executionTime));
        logger.info(
            "Game purge scheduled every day at {} (retention: {} in game, {} in lobby)",
            executionTime, inGameRetention, lobbyRetention
        );
    }

    private void purge() {
        try {
            int purgedGames = gameService.purgeExpiredGames(Instant.now(), inGameRetention, lobbyRetention);
            logger.info("Game purge done, {} game(s) removed", purgedGames);
        } catch (Exception e) {
            // Une purge qui échoue ne doit pas empêcher les exécutions suivantes
            logger.error("Game purge failed", e);
        }
    }
}
