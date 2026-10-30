import { ChallengeType, GameMode } from '../../services/game/GameTypes';

export type NewGameRequestBody = {
  userSocketId: string,
  userName: string,
  userEmoji: string,
  diceNumber: number,
};

export type JoinGameRequestBody = {
  userSocketId: string,
  userName: string,
  userEmoji: string,
  gameCode: string,
};

export type ActionGame = {
  playerId: string,
  gameCode: string,
};

export type KickPlayer = {
  playerId: string,
  kickedPlayerId: string,
  gameCode: string,
};

export type ReconnectRequestBody = {
  gameCode: string,
  playerId: string,
  socketId: string,
};

export type SetGameMode = {
  gameCode: string,
  playerId: string,
  mode: GameMode,
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

export type PlaceBid = {
  gameCode: string,
  playerId: string,
  quantity: number,
  face: number,
};

export type Challenge = {
  gameCode: string,
  playerId: string,
  type: ChallengeType,
};
