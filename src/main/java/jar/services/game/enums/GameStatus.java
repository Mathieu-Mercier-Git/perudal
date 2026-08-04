package jar.services.game.enums;

/**
 * Phase de la partie, nécessaire à la reconnexion : le front doit savoir s'il
 * doit afficher le lobby ou la partie en cours.
 */
public enum GameStatus {
    LOBBY,
    IN_GAME;
}
