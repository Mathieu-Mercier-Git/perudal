package jar.webservices.api;

import com.coreoz.plume.jersey.security.permission.PublicApi;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.parameters.RequestBody;
import io.swagger.v3.oas.annotations.tags.Tag;
import jar.services.game.GameService;
import jar.services.game.beans.ActionGame;
import jar.services.game.beans.JoinGame;
import jar.services.game.beans.Lobby;
import jar.services.game.beans.NewGame;

import javax.inject.Inject;
import javax.inject.Singleton;
import javax.ws.rs.Consumes;
import javax.ws.rs.POST;
import javax.ws.rs.PUT;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.core.MediaType;

@Path("/game")
@Tag(name = "example", description = "Manage games")
@Consumes(MediaType.APPLICATION_JSON)
@Produces(MediaType.APPLICATION_JSON)
@PublicApi
@Singleton
public class GameWs {
	private final GameService gameService;

	@Inject
	public GameWs(GameService gameService) {
		this.gameService = gameService;
	}

	@POST
	@Operation(description = "Create a game")
	public Lobby createGame(@RequestBody NewGame newGame) { // TODO : ajouter dans la signature du WS le socketId
		return gameService.createGame(newGame);
	}

    @PUT
    @Path("/join")
    @Operation(description = "Join a game")
    public Lobby joinGame(@RequestBody JoinGame joinGame) {
        return gameService.joinGame(joinGame);
    }

    @PUT
    @Path("/quit")
    @Operation(description = "Quit a game")
    public void quiGame(@RequestBody ActionGame actionGame) {
        gameService.quitGame(actionGame);
    }

    @PUT
    @Path("/cancel")
    @Operation(description = "Cancel a game")
    public void cancelGame(@RequestBody ActionGame actionGame) {
        gameService.cancelGame(actionGame);
    }
}
