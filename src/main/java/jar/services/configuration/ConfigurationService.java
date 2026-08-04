package jar.services.configuration;

import java.time.Duration;

import javax.inject.Inject;
import javax.inject.Singleton;

import com.typesafe.config.Config;

@Singleton
public class ConfigurationService {
	private final Config config;

	@Inject
	public ConfigurationService(Config config) {
		this.config = config;
	}

	public String hello() {
		return config.getString("hello");
	}

	public String internalApiAuthUsername() {
		return config.getString("internal-api.auth-username");
	}

	public String internalApiAuthPassword() {
		return config.getString("internal-api.auth-password");
	}

    public Integer httpGrizzlyWorkerThreadsPoolSize() {
        if (!config.hasPath("http-grizzly.worker-threads-pool-size")) {
            return null;
        }
        return config.getInt("http-grizzly.worker-threads-pool-size");
    }

    /** Heure quotidienne d'exécution de la purge des parties, au format "HH:mm" */
    public String gamePurgeExecutionTime() {
        return config.getString("game-purge.execution-time");
    }

    /** Durée de rétention d'une partie démarrée, depuis sa création */
    public Duration gamePurgeInGameRetention() {
        return config.getDuration("game-purge.in-game-retention");
    }

    /** Durée de rétention d'un lobby jamais démarré, depuis sa création */
    public Duration gamePurgeLobbyRetention() {
        return config.getDuration("game-purge.lobby-retention");
    }
}
