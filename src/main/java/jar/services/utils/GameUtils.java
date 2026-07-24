package jar.services.utils;

import java.util.ArrayList;
import java.util.List;
import java.util.Random;

public class GameUtils {
    private GameUtils() {
        // empty constructor
    }

    public static String generateGameCode() {
        // TODO :
        return "123";
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
