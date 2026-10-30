/** Mode de jeu choisi par l'admin dans le lobby, figé au lancement de la partie */
export enum GameMode {
  LOCAL = 'LOCAL',
  ONLINE = 'ONLINE',
}

export type LobbyType = {
  gameCode: string,
  players: Player[],
  mode?: GameMode, // absent si le serveur ne l'a pas renvoyé : équivaut à LOCAL
};

export type Player = { // TODO : Peut être créer un type PlayerLobby et Player tout court. PlayerLobby n'ayant besoin que de name et isAdmin?
  id: string,
  name: string,
  emoji: string,
  diceNumber: number,
  dices: number[],
  isAdmin: boolean,
};

// Pseudo tel qu'affiché partout dans l'application : précédé de l'emoji du joueur
// (absent si le serveur ne l'a pas renvoyé, par exemple une version antérieure)
export function playerDisplayName(player: Player): string {
  return player.emoji ? `${player.emoji} ${player.name}` : player.name;
}

export type Game = {
  players: Player[],
  diceNumber: number,
  gameCode: string,
  isPlanificato: boolean,
  playerIdFinishTurn?: string | null,
  mode?: GameMode,
  // Champs du mode en ligne (vides en local)
  playerOrder?: string[],
  currentPlayerId?: string | null,
  currentBid?: Bid | null,
  roundBids?: Bid[],
  lastRoundResult?: RoundResult | null,
  // Joueurs partis pendant la manche : leurs dés comptent jusqu'à sa résolution
  departedPlayers?: Player[],
};

/** Mise d'un joueur en ligne : `quantity` dés montrant `face` (1 = perudo) */
export type Bid = {
  playerId: string,
  quantity: number,
  face: number,
};

export enum ChallengeType {
  LIAR = 'LIAR',
  EXACT = 'EXACT',
}

/** Résultat d'une manche en ligne, calculé par le serveur */
export type RoundResult = {
  type: ChallengeType,
  challengerId: string,
  bidderId: string,
  bid: Bid,
  actualCount: number,
  // Nombre de dés par face, clés « 1 » à « 6 »
  faceCounts: Record<string, number>,
  jokersCounted: boolean,
  challengerWon: boolean,
  // Variation du nombre de dés (-1 / +1) par identifiant de joueur
  diceChanges: Record<string, number>,
  nextStarterId: string,
  // Dés de la manche résolue, avant la relance
  revealedPlayers: Player[],
};

/** Corps de l'évènement socket ROUND_RESULT */
export type RoundResultMessage = {
  result: RoundResult,
  game: Game,
};

export enum GameStatus {
  LOBBY = 'LOBBY',
  IN_GAME = 'IN_GAME',
}

/**
 * Réponse adressée au joueur courant : son identité durable (`playerId`, à
 * conserver pour pouvoir reprendre la partie) et l'état de la partie.
 */
export type GameSession = {
  playerId: string,
  status: GameStatus,
  game: Game,
}
