export type LobbyType = {
  gameCode: string,
  players: Player[],
};

export type Player = { // TODO : Peut être créer un type PlayerLobby et Player tout court. PlayerLobby n'ayant besoin que de name et isAdmin?
  id: string,
  name: string,
  diceNumber: number,
  dices: number[],
  isAdmin: boolean,
};

export type Game = {
  players: Player[],
  diceNumber: number,
  gameCode: string,
  isPlanificato: boolean,
  playerIdFinishTurn?: string | null,
}

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
