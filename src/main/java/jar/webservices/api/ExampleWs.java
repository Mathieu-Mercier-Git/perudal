package jar.webservices.api;

import com.coreoz.plume.jersey.security.permission.PublicApi;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jar.services.configuration.ConfigurationService;

import javax.inject.Inject;
import javax.inject.Singleton;
import javax.ws.rs.Consumes;
import javax.ws.rs.PUT;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;

@Path("/test")
@Tag(name = "example", description = "Manage exemple web-services")
@Consumes(MediaType.APPLICATION_JSON)
@Produces(MediaType.APPLICATION_JSON)
@PublicApi
@Singleton
public class ExampleWs {

	private final ConfigurationService configurationService;

	@Inject
	public ExampleWs(ConfigurationService configurationService) {
		this.configurationService = configurationService;
	}

	@PUT
	@Operation(description = "Example web-service")
	public Response test() {
		return Response.ok().build();
	}
}
