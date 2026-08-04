export type NewGameRequestBody = {
  userSocketId: string,
  userName: string,
  diceNumber: number,
};

export type JoinGameRequestBody = {
  userSocketId: string,
  userName: string,
  gameCode: string,
};

export type ActionGame = {
  playerId: string,
  gameCode: string,
};

export type ReconnectRequestBody = {
  gameCode: string,
  playerId: string,
  socketId: string,
};

export type StartGame = {
  gameCode: string,
  diceNumber: number,
};

export type TurnInfo = {
  gameCode: string,
  playerId: string,
  hasLost: boolean,
};
