package jar.services.socket.enums;

public enum ClientEvent { // TODO : supprimer les events qu'on n'utlise plus
    REVEAL_DICES("reveal_dices");

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
