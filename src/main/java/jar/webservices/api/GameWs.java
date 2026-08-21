package jar.webservices.api;

import com.coreoz.plume.jersey.security.permission.PublicApi;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.parameters.RequestBody;
import io.swagger.v3.oas.annotations.tags.Tag;
import jar.services.game.GameService;
import jar.services.game.beans.ActionGame;
import jar.services.game.beans.GameSession;
import jar.services.game.beans.TurnInfo;
import jar.services.game.beans.JoinGame;
import jar.services.game.beans.KickPlayer;
import jar.services.game.beans.NewGame;
import jar.services.game.beans.ReconnectGame;
import jar.services.game.beans.StartGame;

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
	public GameSession createGame(@RequestBody NewGame newGame) {
		return gameService.createGame(newGame);
	}

    @PUT
    @Path("/join")
    @Operation(description = "Join a game")
    public GameSession joinGame(@RequestBody JoinGame joinGame) {
        return gameService.joinGame(joinGame);
    }

    @PUT
    @Path("/reconnect")
    @Operation(description = "Resume a game after a connection loss")
    public GameSession reconnect(@RequestBody ReconnectGame reconnectGame) {
        return gameService.reconnect(reconnectGame);
    }

    @PUT
    @Path("/start")
    @Operation(description = "Start a game")
    public void startGame(@RequestBody StartGame startGame) {
        gameService.startGame(startGame);
    }

    @PUT
    @Path("/quit")
    @Operation(description = "Quit a game")
    public void quitGame(@RequestBody ActionGame actionGame) {
        gameService.quitGame(actionGame);
    }

    @PUT
    @Path("/kick")
    @Operation(description = "Kick a player from a game (admin only)")
    public void kickPlayer(@RequestBody KickPlayer kickPlayer) {
        gameService.kickPlayer(kickPlayer);
    }

    @PUT
    @Path("/cancel")
    @Operation(description = "Cancel a game")
    public void cancelGame(@RequestBody ActionGame actionGame) {
        gameService.cancelGame(actionGame);
    }

    @PUT
    @Path("/finish-turn")
    @Operation(description = "Finish a turn and update players")
    public void finishTurn(@RequestBody TurnInfo turnInfo) {
        gameService.finishTurn(turnInfo);
    }
}
