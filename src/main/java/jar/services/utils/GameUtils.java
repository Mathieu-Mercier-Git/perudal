package jar.services.utils;

import java.security.SecureRandom;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Random;

public class GameUtils {
    // I et O sont exclus pour éviter la confusion avec les chiffres 1 et 0
    private static final String GAME_CODE_LETTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ";
    private static final int GAME_CODE_DIGITS_COUNT = 3;
    // SecureRandom et non Random : le code est le seul élément qui protège l'accès
    // à une partie, il ne doit pas être devinable à partir des codes précédents
    private static final SecureRandom GAME_CODE_RANDOM = new SecureRandom();
    // Emoji affiché devant le pseudo quand le client n'en envoie pas (ou un invalide)
    private static final String DEFAULT_PLAYER_EMOJI = "\uD83C\uDFB2"; // 🎲
    // Un emoji composé (drapeau, famille, couleur de peau...) tient en quelques code points :
    // au-delà, ce n'est pas un emoji mais du texte libre glissé dans le champ
    private static final int MAX_PLAYER_EMOJI_CODE_POINTS = 8;

    private GameUtils() {
        // empty constructor
    }

    /**
     * Code de partie : une lettre majuscule (hors I et O) suivie de 3 chiffres (ex. « K739 »).
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

    /**
     * L'emoji est choisi côté client : on se protège d'une valeur absente ou d'un
     * texte arbitraire qui serait ensuite diffusé à tous les joueurs de la partie.
     */
    public static String sanitizePlayerEmoji(String emoji) {
        if (emoji == null) {
            return DEFAULT_PLAYER_EMOJI;
        }
        String trimmedEmoji = emoji.trim();
        if (trimmedEmoji.isEmpty()
            || trimmedEmoji.codePointCount(0, trimmedEmoji.length()) > MAX_PLAYER_EMOJI_CODE_POINTS
            || trimmedEmoji.codePoints().anyMatch(Character::isLetterOrDigit)) {
            return DEFAULT_PLAYER_EMOJI;
        }
        return trimmedEmoji;
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
