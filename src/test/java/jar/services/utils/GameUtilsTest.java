package jar.services.utils;

import org.assertj.core.api.Assertions;
import org.junit.Test;

/**
 * L'emoji du joueur vient du client et est diffusé à toute la partie :
 * seul un vrai emoji doit passer, le reste retombe sur l'emoji par défaut.
 */
public class GameUtilsTest {
    private static final String DEFAULT_EMOJI = "🎲";

    @Test
    public void sanitizePlayerEmoji__should_keep_a_simple_emoji() {
        Assertions.assertThat(GameUtils.sanitizePlayerEmoji("🦜")).isEqualTo("🦜");
    }

    @Test
    public void sanitizePlayerEmoji__should_keep_a_composed_emoji() {
        // drapeau (2 code points) et emoji avec sélecteur de variante
        Assertions.assertThat(GameUtils.sanitizePlayerEmoji("🇫🇷")).isEqualTo("🇫🇷");
        Assertions.assertThat(GameUtils.sanitizePlayerEmoji("🌶️")).isEqualTo("🌶️");
    }

    @Test
    public void sanitizePlayerEmoji__should_fallback_when_missing() {
        Assertions.assertThat(GameUtils.sanitizePlayerEmoji(null)).isEqualTo(DEFAULT_EMOJI);
        Assertions.assertThat(GameUtils.sanitizePlayerEmoji("  ")).isEqualTo(DEFAULT_EMOJI);
    }

    @Test
    public void sanitizePlayerEmoji__should_fallback_when_text_is_sent() {
        Assertions.assertThat(GameUtils.sanitizePlayerEmoji("Admin")).isEqualTo(DEFAULT_EMOJI);
        Assertions.assertThat(GameUtils.sanitizePlayerEmoji("🦜🦜🦜🦜🦜🦜🦜🦜🦜")).isEqualTo(DEFAULT_EMOJI);
    }
}
