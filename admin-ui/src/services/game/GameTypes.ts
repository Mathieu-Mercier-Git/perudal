export type LobbyType = {
  gameCode: string,
  players: Player[],
};

export type Player = {
  name: string,
  diceNumber: number,
  isAdmin: boolean,
};

export type Game = {
  players: Player[];
  diceNumber: number,
  gameCode: string,
}
