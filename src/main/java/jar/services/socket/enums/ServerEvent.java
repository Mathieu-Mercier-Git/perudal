package jar.services.socket.enums;

public enum ServerEvent {
    UPDATED_LOBBY,
    CANCEL_GAME,
    START_GAME,
    FINISH_TURN,
    REVEAL_DICES,
    ROLL_DICES,
    KICKED,
    // Mode local
    PLAYER_LEFT,
    // Mode en ligne
    BID_PLACED,
    ROUND_RESULT,
    NEXT_ROUND;
}
