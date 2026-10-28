// Emojis proposés sur l'accueil pour accompagner le pseudo du joueur
export const PLAYER_EMOJIS: string[] = [
  '🦜', '🐸', '🐙', '🦄', '🐷', '🦊', '🐵', '🐼', '🐨', '🦖',
  '🐢', '🦀', '🐳', '🫤', '🦥', '🤠', '🥸', '🤡', '👽', '🤖',
  '👻', '💀', '🎃', '🌵', '🍕', '🌮', '🍩', '🥑', '🍄', '🎲',
];

export function randomPlayerEmoji(): string {
  return PLAYER_EMOJIS[Math.floor(Math.random() * PLAYER_EMOJIS.length)];
}
