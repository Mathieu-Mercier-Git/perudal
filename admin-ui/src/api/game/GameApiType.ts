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
  userSocketId: string,
  gameCode: string,
};
