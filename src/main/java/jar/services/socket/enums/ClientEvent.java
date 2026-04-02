package jar.services.socket.enums;

public enum ClientEvent {
    CREATE_GAME("create_game"),
    JOIN_GAME("join_game"),
    QUIT_GAME("quit_game"),
    CANCEL_GAME("cancel_game");

    final String key;

    ClientEvent(String key) {
        this.key = key;
    }

    public String getKey() {
        return key;
    }

    public static ClientEvent findByName(String name) {
        for (ClientEvent event : values()) {
            if (event.getKey().equals(name)) {
                return event;
            }
        }
        return null;
    }
}
