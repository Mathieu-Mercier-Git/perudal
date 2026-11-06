// Emojis proposés sur l'accueil pour accompagner le pseudo du joueur
export const PLAYER_EMOJIS: string[] = [
  // Animaux
  '🐀', '🐊', '🦈', '🐙', '🐋', '🦖', '🦥', '🦘', '🐘',
  // Visages et personnages
  '😮', '🫤', '🤥', '🖕', '💀', '👽', '🤖', '🧞',
  // Fruits, légumes et plantes
  '🍑', '🍆', '🍄', '🌵',
  // Objets et symboles
  '🔥', '🧨', '☢\uFE0F', '⚔\uFE0F', '🔫', '🧿', '⏳', '⚽', '🎲',
];

export function randomPlayerEmoji(): string {
  return PLAYER_EMOJIS[Math.floor(Math.random() * PLAYER_EMOJIS.length)];
}
