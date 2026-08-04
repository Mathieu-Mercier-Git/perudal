package jar.guice;

import org.glassfish.jersey.server.ResourceConfig;

import jar.jersey.JerseyConfigProvider;
import jar.services.game.GamePurgeService;

import com.coreoz.plume.conf.guice.GuiceConfModule;
import com.coreoz.plume.jersey.monitoring.guice.GuiceJacksonWithMetricsModule;
import com.coreoz.plume.scheduler.guice.GuiceSchedulerModule;
import com.google.inject.AbstractModule;

/**
 * Group the Guice modules to install in the application
 */
public class ApplicationModule extends AbstractModule {

	@Override
	protected void configure() {
		install(new GuiceConfModule());
		install(new GuiceJacksonWithMetricsModule());
		// Scheduler (Wisp), used by GamePurgeService
		install(new GuiceSchedulerModule());
		// Rien n'injecte GamePurgeService : sans liaison explicite en eager singleton,
		// il ne serait jamais instancié et le job de purge ne serait pas enregistré
		bind(GamePurgeService.class).asEagerSingleton();
		// Database & Querydsl installation is disabled: the database is not used by the project yet
		// install(new GuiceQuerydslModule());
        // Data source exposure for Flyway
        // install(new DataSourceModule());

		// Prepare Jersey configuration
		bind(ResourceConfig.class).toProvider(JerseyConfigProvider.class);
	}
}
