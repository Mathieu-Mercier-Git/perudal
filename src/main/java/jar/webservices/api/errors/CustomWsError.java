package jar.webservices.api.errors;

import com.coreoz.plume.jersey.errors.WsError;

public enum CustomWsError implements WsError {
    GAME_NOT_FOUND,
    PLAYER_NOT_FOUND,
    NO_GAME_CODE_AVAILABLE,
}
