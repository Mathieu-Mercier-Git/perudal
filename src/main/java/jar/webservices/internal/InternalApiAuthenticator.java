package jar.webservices.internal;

import javax.inject.Inject;
import javax.inject.Singleton;

import jar.services.configuration.ConfigurationService;

import com.coreoz.plume.jersey.security.basic.BasicAuthenticator;

@Singleton
public class InternalApiAuthenticator {
    private final BasicAuthenticator<String> basicAuthenticator;

    @Inject
    public InternalApiAuthenticator(ConfigurationService configurationService) {
        this.basicAuthenticator = BasicAuthenticator.fromSingleCredentials(
            configurationService.internalApiAuthUsername(),
            configurationService.internalApiAuthPassword(),
            "API perudal"
        );
    }

    public BasicAuthenticator<String> get() {
        return this.basicAuthenticator;
    }
}
