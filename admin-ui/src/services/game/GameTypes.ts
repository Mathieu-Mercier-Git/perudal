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
}
