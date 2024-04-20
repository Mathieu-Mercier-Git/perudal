export type LobbyType = {
  gameCode: string,
  players: Player[],
  diceNumber: number,
};

export type Player = {
  name: string,
  diceNumber: number,
  isAdmin: boolean,
};
