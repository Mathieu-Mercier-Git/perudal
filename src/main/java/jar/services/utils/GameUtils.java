package jar.services.utils;

import java.security.SecureRandom;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Random;

public class GameUtils {
    private static final String GAME_CODE_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    private static final int GAME_CODE_DIGITS_COUNT = 4;
    // SecureRandom et non Random : le code est le seul élément qui protège l'accès
    // à une partie, il ne doit pas être devinable à partir des codes précédents
    private static final SecureRandom GAME_CODE_RANDOM = new SecureRandom();

    private GameUtils() {
        // empty constructor
    }

    /**
     * Code de partie : une lettre majuscule suivie de 4 chiffres (ex. « K7392 »).
     */
    public static String generateGameCode() {
        StringBuilder gameCode = new StringBuilder(1 + GAME_CODE_DIGITS_COUNT);
        gameCode.append(GAME_CODE_LETTERS.charAt(GAME_CODE_RANDOM.nextInt(GAME_CODE_LETTERS.length())));
        for (int i = 0; i < GAME_CODE_DIGITS_COUNT; i++) {
            gameCode.append(GAME_CODE_RANDOM.nextInt(10));
        }
        return gameCode.toString();
    }

    /**
     * Normalise un code saisi par un joueur : le code contient une lettre, il ne
     * faut pas qu'une saisie en minuscules empêche de rejoindre la partie.
     */
    public static String normalizeGameCode(String gameCode) {
        return gameCode == null ? null : gameCode.trim().toUpperCase(Locale.ROOT);
    }

    public static List<Integer> rollDices(int diceNumber) {
        List<Integer> dices = new ArrayList<>();
        Random random = new Random();
        for (int i = 0; i < diceNumber; i++) {
            dices.add(random.nextInt(6) + 1);
        }
        return dices;
    }
}
