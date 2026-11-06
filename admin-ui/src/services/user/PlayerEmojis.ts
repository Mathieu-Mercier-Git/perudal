// Emojis proposés sur l'accueil pour accompagner le pseudo du joueur
export const PLAYER_EMOJIS: string[] = [
  // Animaux : couleurs vives et ternes alternées pour équilibrer les lignes du sélecteur
  '🐞', '🐀', '🪼', '🦥', '🦖', '🐌', '🦆', '🦧', '🐋',
  // Visages et personnages
  '😮', '🫤', '🤥', '😈', '🖕', '💀', '👽', '🤖',
  // Fruits, légumes et plantes
  '🍑', '🍆', '🍄', '🌵',
  // Objets et symboles
  '🔥', '🧨', '☢\uFE0F', '⚔\uFE0F', '🔫', '🧿', '⏳', '⚽', '🎲',
];

export function randomPlayerEmoji(): string {
  return PLAYER_EMOJIS[Math.floor(Math.random() * PLAYER_EMOJIS.length)];
}
