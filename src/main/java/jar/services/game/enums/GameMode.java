package jar.services.game.enums;

/**
 * Mode de jeu choisi par l'admin dans le lobby, figé au lancement.
 * <ul>
 *     <li>{@code LOCAL} : les joueurs se parlent, l'admin désigne le perdant (comportement historique)</li>
 *     <li>{@code ONLINE} : chacun joue dans l'appli à son tour, le serveur calcule le résultat</li>
 * </ul>
 */
public enum GameMode {
    LOCAL,
    ONLINE;
}
