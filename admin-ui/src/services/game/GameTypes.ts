export type LobbyType = {
  gameCode: string,
  players: Player[],
};

export type Player = {
  name: string,
  diceNumber: number,
  isAdmin: boolean,
};
