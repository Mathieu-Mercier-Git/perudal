package jar;

import com.coreoz.plume.jersey.guice.JerseyGuiceFeature;
import com.coreoz.wisp.Scheduler;
import com.google.inject.Guice;
import com.google.inject.Injector;
import com.google.inject.Stage;
import jar.guice.ApplicationModule;
import jar.jersey.GrizzlySetup;
import jar.services.configuration.ConfigurationService;
import jar.services.socket.WebSocketApp;
import lombok.extern.slf4j.Slf4j;
import org.glassfish.grizzly.GrizzlyFuture;
import org.glassfish.grizzly.http.server.HttpServer;
import org.glassfish.jersey.server.ResourceConfig;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.concurrent.TimeUnit;

/**
 * The application entry point, where it all begins.
 */
@Slf4j
public class WebApplication {
	// Maximal waiting time for the last process to execute after the JVM received a kill signal
	public static final Duration GRACEFUL_SHUTDOWN_TIMEOUT = Duration.ofSeconds(60);

	public static void main(String[] args) {
		printBanner();
		try {
			long startTimestamp = System.currentTimeMillis();

			// Initialize all application objects with Guice
			Injector injector = Guice.createInjector(Stage.PRODUCTION, new ApplicationModule());

			ResourceConfig jerseyResourceConfig = injector.getInstance(ResourceConfig.class);

			// Initialize database
			// injector.getInstance(DatabaseInitializer.class).setup();

			// Enable Jersey to create objects through Guice Injector instance
			jerseyResourceConfig.register(new JerseyGuiceFeature(injector));
			// Starts the server
			HttpServer httpServer = GrizzlySetup.start(
				jerseyResourceConfig,
				System.getProperty("http.port"),
				System.getProperty("http.address"),
                injector.getInstance(ConfigurationService.class).httpGrizzlyWorkerThreadsPoolSize(),
                injector.getInstance(WebSocketApp.class)
			);

			// Add a shutdown hook to execute some code when the JVM receive a kill signal before it stops
			addShutDownListener(httpServer, injector.getInstance(Scheduler.class));

			logger.info("Server started in {} ms", System.currentTimeMillis() - startTimestamp);
		} catch (Throwable e) {
			logger.error("Failed to start server", e);
			// This line is important, because during initialization some libraries change the main thread type
			// to daemon, which mean that even if the project is completely down, the JVM is not stopped.
			// Stopping the JVM is important to enable production supervision tools to detect and restart the project.
			System.exit(1);
		}
	}

	private static void printBanner() {
		try (InputStream bannerStream = WebApplication.class.getResourceAsStream("/banner.txt")) {
			if (bannerStream != null) {
				System.out.println(new String(bannerStream.readAllBytes(), StandardCharsets.UTF_8));
			}
		} catch (IOException e) {
			logger.warn("Unable to read banner.txt", e);
		}
	}

	private static void addShutDownListener(HttpServer httpServer, Scheduler scheduler) {
		Runtime.getRuntime().addShutdownHook(new Thread(
			() -> {
				logger.info("Stopping signal received, shutting down server and scheduler...");
				GrizzlyFuture<HttpServer> grizzlyServerShutdownFuture = httpServer.shutdown(GRACEFUL_SHUTDOWN_TIMEOUT.toSeconds(), TimeUnit.SECONDS);
                try {
                    logger.info("Waiting for server to shut down... Shutdown timeout is {} seconds", GRACEFUL_SHUTDOWN_TIMEOUT.toSeconds());
                    scheduler.gracefullyShutdown(GRACEFUL_SHUTDOWN_TIMEOUT);
                    grizzlyServerShutdownFuture.get();
                    logger.info("Server and scheduler stopped.");
                } catch(Exception e) {
                    logger.error("Error while shutting down server.", e);
                    // It's not useful, but it makes Sonar happy
                    Thread.currentThread().interrupt();
                }
			},
			"shutdownHook"
		));
	}
}
