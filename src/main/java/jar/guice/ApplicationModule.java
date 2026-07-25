package jar.guice;

import org.glassfish.jersey.server.ResourceConfig;

import jar.jersey.JerseyConfigProvider;

import com.coreoz.plume.conf.guice.GuiceConfModule;
import com.coreoz.plume.jersey.monitoring.guice.GuiceJacksonWithMetricsModule;
import com.google.inject.AbstractModule;

/**
 * Group the Guice modules to install in the application
 */
public class ApplicationModule extends AbstractModule {

	@Override
	protected void configure() {
		install(new GuiceConfModule());
		install(new GuiceJacksonWithMetricsModule());
		// Database & Querydsl installation is disabled: the database is not used by the project yet
		// install(new GuiceQuerydslModule());
        // Data source exposure for Flyway
        // install(new DataSourceModule());

		// Prepare Jersey configuration
		bind(ResourceConfig.class).toProvider(JerseyConfigProvider.class);
	}
}
